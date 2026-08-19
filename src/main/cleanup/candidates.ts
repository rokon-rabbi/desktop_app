import { randomUUID } from 'node:crypto';
import {
  ARCHIVE_EXTENSIONS,
  INSTALLER_EXTENSIONS,
  LARGE_FILE_THRESHOLD_BYTES,
  OLD_FILE_THRESHOLD_DAYS,
  UNUSED_ACCESS_THRESHOLD_DAYS
} from '@shared/constants';
import type { CleanupCandidate, DuplicateGroup, ScannedFile } from '@shared/types';

function daysSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
}

/**
 * Every candidate here carries a `reason` — context.md §18: "Do not
 * generate cleanup recommendations without a reason." Duplicates are the
 * only 'safe' tier by default; everything else is 'review' so the user
 * makes the final call.
 */
export function generateCleanupCandidates(
  scanId: string,
  files: ScannedFile[],
  duplicateGroups: DuplicateGroup[]
): CleanupCandidate[] {
  const candidates: CleanupCandidate[] = [];
  const alreadyFlagged = new Set<string>();

  for (const group of duplicateGroups) {
    const sorted = [...group.files].sort(
      (a, b) => new Date(a.modifiedAt).getTime() - new Date(b.modifiedAt).getTime()
    );
    const [original, ...extras] = sorted;
    if (!original) continue;
    for (const extra of extras) {
      candidates.push({
        id: randomUUID(),
        scanId,
        path: extra.path,
        sizeBytes: extra.sizeBytes,
        reason: `Duplicate of ${original.path}`,
        risk: 'safe',
        category: extra.category,
        kind: 'duplicate'
      });
      alreadyFlagged.add(extra.path);
    }
  }

  for (const file of files) {
    if (alreadyFlagged.has(file.path)) continue;
    const ext = file.extension;
    const ageDays = daysSince(file.modifiedAt);

    if (INSTALLER_EXTENSIONS.has(ext) && ageDays >= OLD_FILE_THRESHOLD_DAYS) {
      candidates.push({
        id: randomUUID(),
        scanId,
        path: file.path,
        sizeBytes: file.sizeBytes,
        reason: `Installer file, unmodified for ${Math.floor(ageDays)} days`,
        risk: 'safe',
        category: file.category,
        kind: 'old-installer'
      });
      continue;
    }

    if (ARCHIVE_EXTENSIONS.has(ext) && ageDays >= OLD_FILE_THRESHOLD_DAYS) {
      candidates.push({
        id: randomUUID(),
        scanId,
        path: file.path,
        sizeBytes: file.sizeBytes,
        reason: `Archive file, unmodified for ${Math.floor(ageDays)} days`,
        risk: 'review',
        category: file.category,
        kind: 'old-archive'
      });
      continue;
    }

    if (
      file.sizeBytes >= LARGE_FILE_THRESHOLD_BYTES &&
      daysSince(file.accessedAt) >= UNUSED_ACCESS_THRESHOLD_DAYS
    ) {
      candidates.push({
        id: randomUUID(),
        scanId,
        path: file.path,
        sizeBytes: file.sizeBytes,
        reason: `Large file, not opened in over ${Math.floor(daysSince(file.accessedAt))} days`,
        risk: 'review',
        category: file.category,
        kind: 'large-unused'
      });
    }
  }

  return candidates;
}
