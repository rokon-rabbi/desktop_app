import { dialog, type BrowserWindow } from 'electron';
import { stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { DEFAULT_SCAN_TARGETS } from '@shared/constants';
import { IPC } from '@shared/constants/ipc';
import type { ScanTargetOption } from '@shared/types';
import { handleIpcVoid } from './context';

export function registerDialogHandlers(getWindow: () => BrowserWindow | null): void {
  handleIpcVoid(IPC.dialogSelectFolder, async () => {
    const win = getWindow();
    const result = win
      ? await dialog.showOpenDialog(win, { properties: ['openDirectory'] })
      : await dialog.showOpenDialog({ properties: ['openDirectory'] });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0] ?? null;
  });

  handleIpcVoid(IPC.systemGetScanTargets, async () => {
    const home = homedir();
    const targets: ScanTargetOption[] = await Promise.all(
      DEFAULT_SCAN_TARGETS.map(async (target) => {
        const path = join(home, target.relativePath);
        const exists = await stat(path)
          .then((s) => s.isDirectory())
          .catch(() => false);
        return { label: target.label, path, exists };
      })
    );
    return targets;
  });
}
