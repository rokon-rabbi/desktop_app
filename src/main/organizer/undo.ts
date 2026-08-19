import type { Repositories } from '@main/database';
import { validateMove } from '@main/safety/paths';
import { toAppError } from '@main/safety/errors';
import { logger } from '@main/safety/logger';
import { moveFile } from './moveFile';

export class UndoNotAvailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UndoNotAvailableError';
  }
}

/**
 * Reverses a completed MOVE operation, item by item. Each reversal goes
 * through the same `validateMove` pre-flight as a forward move, which
 * refuses to overwrite anything that now occupies the original source
 * path (context.md §13: "Undo must verify that it will not overwrite a
 * newly created file").
 */
export async function undoOperation(repos: Repositories, operationId: string): Promise<void> {
  const operation = repos.operations.getDetail(operationId);
  if (!operation) throw new UndoNotAvailableError('Operation not found.');
  if (operation.type !== 'MOVE')
    throw new UndoNotAvailableError('Only organize (move) operations can be undone.');
  if (operation.status !== 'completed') {
    throw new UndoNotAvailableError('Only a completed operation can be undone.');
  }

  let undoneCount = 0;
  const reversibleItems = operation.items.filter(
    (item) => item.status === 'completed' && item.destinationPath
  );

  for (const item of reversibleItems) {
    const currentPath = item.destinationPath as string;
    const validation = await validateMove(currentPath, item.sourcePath);
    if (!validation.ok) {
      logger.warn('organizer', 'Could not undo item', { operationId, errorCode: 'VALIDATION' });
      continue;
    }
    try {
      await moveFile(currentPath, item.sourcePath);
      repos.files.updatePath(currentPath, item.sourcePath);
      repos.operations.markItemStatus(item.id, 'undone');
      undoneCount += 1;
    } catch (error) {
      const appError = toAppError(error, 'organizer.undo');
      logger.warn('organizer', `Undo failed for item: ${appError.message}`, { operationId });
    }
  }

  if (undoneCount === reversibleItems.length && undoneCount > 0) {
    repos.operations.markOperationStatus(operationId, 'undone');
  }
  logger.info('organizer', 'Undo finished', { operationId, fileCount: undoneCount });
}
