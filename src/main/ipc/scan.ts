import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { assertSafeScanRoot } from '@main/safety/paths';
import { toAppError } from '@main/safety/errors';
import { logger } from '@main/safety/logger';
import { scanFolder, cancelScan } from '@main/scanner';
import { IPC } from '@shared/constants/ipc';
import { scanFilesQuerySchema, scanIdSchema, scanStartSchema } from '@shared/schemas/ipc';
import type { IpcContext } from './context';
import { handleIpc, handleIpcVoid, makeEventSender } from './context';

export function registerScanHandlers(ctx: IpcContext): void {
  const sendEvent = makeEventSender(ctx.getWindow);

  handleIpc(IPC.scanStart, scanStartSchema, async ({ rootPath }) => {
    const safeRoot = await assertSafeScanRoot(rootPath);
    const scanId = randomUUID();
    ctx.repos.scans.create(scanId, safeRoot);

    void (async () => {
      try {
        const outcome = await scanFolder(scanId, safeRoot, {
          onBatch: (files) => ctx.repos.files.insertMany(files),
          onProgress: (progress) => {
            ctx.repos.scans.updateProgress(scanId, progress.filesScanned, progress.bytesScanned);
            sendEvent(IPC.scanProgressEvent, progress);
          }
        });
        ctx.repos.scans.complete(scanId, outcome.cancelled ? 'cancelled' : 'completed');
      } catch (error) {
        const appError = toAppError(error, 'scan.run');
        ctx.repos.scans.complete(scanId, 'error', appError.message);
        logger.error('scan', 'Scan failed', { scanId, errorCode: appError.code });
      }
    })();

    return { scanId };
  });

  handleIpc(IPC.scanCancel, z.object({ scanId: scanIdSchema }), async ({ scanId }) => {
    return { cancelled: cancelScan(scanId) };
  });

  handleIpc(IPC.scanGetSummary, z.object({ scanId: scanIdSchema }), async ({ scanId }) => {
    return ctx.repos.scans.findById(scanId);
  });

  handleIpcVoid(IPC.scanList, async () => ctx.repos.scans.list());

  handleIpc(IPC.scanGetFiles, scanFilesQuerySchema, async (query) => {
    return ctx.repos.files.query(query);
  });
}
