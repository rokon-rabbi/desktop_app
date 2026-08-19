import type { CleanupCandidate, CleanupPlan, CleanupPlanGroup, CleanupRisk } from '@shared/types';

const KIND_LABELS: Record<CleanupCandidate['kind'], string> = {
  duplicate: 'Duplicate files',
  'old-installer': 'Old installers',
  'old-archive': 'Old archives',
  'large-unused': 'Large unused files'
};

/** Safe candidates are preferred first, then review. Important is excluded by default (context.md §19). */
const RISK_PRIORITY: Record<CleanupRisk, number> = { safe: 0, review: 1, important: 2 };

/**
 * Greedily selects candidates to satisfy a byte target, safest first. Never
 * removes candidates from the returned groups — the full set stays visible
 * so the plan can't "hide the selected files from the user."
 */
export function planForTarget(
  scanId: string,
  candidates: CleanupCandidate[],
  targetBytes: number
): CleanupPlan {
  const eligible = candidates.filter((c) => c.risk !== 'important');
  const ordered = [...eligible].sort((a, b) => {
    const riskDiff = RISK_PRIORITY[a.risk] - RISK_PRIORITY[b.risk];
    if (riskDiff !== 0) return riskDiff;
    return b.sizeBytes - a.sizeBytes;
  });

  const selected: CleanupCandidate[] = [];
  let achievedBytes = 0;
  for (const candidate of ordered) {
    if (achievedBytes >= targetBytes) break;
    selected.push(candidate);
    achievedBytes += candidate.sizeBytes;
  }

  const groupsByKind = new Map<CleanupCandidate['kind'], CleanupCandidate[]>();
  for (const candidate of candidates) {
    const bucket = groupsByKind.get(candidate.kind);
    if (bucket) bucket.push(candidate);
    else groupsByKind.set(candidate.kind, [candidate]);
  }

  const groups: CleanupPlanGroup[] = [...groupsByKind.entries()].map(([kind, items]) => ({
    kind,
    label: KIND_LABELS[kind],
    candidates: items,
    totalBytes: items.reduce((sum, c) => sum + c.sizeBytes, 0)
  }));

  return {
    targetBytes,
    achievedBytes,
    metTarget: achievedBytes >= targetBytes,
    selected,
    groups
  };
}
