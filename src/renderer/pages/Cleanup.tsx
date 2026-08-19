import { useMemo, useState } from 'react';
import { Loader2, Sparkles, Trash2 } from 'lucide-react';
import { useAppStore } from '@renderer/stores/appStore';
import { EmptyState } from '@renderer/components/EmptyState';
import { Modal } from '@renderer/components/Modal';
import { RiskBadge } from '@renderer/components/Badges';
import { formatBytes, parseGbToBytes, truncatePath } from '@renderer/lib/format';
import { toastError, toastSuccess } from '@renderer/stores/toastStore';
import type { CleanupCandidate, CleanupPlan } from '@shared/types';

export function Cleanup(): React.JSX.Element {
  const scanId = useAppStore((s) => s.currentScanId);
  const invalidate = useAppStore((s) => s.invalidate);
  const [candidates, setCandidates] = useState<CleanupCandidate[] | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [targetGb, setTargetGb] = useState('10');
  const [plan, setPlan] = useState<CleanupPlan | null>(null);
  const [planning, setPlanning] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);

  async function analyze(): Promise<void> {
    if (!scanId) return;
    setAnalyzing(true);
    try {
      const found = await window.cleanSpace.cleanup.analyze(scanId);
      setCandidates(found);
      setSelected(new Set(found.filter((c) => c.risk === 'safe').map((c) => c.path)));
      setPlan(null);
    } catch (error) {
      toastError(error, 'Cleanup analysis failed');
    } finally {
      setAnalyzing(false);
    }
  }

  async function calculatePlan(): Promise<void> {
    if (!scanId) return;
    const gb = Number.parseFloat(targetGb);
    if (!Number.isFinite(gb) || gb <= 0) return;
    setPlanning(true);
    try {
      const result = await window.cleanSpace.cleanup.planForTarget(scanId, parseGbToBytes(gb));
      setPlan(result);
      setSelected(new Set(result.selected.map((c) => c.path)));
    } catch (error) {
      toastError(error, 'Could not build a cleanup plan');
    } finally {
      setPlanning(false);
    }
  }

  function toggle(path: string): void {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  const grouped = useMemo(() => {
    if (!candidates) return [];
    const byKind = new Map<CleanupCandidate['kind'], CleanupCandidate[]>();
    for (const c of candidates) {
      const bucket = byKind.get(c.kind);
      if (bucket) bucket.push(c);
      else byKind.set(c.kind, [c]);
    }
    return [...byKind.entries()];
  }, [candidates]);

  const selectedItems = candidates?.filter((c) => selected.has(c.path)) ?? [];
  const selectedBytes = selectedItems.reduce((sum, c) => sum + c.sizeBytes, 0);

  async function sendSelectedToTrash(): Promise<void> {
    if (selectedItems.length === 0) return;
    setSending(true);
    try {
      await window.cleanSpace.trash.send(
        selectedItems.map((c) => ({ path: c.path, sizeBytes: c.sizeBytes }))
      );
      const count = selectedItems.length;
      toastSuccess('Sent to Trash', `${count} file${count === 1 ? '' : 's'} moved to Trash.`);
      setConfirmOpen(false);
      invalidate();
      setCandidates((prev) => prev?.filter((c) => !selected.has(c.path)) ?? null);
      setSelected(new Set());
      setPlan(null);
    } catch (error) {
      toastError(error, 'Could not send files to Trash');
    } finally {
      setSending(false);
    }
  }

  if (!scanId) {
    return (
      <EmptyState
        icon={Sparkles}
        title="No active scan"
        description="Start a scan from the Dashboard first."
      />
    );
  }

  if (!candidates && !analyzing) {
    return (
      <EmptyState
        icon={Sparkles}
        title="Analyze for cleanup"
        description="Finds confirmed duplicates, old installers and archives, and large unused files — each with a reason and a risk level. Nothing marked 'Important' is ever pre-selected."
        action={
          <button type="button" className="btn-primary" onClick={() => void analyze()}>
            Analyze
          </button>
        }
      />
    );
  }

  if (analyzing) {
    return (
      <div className="panel flex flex-col items-center gap-4 px-8 py-16 text-center">
        <Loader2 size={24} className="animate-spin text-accent-500" />
        <p className="text-sm font-medium text-base-900">Analyzing files for cleanup…</p>
      </div>
    );
  }

  if (!candidates || candidates.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="Nothing to clean up"
        description="No cleanup candidates were found."
      />
    );
  }

  return (
    <div className="space-y-4 pb-16">
      <div className="panel p-4">
        <p className="text-[13px] font-semibold text-base-900">I need space free</p>
        <div className="mt-2.5 flex items-center gap-2">
          <div className="relative w-32">
            <input
              type="number"
              min="0.1"
              step="0.5"
              className="input pr-9"
              value={targetGb}
              onChange={(e) => setTargetGb(e.target.value)}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-base-400">
              GB
            </span>
          </div>
          <button
            type="button"
            className="btn-secondary h-9 px-3 text-xs"
            disabled={planning}
            onClick={() => void calculatePlan()}
          >
            {planning ? <Loader2 size={13} className="animate-spin" /> : 'Plan cleanup'}
          </button>
          {plan && (
            <span className={`text-xs ${plan.metTarget ? 'text-safe-text' : 'text-review-text'}`}>
              {plan.metTarget ? 'Target reached: ' : 'Closest we can get safely: '}
              {formatBytes(plan.achievedBytes)} selected from {plan.selected.length} files
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {grouped.map(([kind, items]) => (
          <div key={kind} className="panel p-4">
            <div className="mb-2 flex items-center justify-between text-xs text-base-500">
              <span className="font-medium text-base-800">{kindLabel(kind)}</span>
              <span>{formatBytes(items.reduce((s, c) => s + c.sizeBytes, 0))} total</span>
            </div>
            <div className="space-y-1.5">
              {items.map((c) => (
                <label
                  key={c.id}
                  className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-1.5 text-[12.5px] hover:bg-base-50"
                >
                  <input
                    type="checkbox"
                    className="accent-accent-500 mt-0.5"
                    checked={selected.has(c.path)}
                    onChange={() => toggle(c.path)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-base-700" title={c.path}>
                      {truncatePath(c.path, 58)}
                    </span>
                    <span className="block truncate text-[11.5px] text-base-400">{c.reason}</span>
                  </span>
                  <RiskBadge risk={c.risk} />
                  <span className="w-16 shrink-0 text-right tabular-nums text-base-500">
                    {formatBytes(c.sizeBytes)}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {selectedItems.length > 0 && (
        <div className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-base-200 bg-base-0 px-4 py-2.5 shadow-floating">
          <span className="text-[13px] text-base-700">
            {selectedItems.length} selected · {formatBytes(selectedBytes)}
          </span>
          <button
            type="button"
            className="btn-danger h-8 px-3 text-xs"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 size={13} />
            Send to Trash
          </button>
        </div>
      )}

      {confirmOpen && (
        <Modal
          title="Send selected files to Trash?"
          description="Files go to the Linux Trash, not permanent deletion — you can restore them from there."
          onClose={() => !sending && setConfirmOpen(false)}
          footer={
            <>
              <button
                type="button"
                className="btn-secondary"
                disabled={sending}
                onClick={() => setConfirmOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-danger"
                disabled={sending}
                onClick={() => void sendSelectedToTrash()}
              >
                {sending && <Loader2 size={14} className="animate-spin" />}
                {sending ? 'Sending…' : `Send ${selectedItems.length} to Trash`}
              </button>
            </>
          }
        >
          <p className="text-sm text-base-600">
            {selectedItems.length} files · {formatBytes(selectedBytes)} will be freed up.
          </p>
        </Modal>
      )}
    </div>
  );
}

function kindLabel(kind: CleanupCandidate['kind']): string {
  const labels: Record<CleanupCandidate['kind'], string> = {
    duplicate: 'Duplicate files',
    'old-installer': 'Old installers',
    'old-archive': 'Old archives',
    'large-unused': 'Large unused files'
  };
  return labels[kind];
}
