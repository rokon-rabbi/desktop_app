import { useState } from 'react';
import { History as HistoryIcon, Loader2, RotateCcw, Trash2, Wand2 } from 'lucide-react';
import { useAsync } from '@renderer/hooks/useAsync';
import { useAppStore } from '@renderer/stores/appStore';
import { EmptyState } from '@renderer/components/EmptyState';
import { SkeletonRows } from '@renderer/components/Skeleton';
import { formatBytes, formatDateTime } from '@renderer/lib/format';
import { toastError, toastSuccess } from '@renderer/stores/toastStore';
import type { OperationRecord, OperationStatus } from '@shared/types';

const STATUS_STYLES: Record<OperationStatus, string> = {
  pending: 'bg-base-100 text-base-500',
  'in-progress': 'bg-accent-50 text-accent-700',
  completed: 'bg-safe-bg text-safe-text',
  failed: 'bg-important-bg text-important-text',
  undone: 'bg-base-100 text-base-500'
};

export function History(): React.JSX.Element {
  const invalidate = useAppStore((s) => s.invalidate);
  const {
    data: operations,
    loading,
    reload
  } = useAsync(() => window.cleanSpace.history.listOperations(), []);
  const [undoingId, setUndoingId] = useState<string | null>(null);

  async function undo(operation: OperationRecord): Promise<void> {
    setUndoingId(operation.id);
    try {
      await window.cleanSpace.history.undo(operation.id);
      toastSuccess('Undone', `Reversed "${operation.summary}".`);
      invalidate();
      reload();
    } catch (error) {
      toastError(error, 'Could not undo this operation');
    } finally {
      setUndoingId(null);
    }
  }

  if (loading) return <SkeletonRows rows={6} />;

  if (!operations || operations.length === 0) {
    return (
      <EmptyState
        icon={HistoryIcon}
        title="No operations yet"
        description="Moves and Trash actions you make will appear here, with the option to undo."
      />
    );
  }

  return (
    <div className="space-y-2.5">
      {operations.map((op) => (
        <div key={op.id} className="panel flex items-center gap-4 p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-base-100 text-base-500">
            {op.type === 'MOVE' ? <Wand2 size={16} /> : <Trash2 size={16} />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-base-900">{op.summary}</p>
            <p className="mt-0.5 text-[11.5px] text-base-500">
              {formatDateTime(op.createdAt)} · {op.itemCount} items · {formatBytes(op.totalBytes)}
            </p>
          </div>
          <span className={`badge ${STATUS_STYLES[op.status]}`}>{op.status}</span>
          {op.canUndo && (
            <button
              type="button"
              className="btn-secondary h-8 px-3 text-xs"
              disabled={undoingId === op.id}
              onClick={() => void undo(op)}
            >
              {undoingId === op.id ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <RotateCcw size={13} />
              )}
              Undo
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
