import { applyOrganizeMoves } from '@main/organizer/apply';
import { buildOrganizePreview } from '@main/organizer/preview';
import { IPC } from '@shared/constants/ipc';
import { organizeApplyRequestSchema, organizePreviewRequestSchema } from '@shared/schemas/ipc';
import { AppOperationError } from '@main/safety/errors';
import type { IpcContext } from './context';
import { handleIpc, makeEventSender } from './context';

export function registerOrganizeHandlers(ctx: IpcContext): void {
  const sendEvent = makeEventSender(ctx.getWindow);

  handleIpc(IPC.organizePreview, organizePreviewRequestSchema, async ({ scanId }) => {
    const scan = ctx.repos.scans.findById(scanId);
    if (!scan) {
      throw new AppOperationError({ code: 'NOT_FOUND', message: 'That scan no longer exists.' });
    }
    const files = ctx.repos.files.getAllForScan(scanId);
    return buildOrganizePreview(scanId, scan.rootPath, files);
  });

  handleIpc(IPC.organizeApply, organizeApplyRequestSchema, async ({ moves }) => {
    const operationId = await applyOrganizeMoves(ctx.repos, moves, {
      onProgress: (progress) => sendEvent(IPC.applyProgressEvent, progress)
    });
    return { operationId };
  });
}
