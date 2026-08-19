import { join, extname, dirname } from 'node:path';
import { stat } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import type { OrganizeMove, OrganizePreview, ScannedFile } from '@shared/types';

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor++;
      const item = items[index];
      if (item === undefined) continue;
      results[index] = await fn(item);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function splitName(filename: string): { name: string; ext: string } {
  const ext = extname(filename);
  return { name: ext ? filename.slice(0, -ext.length) : filename, ext };
}

async function destinationExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Proposes moves that group files into per-category subfolders under the
 * scan root. Nothing on disk is touched here — context.md Milestone 6
 * requires this to be a pure preview. Collisions (two files that would
 * land on the same destination path) are auto-resolved with a numeric
 * suffix but always flagged, never silently overwritten.
 */
export async function buildOrganizePreview(
  scanId: string,
  rootPath: string,
  files: ScannedFile[]
): Promise<OrganizePreview> {
  const moves: OrganizeMove[] = [];
  const skipped: { path: string; reason: string }[] = [];
  const claimedDestinations = new Map<string, number>();

  for (const file of files) {
    const categoryDir = join(rootPath, file.category);

    if (file.parentFolder === categoryDir) {
      skipped.push({
        path: file.path,
        reason: 'Already organized into the correct category folder'
      });
      continue;
    }
    if (file.isSymlink) {
      skipped.push({ path: file.path, reason: 'Symbolic links are not moved automatically' });
      continue;
    }

    const baseDestination = join(categoryDir, file.filename);
    const priorClaims = claimedDestinations.get(baseDestination) ?? 0;
    claimedDestinations.set(baseDestination, priorClaims + 1);

    let destination = baseDestination;
    const collision = priorClaims > 0;
    if (collision) {
      const { name, ext } = splitName(file.filename);
      destination = join(categoryDir, `${name} (${priorClaims + 1})${ext}`);
    }

    moves.push({
      id: randomUUID(),
      sourcePath: file.path,
      destinationPath: destination,
      category: file.category,
      reason: `Move into ${file.category}/`,
      sizeBytes: file.sizeBytes,
      collision
    });
  }

  // Second pass: check for collisions with a real file already on disk (one
  // outside the current scan/move set), bounded concurrency to avoid
  // opening thousands of file descriptors at once.
  const collisionFlags = await mapWithConcurrency(moves, 32, async (move) => {
    if (move.collision) return true;
    return destinationExists(move.destinationPath);
  });

  const resolved = moves.map((move, i) => {
    const existsOnDisk = collisionFlags[i] ?? false;
    if (!existsOnDisk || move.collision) return move;

    // Rename the same way an in-batch collision is resolved, so the
    // preview reflects what Apply will actually do rather than leaving a
    // destination that's guaranteed to fail (validateMove still refuses
    // to overwrite anything, so this is a best-effort suggestion, not a
    // guarantee — worst case that one item fails safely at apply time).
    const categoryDir = dirname(move.destinationPath);
    const { name, ext } = splitName(move.destinationPath.slice(categoryDir.length + 1));
    const baseDestination = join(categoryDir, `${name}${ext}`);
    const claims = claimedDestinations.get(baseDestination) ?? 1;
    claimedDestinations.set(baseDestination, claims + 1);

    return {
      ...move,
      destinationPath: join(categoryDir, `${name} (${claims + 1})${ext}`),
      collision: true,
      reason: `${move.reason} (a file already exists at the destination — renamed to avoid overwriting it)`
    };
  });

  return { scanId, moves: resolved, skipped };
}
