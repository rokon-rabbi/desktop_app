import { IPC } from '@shared/constants/ipc';
import { settingsUpdateSchema } from '@shared/schemas/ipc';
import type { IpcContext } from './context';
import { handleIpc, handleIpcVoid } from './context';

export function registerSettingsHandlers(ctx: IpcContext): void {
  handleIpcVoid(IPC.settingsGet, async () => ctx.repos.settings.get());

  handleIpc(IPC.settingsUpdate, settingsUpdateSchema, async (partial) => {
    return ctx.repos.settings.update(partial);
  });
}
