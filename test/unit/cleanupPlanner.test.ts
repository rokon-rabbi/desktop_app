import { describe, expect, it } from 'vitest';
import { planForTarget } from '@main/cleanup/planner';
import type { CleanupCandidate } from '@shared/types';

function candidate(overrides: Partial<CleanupCandidate>): CleanupCandidate {
  return {
    id: overrides.id ?? Math.random().toString(36),
    scanId: 'scan-1',
    path: '/home/user/file',
    sizeBytes: 100,
    reason: 'test',
    risk: 'safe',
    category: 'Other',
    kind: 'duplicate',
    ...overrides
  };
}

describe('planForTarget', () => {
  it('prefers safe candidates over review candidates', () => {
    const candidates = [
      candidate({ id: 'review-1', risk: 'review', sizeBytes: 1000 }),
      candidate({ id: 'safe-1', risk: 'safe', sizeBytes: 1000 })
    ];
    const plan = planForTarget('scan-1', candidates, 1000);
    expect(plan.selected.map((c) => c.id)).toEqual(['safe-1']);
  });

  it('never selects important-risk candidates', () => {
    const candidates = [candidate({ id: 'important-1', risk: 'important', sizeBytes: 5000 })];
    const plan = planForTarget('scan-1', candidates, 1000);
    expect(plan.selected).toHaveLength(0);
    expect(plan.metTarget).toBe(false);
  });

  it('stops once the target is met and reports the achieved total', () => {
    const candidates = [
      candidate({ id: 'a', risk: 'safe', sizeBytes: 600 }),
      candidate({ id: 'b', risk: 'safe', sizeBytes: 600 }),
      candidate({ id: 'c', risk: 'safe', sizeBytes: 600 })
    ];
    const plan = planForTarget('scan-1', candidates, 1000);
    expect(plan.metTarget).toBe(true);
    expect(plan.achievedBytes).toBe(1200);
    expect(plan.selected).toHaveLength(2);
  });

  it('keeps every candidate visible in groups even when not selected', () => {
    const candidates = [
      candidate({ id: 'a', risk: 'safe', sizeBytes: 100, kind: 'duplicate' }),
      candidate({ id: 'b', risk: 'important', sizeBytes: 9999, kind: 'large-unused' })
    ];
    const plan = planForTarget('scan-1', candidates, 50);
    const allInGroups = plan.groups.flatMap((g) => g.candidates.map((c) => c.id));
    expect(allInGroups.sort()).toEqual(['a', 'b']);
  });
});
