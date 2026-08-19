import { sendToTrash } from '@main/trash';
import { IPC } from '@shared/constants/ipc';
import { trashSendRequestSchema } from '@shared/schemas/ipc';
import type { IpcContext } from './context';
import { handleIpc, makeEventSender } from './context';

export function registerTrashHandlers(ctx: IpcContext): void {
  const sendEvent = makeEventSender(ctx.getWindow);

  handleIpc(IPC.trashSend, trashSendRequestSchema, async ({ items }) => {
    const operationId = await sendToTrash(ctx.repos, items, {
      onProgress: (progress) => sendEvent(IPC.applyProgressEvent, progress)
    });
    return { operationId };
  });
}
