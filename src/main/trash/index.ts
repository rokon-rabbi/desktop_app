import { randomUUID } from 'node:crypto';
import type { default as trashFn } from 'trash';
import type { Repositories } from '@main/database';
import { isProtectedPath } from '@main/safety/paths';
import { toAppError } from '@main/safety/errors';
import { logger } from '@main/safety/logger';
import type { ApplyProgress } from '@shared/types';

export interface TrashCallbacks {
  onProgress: (progress: ApplyProgress) => void;
}

interface TrashModule {
  default: typeof trashFn;
}
let trashModulePromise: Promise<TrashModule> | null = null;

/**
 * `trash` ships as an ESM-only package; our main bundle is CJS (required
 * for native-module compatibility, see ADR-002), so it must be loaded via
 * dynamic import() rather than a static import. Cached after first load.
 */
function loadTrashModule(): Promise<TrashModule> {
  trashModulePromise ??= import('trash');
  return trashModulePromise;
}

/**
 * Sends files to the Linux (freedesktop.org) Trash instead of deleting
 * them — context.md §12: "Permanent deletion should not be the default."
 * Every file is still individually validated first.
 */
export interface TrashItem {
  path: string;
  sizeBytes: number;
}

export async function sendToTrash(
  repos: Repositories,
  requestItems: TrashItem[],
  { onProgress }: TrashCallbacks
): Promise<string> {
  const operationId = randomUUID();
  repos.operations.create(
    operationId,
    'TRASH',
    `Sent ${requestItems.length} file${requestItems.length === 1 ? '' : 's'} to Trash`,
    requestItems.map((i) => ({ sourcePath: i.path, destinationPath: null, sizeBytes: i.sizeBytes }))
  );
  repos.operations.markOperationStatus(operationId, 'in-progress');

  const { default: trashFile } = await loadTrashModule();
  const items = repos.operations.getItems(operationId);
  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < requestItems.length; i++) {
    const path = requestItems[i]?.path;
    const item = items[i];
    if (!path || !item) continue;

    if (isProtectedPath(path)) {
      repos.operations.markItemStatus(
        item.id,
        'failed',
        'Refusing to trash a protected system path.'
      );
      failed += 1;
    } else {
      try {
        await trashFile([path]);
        repos.files.removeByPath(path);
        repos.operations.markItemStatus(item.id, 'completed');
        succeeded += 1;
      } catch (error) {
        const appError = toAppError(error, 'trash.send');
        repos.operations.markItemStatus(item.id, 'failed', appError.message);
        failed += 1;
      }
    }

    onProgress({
      operationId,
      itemsDone: i + 1,
      itemsTotal: requestItems.length,
      currentPath: path,
      done: i === requestItems.length - 1
    });
  }

  repos.operations.markOperationStatus(
    operationId,
    failed > 0 && succeeded === 0 ? 'failed' : 'completed'
  );
  logger.info('trash', 'Trash operation finished', { operationId, fileCount: succeeded });

  return operationId;
}
