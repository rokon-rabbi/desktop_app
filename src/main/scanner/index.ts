import { join, dirname } from 'node:path';
import { opendir, lstat, stat } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { classifyFile, getExtension } from '@main/classifier';
import { logger } from '@main/safety/logger';
import { SCAN_PROGRESS_BATCH_MS, SCAN_PROGRESS_BATCH_SIZE } from '@shared/constants';
import type { ScannedFileInsert } from '@main/database/repositories/fileRepository';
import type { ScanProgress } from '@shared/types';
import { ScanCancelledError, registerScan, unregisterScan } from './registry';

export interface ScanCallbacks {
  onBatch: (files: ScannedFileInsert[]) => void;
  onProgress: (progress: ScanProgress) => void;
}

export interface ScanOutcome {
  filesScanned: number;
  bytesScanned: number;
  directoriesSkipped: number;
  errorsCount: number;
  cancelled: boolean;
}

interface WalkContext extends ScanCallbacks {
  scanId: string;
  token: { cancelled: boolean };
  buffer: ScannedFileInsert[];
  filesScanned: number;
  bytesScanned: number;
  directoriesSkipped: number;
  errorsCount: number;
  lastFlush: number;
  currentPath: string;
}

function flush(ctx: WalkContext, done = false): void {
  if (ctx.buffer.length > 0) {
    ctx.onBatch(ctx.buffer);
    ctx.buffer = [];
  }
  ctx.onProgress({
    scanId: ctx.scanId,
    filesScanned: ctx.filesScanned,
    bytesScanned: ctx.bytesScanned,
    currentPath: ctx.currentPath,
    directoriesSkipped: ctx.directoriesSkipped,
    errorsCount: ctx.errorsCount,
    done
  });
  ctx.lastFlush = Date.now();
}

function maybeFlush(ctx: WalkContext): void {
  const dueByCount = ctx.buffer.length >= SCAN_PROGRESS_BATCH_SIZE;
  const dueByTime = Date.now() - ctx.lastFlush >= SCAN_PROGRESS_BATCH_MS;
  if (dueByCount || dueByTime) flush(ctx);
}

async function recordFile(
  fullPath: string,
  size: number,
  mtime: Date,
  ctime: Date,
  atime: Date,
  isSymlink: boolean,
  ctx: WalkContext
): Promise<void> {
  const filename = fullPath.slice(fullPath.lastIndexOf('/') + 1);
  ctx.buffer.push({
    id: randomUUID(),
    scanId: ctx.scanId,
    path: fullPath,
    filename,
    extension: getExtension(filename),
    sizeBytes: size,
    category: classifyFile(filename),
    parentFolder: dirname(fullPath),
    createdAt: ctime.toISOString(),
    modifiedAt: mtime.toISOString(),
    accessedAt: atime.toISOString(),
    isSymlink
  });
  ctx.filesScanned += 1;
  ctx.bytesScanned += size;
  ctx.currentPath = fullPath;
  maybeFlush(ctx);
}

async function walk(dir: string, ctx: WalkContext): Promise<void> {
  if (ctx.token.cancelled) throw new ScanCancelledError(ctx.scanId);

  let dirHandle;
  try {
    dirHandle = await opendir(dir);
  } catch (error) {
    ctx.directoriesSkipped += 1;
    ctx.errorsCount += 1;
    logger.warn('scanner', 'Skipped inaccessible directory', {
      scanId: ctx.scanId,
      errorCode: (error as NodeJS.ErrnoException).code
    });
    return;
  }

  // Note: `for await...of` on an fs.Dir closes the handle automatically
  // when the loop ends, including on early exit via a thrown error — an
  // explicit dirHandle.close() here would double-close it and throw
  // ERR_DIR_CLOSED.
  for await (const dirent of dirHandle) {
    if (ctx.token.cancelled) throw new ScanCancelledError(ctx.scanId);

    const fullPath = join(dir, dirent.name);

    if (dirent.isSymbolicLink()) {
      try {
        // Resolve the link's target to classify it, but never recurse
        // into a symlinked directory (context.md §11: don't recursively
        // follow symlinks by default).
        const targetInfo = await stat(fullPath);
        if (targetInfo.isFile()) {
          await recordFile(
            fullPath,
            targetInfo.size,
            targetInfo.mtime,
            targetInfo.ctime,
            targetInfo.atime,
            true,
            ctx
          );
        }
      } catch {
        ctx.errorsCount += 1; // broken symlink target
      }
      continue;
    }

    if (dirent.isDirectory()) {
      await walk(fullPath, ctx);
      continue;
    }

    if (dirent.isFile()) {
      try {
        const info = await lstat(fullPath);
        await recordFile(fullPath, info.size, info.mtime, info.ctime, info.atime, false, ctx);
      } catch {
        ctx.errorsCount += 1; // file disappeared mid-scan, or a permission error
      }
    }
  }
}

/**
 * Recursively, asynchronously scans `rootPath` (already validated by the
 * caller via `assertSafeScanRoot`). Streams directory entries rather than
 * buffering whole trees, batches DB writes and progress events, and never
 * throws on a single bad entry — only a cancellation aborts the walk early.
 */
export async function scanFolder(
  scanId: string,
  rootPath: string,
  callbacks: ScanCallbacks
): Promise<ScanOutcome> {
  const token = registerScan(scanId);
  const ctx: WalkContext = {
    ...callbacks,
    scanId,
    token,
    buffer: [],
    filesScanned: 0,
    bytesScanned: 0,
    directoriesSkipped: 0,
    errorsCount: 0,
    lastFlush: Date.now(),
    currentPath: rootPath
  };

  try {
    await walk(rootPath, ctx);
    flush(ctx, true);
    return {
      filesScanned: ctx.filesScanned,
      bytesScanned: ctx.bytesScanned,
      directoriesSkipped: ctx.directoriesSkipped,
      errorsCount: ctx.errorsCount,
      cancelled: false
    };
  } catch (error) {
    if (error instanceof ScanCancelledError) {
      flush(ctx, true);
      return {
        filesScanned: ctx.filesScanned,
        bytesScanned: ctx.bytesScanned,
        directoriesSkipped: ctx.directoriesSkipped,
        errorsCount: ctx.errorsCount,
        cancelled: true
      };
    }
    throw error;
  } finally {
    unregisterScan(scanId);
  }
}

export { cancelScan } from './registry';
