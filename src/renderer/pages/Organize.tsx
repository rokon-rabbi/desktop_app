import { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Loader2, TriangleAlert, Wand2 } from 'lucide-react';
import { useAppStore } from '@renderer/stores/appStore';
import { useAsync } from '@renderer/hooks/useAsync';
import { useIpcEvent } from '@renderer/hooks/useIpcEvent';
import { EmptyState } from '@renderer/components/EmptyState';
import { Modal } from '@renderer/components/Modal';
import { ProgressBar } from '@renderer/components/ProgressBar';
import { Skeleton } from '@renderer/components/Skeleton';
import { CategoryBadge } from '@renderer/components/Badges';
import { formatBytes, truncatePath } from '@renderer/lib/format';
import { toastError, toastSuccess } from '@renderer/stores/toastStore';
import type { ApplyProgress } from '@shared/types';

export function Organize(): React.JSX.Element {
  const scanId = useAppStore((s) => s.currentScanId);
  const invalidate = useAppStore((s) => s.invalidate);
  const {
    data: preview,
    loading,
    reload
  } = useAsync(async () => {
    if (!scanId) return null;
    return window.cleanSpace.organize.preview(scanId);
  }, [scanId]);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const [progress, setProgress] = useState<ApplyProgress | null>(null);

  useIpcEvent<ApplyProgress>(window.cleanSpace.organize.onApplyProgress, setProgress, []);

  const totalBytes = useMemo(
    () => preview?.moves.reduce((sum, m) => sum + m.sizeBytes, 0) ?? 0,
    [preview]
  );
  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const move of preview?.moves ?? [])
      map.set(move.category, (map.get(move.category) ?? 0) + 1);
    return [...map.entries()];
  }, [preview]);
  const collisions = preview?.moves.filter((m) => m.collision).length ?? 0;

  async function apply(): Promise<void> {
    if (!preview || preview.moves.length === 0) return;
    setApplying(true);
    setProgress(null);
    try {
      await window.cleanSpace.organize.apply(preview.moves);
      const count = preview.moves.length;
      toastSuccess(
        'Files organized',
        `Moved ${count} file${count === 1 ? '' : 's'} into category folders.`
      );
      setConfirmOpen(false);
      invalidate();
      reload();
    } catch (error) {
      toastError(error, 'Could not organize files');
    } finally {
      setApplying(false);
    }
  }

  if (!scanId) {
    return (
      <EmptyState
        icon={Wand2}
        title="No active scan"
        description="Start a scan from the Dashboard first."
      />
    );
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!preview || preview.moves.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title="Nothing to organize"
        description="Every file is already in its category folder, or there's nothing to move yet."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="panel flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="text-sm font-medium text-base-900">
            {preview.moves.length} file{preview.moves.length === 1 ? '' : 's'} will be moved into
            category folders
          </p>
          <p className="mt-0.5 text-xs text-base-500">
            {formatBytes(totalBytes)} total
            {collisions > 0 &&
              ` · ${collisions} name collision${collisions === 1 ? '' : 's'} will be auto-renamed`}
            {preview.skipped.length > 0 && ` · ${preview.skipped.length} already organized`}
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setConfirmOpen(true)}>
          <Wand2 size={15} />
          Preview &amp; apply
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {byCategory.map(([category, count]) => (
          <span key={category} className="badge border border-base-200 bg-base-0 text-base-600">
            {category} · {count}
          </span>
        ))}
      </div>

      <div className="panel max-h-[480px] overflow-y-auto">
        {preview.moves.map((move) => (
          <div
            key={move.id}
            className="flex items-center gap-3 border-b border-base-100 px-4 py-2.5 text-[12.5px] last:border-b-0"
          >
            <CategoryBadge category={move.category} />
            <span
              className="min-w-0 flex-1 truncate font-mono text-base-600"
              title={move.sourcePath}
            >
              {truncatePath(move.sourcePath, 42)}
            </span>
            <ArrowRight size={13} className="shrink-0 text-base-300" />
            <span
              className="min-w-0 flex-1 truncate font-mono text-base-800"
              title={move.destinationPath}
            >
              {truncatePath(move.destinationPath, 42)}
            </span>
            {move.collision && (
              <span title="Destination name collision — will be renamed">
                <TriangleAlert size={13} className="shrink-0 text-review" />
              </span>
            )}
            <span className="w-16 shrink-0 text-right tabular-nums text-base-500">
              {formatBytes(move.sizeBytes)}
            </span>
          </div>
        ))}
      </div>

      {confirmOpen && (
        <Modal
          title="Apply organization?"
          description={`This will move ${preview.moves.length} files on disk. Every move can be undone from History.`}
          onClose={() => !applying && setConfirmOpen(false)}
          footer={
            <>
              <button
                type="button"
                className="btn-secondary"
                disabled={applying}
                onClick={() => setConfirmOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={applying}
                onClick={() => void apply()}
              >
                {applying && <Loader2 size={14} className="animate-spin" />}
                {applying ? 'Applying…' : 'Apply moves'}
              </button>
            </>
          }
        >
          <p className="text-sm text-base-600">
            {formatBytes(totalBytes)} across {byCategory.length} categor
            {byCategory.length === 1 ? 'y' : 'ies'}.
          </p>
          {applying && progress && (
            <div className="mt-4">
              <ProgressBar value={progress.itemsDone} max={progress.itemsTotal} />
              <p className="mt-1.5 truncate font-mono text-[11px] text-base-400">
                {progress.currentPath}
              </p>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
