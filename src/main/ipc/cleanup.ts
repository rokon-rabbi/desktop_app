import { z } from 'zod';
import { generateCleanupCandidates } from '@main/cleanup/candidates';
import { planForTarget } from '@main/cleanup/planner';
import { findDuplicates } from '@main/duplicates';
import { IPC } from '@shared/constants/ipc';
import { cleanupPlanRequestSchema, scanIdSchema } from '@shared/schemas/ipc';
import type { IpcContext } from './context';
import { handleIpc, makeEventSender } from './context';

export function registerCleanupHandlers(ctx: IpcContext): void {
  const sendEvent = makeEventSender(ctx.getWindow);

  async function analyze(scanId: string) {
    const files = ctx.repos.files.getAllForScan(scanId);
    const sizeGroups = ctx.repos.files.getSizeCandidates(scanId);
    const duplicateGroups = await findDuplicates(scanId, sizeGroups, {
      onProgress: (progress) => sendEvent(IPC.duplicatesProgressEvent, progress)
    });
    return generateCleanupCandidates(scanId, files, duplicateGroups);
  }

  handleIpc(IPC.cleanupAnalyze, z.object({ scanId: scanIdSchema }), async ({ scanId }) => {
    return analyze(scanId);
  });

  handleIpc(IPC.cleanupPlanForTarget, cleanupPlanRequestSchema, async ({ scanId, targetBytes }) => {
    const candidates = await analyze(scanId);
    return planForTarget(scanId, candidates, targetBytes);
  });
}
