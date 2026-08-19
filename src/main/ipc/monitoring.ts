import { IPC } from '@shared/constants/ipc';
import { monitoringPathSchema } from '@shared/schemas/ipc';
import type { IpcContext } from './context';
import { handleIpc, handleIpcVoid } from './context';

export function registerMonitoringHandlers(ctx: IpcContext): void {
  handleIpc(IPC.monitoringWatch, monitoringPathSchema, async ({ path }) => {
    const watchedPath = await ctx.monitor.watch(path);
    const settings = ctx.repos.settings.get();
    if (!settings.monitoredFolders.includes(watchedPath)) {
      ctx.repos.settings.update({ monitoredFolders: [...settings.monitoredFolders, watchedPath] });
    }
    return { path: watchedPath };
  });

  handleIpc(IPC.monitoringUnwatch, monitoringPathSchema, async ({ path }) => {
    await ctx.monitor.unwatch(path);
    const settings = ctx.repos.settings.get();
    ctx.repos.settings.update({
      monitoredFolders: settings.monitoredFolders.filter((p) => p !== path)
    });
    return { path };
  });

  handleIpcVoid(IPC.monitoringList, async () => ctx.monitor.list());
}
