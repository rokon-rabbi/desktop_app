import { useState } from 'react';
import { Folder, FolderPlus, Loader2 } from 'lucide-react';
import { useAsync } from '@renderer/hooks/useAsync';
import { useAppStore } from '@renderer/stores/appStore';
import { toastError } from '@renderer/stores/toastStore';

export function ScanPicker(): React.JSX.Element {
  const setCurrentScanId = useAppStore((s) => s.setCurrentScanId);
  const { data: targets, loading } = useAsync(() => window.cleanSpace.getScanTargets(), []);
  const [starting, setStarting] = useState<string | null>(null);

  async function startScan(path: string): Promise<void> {
    setStarting(path);
    try {
      const { scanId } = await window.cleanSpace.scan.start(path);
      setCurrentScanId(scanId);
    } catch (error) {
      toastError(error, 'Could not start scan');
    } finally {
      setStarting(null);
    }
  }

  async function browse(): Promise<void> {
    const path = await window.cleanSpace.selectFolder();
    if (path) void startScan(path);
  }

  return (
    <div className="mx-auto max-w-2xl py-10">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-base-900">Pick a folder to scan</h2>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-base-500">
          CleanSpace scans a folder to show you what's taking up space, find duplicates, and suggest
          safe cleanup — nothing is changed until you approve it.
        </p>
      </div>

      <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {loading &&
          Array.from({ length: 5 }, (_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
        {targets
          ?.filter((t) => t.exists)
          .map((target) => (
            <button
              key={target.path}
              type="button"
              disabled={starting !== null}
              onClick={() => void startScan(target.path)}
              className="panel flex flex-col items-center gap-2 px-3 py-4 text-center transition-transform hover:-translate-y-0.5 hover:border-accent-300 disabled:pointer-events-none disabled:opacity-60"
            >
              {starting === target.path ? (
                <Loader2 size={20} className="animate-spin text-accent-500" />
              ) : (
                <Folder size={20} className="text-accent-500" />
              )}
              <span className="text-[13px] font-medium text-base-800">{target.label}</span>
            </button>
          ))}

        <button
          type="button"
          disabled={starting !== null}
          onClick={() => void browse()}
          className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-base-300 px-3 py-4 text-center text-base-500 transition-colors hover:border-accent-400 hover:text-accent-600 disabled:pointer-events-none disabled:opacity-60"
        >
          <FolderPlus size={20} />
          <span className="text-[13px] font-medium">Choose folder…</span>
        </button>
      </div>
    </div>
  );
}
