import { randomUUID } from 'node:crypto';
import { logger } from '@main/safety/logger';
import type { DuplicateGroup, DuplicateScanProgress, ScannedFile } from '@shared/types';
import { hashFull, hashPartial } from './hash';

export interface DuplicateDetectionCallbacks {
  onProgress: (progress: DuplicateScanProgress) => void;
}

async function groupByHasher(
  files: ScannedFile[],
  hasher: (path: string) => Promise<string>
): Promise<Map<string, ScannedFile[]>> {
  const groups = new Map<string, ScannedFile[]>();
  for (const file of files) {
    try {
      const digest = await hasher(file.path);
      const bucket = groups.get(digest);
      if (bucket) bucket.push(file);
      else groups.set(digest, [file]);
    } catch (error) {
      logger.warn('duplicates', 'Could not hash file, excluding from comparison', {
        errorCode: (error as NodeJS.ErrnoException).code
      });
    }
  }
  return groups;
}

/**
 * Size → partial hash → full hash (context.md §17). Nothing is declared a
 * duplicate until it has matched on all three, and files that can't be
 * hashed (permission errors, mid-scan deletion) are dropped from
 * consideration rather than guessed at.
 */
export async function findDuplicates(
  scanId: string,
  sizeGroups: Map<number, ScannedFile[]>,
  { onProgress }: DuplicateDetectionCallbacks
): Promise<DuplicateGroup[]> {
  const sizeCandidates = [...sizeGroups.values()];
  const totalSizeCandidates = sizeCandidates.reduce((sum, g) => sum + g.length, 0);

  const partialGroups: ScannedFile[][] = [];
  let processed = 0;
  for (const group of sizeCandidates) {
    const byPartial = await groupByHasher(group, hashPartial);
    processed += group.length;
    onProgress({ scanId, stage: 'partial-hash', processed, total: totalSizeCandidates });
    for (const bucket of byPartial.values()) {
      if (bucket.length >= 2) partialGroups.push(bucket);
    }
  }

  const totalPartialCandidates = partialGroups.reduce((sum, g) => sum + g.length, 0);
  const confirmed: DuplicateGroup[] = [];
  processed = 0;
  for (const group of partialGroups) {
    const byFull = await groupByHasher(group, hashFull);
    processed += group.length;
    onProgress({ scanId, stage: 'full-hash', processed, total: totalPartialCandidates });
    for (const [hash, bucket] of byFull.entries()) {
      if (bucket.length >= 2) {
        const sizeBytes = bucket[0]?.sizeBytes ?? 0;
        // Oldest-modified first, so the file consumers treat as "the
        // original" (index 0) is a meaningful choice rather than
        // whatever order the scan happened to discover them in — and
        // matches the same convention cleanup/candidates.ts uses.
        const sorted = [...bucket].sort(
          (a, b) => new Date(a.modifiedAt).getTime() - new Date(b.modifiedAt).getTime()
        );
        confirmed.push({
          id: randomUUID(),
          sizeBytes,
          hash,
          files: sorted,
          wastedBytes: sizeBytes * (sorted.length - 1)
        });
      }
    }
  }

  onProgress({
    scanId,
    stage: 'done',
    processed: totalPartialCandidates,
    total: totalPartialCandidates
  });
  confirmed.sort((a, b) => b.wastedBytes - a.wastedBytes);
  return confirmed;
}
