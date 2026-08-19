import { z } from 'zod';
import { undoOperation } from '@main/organizer/undo';
import { IPC } from '@shared/constants/ipc';
import { operationIdSchema } from '@shared/schemas/ipc';
import type { IpcContext } from './context';
import { handleIpc, handleIpcVoid } from './context';

export function registerHistoryHandlers(ctx: IpcContext): void {
  handleIpcVoid(IPC.historyListOperations, async () => ctx.repos.operations.list());

  handleIpc(
    IPC.historyGetOperation,
    z.object({ operationId: operationIdSchema }),
    async ({ operationId }) => {
      return ctx.repos.operations.getDetail(operationId);
    }
  );

  handleIpc(
    IPC.historyUndo,
    z.object({ operationId: operationIdSchema }),
    async ({ operationId }) => {
      await undoOperation(ctx.repos, operationId);
      return ctx.repos.operations.getDetail(operationId);
    }
  );
}
