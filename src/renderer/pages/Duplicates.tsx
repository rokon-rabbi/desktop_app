import { useMemo, useState } from 'react';
import { Copy, Loader2, Trash2 } from 'lucide-react';
import { useAppStore } from '@renderer/stores/appStore';
import { useIpcEvent } from '@renderer/hooks/useIpcEvent';
import { EmptyState } from '@renderer/components/EmptyState';
import { Modal } from '@renderer/components/Modal';
import { ProgressBar } from '@renderer/components/ProgressBar';
import { formatBytes, truncatePath } from '@renderer/lib/format';
import { toastError, toastSuccess } from '@renderer/stores/toastStore';
import type { DuplicateGroup, DuplicateScanProgress } from '@shared/types';

const STAGE_LABELS: Record<DuplicateScanProgress['stage'], string> = {
  grouping: 'Grouping files by size…',
  'partial-hash': 'Comparing likely matches…',
  'full-hash': 'Confirming duplicates…',
  done: 'Done'
};

export function Duplicates(): React.JSX.Element {
  const scanId = useAppStore((s) => s.currentScanId);
  const invalidate = useAppStore((s) => s.invalidate);
  const [groups, setGroups] = useState<DuplicateGroup[] | null>(null);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState<DuplicateScanProgress | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);

  useIpcEvent<DuplicateScanProgress>(window.cleanSpace.duplicates.onProgress, setProgress, []);

  async function findDuplicates(): Promise<void> {
    if (!scanId) return;
    setScanning(true);
    setProgress(null);
    try {
      const found = await window.cleanSpace.duplicates.find(scanId);
      setGroups(found);
      const defaultSelection = new Set<string>();
      for (const group of found) {
        for (const file of group.files.slice(1)) defaultSelection.add(file.path);
      }
      setSelected(defaultSelection);
    } catch (error) {
      toastError(error, 'Duplicate scan failed');
    } finally {
      setScanning(false);
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

  const selectedItems = useMemo(() => {
    if (!groups) return [];
    const all = groups.flatMap((g) => g.files);
    return all.filter((f) => selected.has(f.path));
  }, [groups, selected]);
  const selectedBytes = selectedItems.reduce((sum, f) => sum + f.sizeBytes, 0);
  const totalWasted = groups?.reduce((sum, g) => sum + g.wastedBytes, 0) ?? 0;

  async function sendSelectedToTrash(): Promise<void> {
    if (selectedItems.length === 0) return;
    setSending(true);
    try {
      await window.cleanSpace.trash.send(
        selectedItems.map((f) => ({ path: f.path, sizeBytes: f.sizeBytes }))
      );
      const count = selectedItems.length;
      toastSuccess(
        'Sent to Trash',
        `${count} duplicate file${count === 1 ? '' : 's'} moved to Trash.`
      );
      setConfirmOpen(false);
      invalidate();
      setGroups(
        (prev) =>
          prev
            ?.map((g) => ({ ...g, files: g.files.filter((f) => !selected.has(f.path)) }))
            .filter((g) => g.files.length >= 2) ?? null
      );
      setSelected(new Set());
    } catch (error) {
      toastError(error, 'Could not send files to Trash');
    } finally {
      setSending(false);
    }
  }

  if (!scanId) {
    return (
      <EmptyState
        icon={Copy}
        title="No active scan"
        description="Start a scan from the Dashboard first."
      />
    );
  }

  if (!groups && !scanning) {
    return (
      <EmptyState
        icon={Copy}
        title="Find duplicate files"
        description="CleanSpace compares files by size, then a partial hash, then a full content hash — nothing is called a duplicate until all three match."
        action={
          <button type="button" className="btn-primary" onClick={() => void findDuplicates()}>
            Find duplicates
          </button>
        }
      />
    );
  }

  if (scanning) {
    return (
      <div className="panel flex flex-col items-center gap-4 px-8 py-16 text-center">
        <Loader2 size={24} className="animate-spin text-accent-500" />
        <p className="text-sm font-medium text-base-900">
          {progress ? STAGE_LABELS[progress.stage] : 'Starting…'}
        </p>
        <div className="w-full max-w-sm">
          <ProgressBar
            value={progress?.processed ?? 0}
            max={progress?.total ?? 0}
            indeterminate={!progress?.total}
          />
        </div>
      </div>
    );
  }

  if (!groups || groups.length === 0) {
    return (
      <EmptyState
        icon={Copy}
        title="No duplicates found"
        description="Every file in this scan is unique."
      />
    );
  }

  return (
    <div className="space-y-4 pb-16">
      <div className="panel flex items-center justify-between p-4">
        <p className="text-sm text-base-700">
          <span className="font-medium text-base-900">{groups.length} duplicate groups</span>{' '}
          wasting <span className="font-medium text-base-900">{formatBytes(totalWasted)}</span>
        </p>
        <button
          type="button"
          className="btn-secondary h-8 px-3 text-xs"
          onClick={() => void findDuplicates()}
        >
          Rescan
        </button>
      </div>

      <div className="space-y-3">
        {groups.map((group) => (
          <div key={group.id} className="panel p-4">
            <div className="mb-2 flex items-center justify-between text-xs text-base-500">
              <span>
                {group.files.length} copies · {formatBytes(group.sizeBytes)} each
              </span>
              <span className="font-medium text-review-text">
                wastes {formatBytes(group.wastedBytes)}
              </span>
            </div>
            <div className="space-y-1.5">
              {group.files.map((file, i) => (
                <label
                  key={file.id}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-[12.5px] hover:bg-base-50"
                >
                  <input
                    type="checkbox"
                    className="accent-accent-500"
                    checked={selected.has(file.path)}
                    onChange={() => toggle(file.path)}
                  />
                  <span
                    className="min-w-0 flex-1 truncate font-mono text-base-700"
                    title={file.path}
                  >
                    {truncatePath(file.path, 60)}
                  </span>
                  {i === 0 && <span className="badge bg-base-100 text-base-500">Original</span>}
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
          title="Send duplicates to Trash?"
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
