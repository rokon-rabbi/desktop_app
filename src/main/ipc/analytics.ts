import { z } from 'zod';
import { IPC } from '@shared/constants/ipc';
import { scanIdSchema } from '@shared/schemas/ipc';
import type { IpcContext } from './context';
import { handleIpc } from './context';

export function registerAnalyticsHandlers(ctx: IpcContext): void {
  handleIpc(
    IPC.analyticsGetStorageSummary,
    z.object({ scanId: scanIdSchema }),
    async ({ scanId }) => {
      return ctx.repos.files.getStorageAnalytics(scanId);
    }
  );
}
