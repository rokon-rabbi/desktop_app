import type { BrowserWindow } from 'electron';
import type { Repositories } from '@main/database';
import { FolderMonitor } from '@main/monitoring';
import { IPC } from '@shared/constants/ipc';
import type { IpcContext } from './context';
import { makeEventSender } from './context';
import { registerDialogHandlers } from './dialog';
import { registerScanHandlers } from './scan';
import { registerAnalyticsHandlers } from './analytics';
import { registerDuplicatesHandlers } from './duplicates';
import { registerCleanupHandlers } from './cleanup';
import { registerOrganizeHandlers } from './organize';
import { registerTrashHandlers } from './trash';
import { registerHistoryHandlers } from './history';
import { registerMonitoringHandlers } from './monitoring';
import { registerSettingsHandlers } from './settings';

export function registerIpcHandlers(
  repos: Repositories,
  getWindow: () => BrowserWindow | null
): FolderMonitor {
  const sendEvent = makeEventSender(getWindow);
  const monitor = new FolderMonitor((event) => sendEvent(IPC.monitoringEvent, event));
  const ctx: IpcContext = { repos, monitor, getWindow };

  registerDialogHandlers(getWindow);
  registerScanHandlers(ctx);
  registerAnalyticsHandlers(ctx);
  registerDuplicatesHandlers(ctx);
  registerCleanupHandlers(ctx);
  registerOrganizeHandlers(ctx);
  registerTrashHandlers(ctx);
  registerHistoryHandlers(ctx);
  registerMonitoringHandlers(ctx);
  registerSettingsHandlers(ctx);

  // Restore folders the user was monitoring in a previous session.
  const settings = repos.settings.get();
  for (const folder of settings.monitoredFolders) {
    void monitor.watch(folder).catch(() => undefined);
  }

  return monitor;
}
