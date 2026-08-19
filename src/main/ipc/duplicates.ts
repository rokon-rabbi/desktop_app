import { z } from 'zod';
import { findDuplicates } from '@main/duplicates';
import { IPC } from '@shared/constants/ipc';
import { scanIdSchema } from '@shared/schemas/ipc';
import type { IpcContext } from './context';
import { handleIpc, makeEventSender } from './context';

export function registerDuplicatesHandlers(ctx: IpcContext): void {
  const sendEvent = makeEventSender(ctx.getWindow);

  handleIpc(IPC.duplicatesFind, z.object({ scanId: scanIdSchema }), async ({ scanId }) => {
    const sizeGroups = ctx.repos.files.getSizeCandidates(scanId);
    return findDuplicates(scanId, sizeGroups, {
      onProgress: (progress) => sendEvent(IPC.duplicatesProgressEvent, progress)
    });
  });
}
