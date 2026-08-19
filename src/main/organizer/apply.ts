import { dirname } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import type { Repositories } from '@main/database';
import { isProtectedPath, validateMove } from '@main/safety/paths';
import { toAppError } from '@main/safety/errors';
import { logger } from '@main/safety/logger';
import { moveFile } from './moveFile';
import type { ApplyProgress, OrganizeMove } from '@shared/types';

export interface ApplyCallbacks {
  onProgress: (progress: ApplyProgress) => void;
}

/**
 * Executes a previously-previewed set of moves. Every step from
 * context.md §11 happens per item: validate source, validate destination,
 * confirm no collision, perform the move, verify the result, then record
 * it so Undo has enough information to reverse it.
 */
export async function applyOrganizeMoves(
  repos: Repositories,
  moves: OrganizeMove[],
  { onProgress }: ApplyCallbacks
): Promise<string> {
  const operationId = randomUUID();
  repos.operations.create(
    operationId,
    'MOVE',
    `Organized ${moves.length} file${moves.length === 1 ? '' : 's'}`,
    moves.map((m) => ({
      sourcePath: m.sourcePath,
      destinationPath: m.destinationPath,
      sizeBytes: m.sizeBytes
    }))
  );
  repos.operations.markOperationStatus(operationId, 'in-progress');

  const items = repos.operations.getItems(operationId);
  const destinationDirs = new Set(moves.map((m) => dirname(m.destinationPath)));
  for (const dir of destinationDirs) {
    if (isProtectedPath(dir)) continue;
    await mkdir(dir, { recursive: true }).catch(() => undefined);
  }

  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    const item = items[i];
    if (!move || !item) continue;

    const validation = await validateMove(move.sourcePath, move.destinationPath);
    if (!validation.ok) {
      repos.operations.markItemStatus(item.id, 'failed', validation.reason);
      failed += 1;
      logger.warn('organizer', 'Skipped invalid move', { operationId, errorCode: 'VALIDATION' });
    } else {
      try {
        await moveFile(move.sourcePath, move.destinationPath);
        repos.files.updatePath(move.sourcePath, move.destinationPath);
        repos.operations.markItemStatus(item.id, 'completed', undefined, move.destinationPath);
        succeeded += 1;
      } catch (error) {
        const appError = toAppError(error, 'organizer.apply');
        repos.operations.markItemStatus(item.id, 'failed', appError.message);
        failed += 1;
      }
    }

    onProgress({
      operationId,
      itemsDone: i + 1,
      itemsTotal: moves.length,
      currentPath: move.destinationPath,
      done: i === moves.length - 1
    });
  }

  repos.operations.markOperationStatus(
    operationId,
    failed > 0 && succeeded === 0 ? 'failed' : 'completed'
  );
  logger.info('organizer', 'Apply finished', { operationId, fileCount: succeeded });

  return operationId;
}
