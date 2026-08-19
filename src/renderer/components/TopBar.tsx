import { FolderOpen, RefreshCw } from 'lucide-react';
import { useAppStore, type Page } from '@renderer/stores/appStore';
import { useCurrentScan } from '@renderer/hooks/useCurrentScan';
import { formatBytes } from '@renderer/lib/format';
import { toastError } from '@renderer/stores/toastStore';

const TITLES: Record<Page, string> = {
  dashboard: 'Dashboard',
  files: 'Files',
  organize: 'Organize',
  duplicates: 'Duplicates',
  cleanup: 'Cleanup',
  history: 'History',
  settings: 'Settings'
};

export function TopBar(): React.JSX.Element {
  const page = useAppStore((s) => s.page);
  const setCurrentScanId = useAppStore((s) => s.setCurrentScanId);
  const { scan, progress } = useCurrentScan();

  async function rescan(): Promise<void> {
    if (!scan) return;
    try {
      const { scanId } = await window.cleanSpace.scan.start(scan.rootPath);
      setCurrentScanId(scanId);
    } catch (error) {
      toastError(error, 'Could not start scan');
    }
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-base-200 bg-base-0/70 px-6">
      <h1 className="text-[15px] font-semibold text-base-900">{TITLES[page]}</h1>

      {scan && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-base-100 px-3 py-1.5 text-xs text-base-600">
            <FolderOpen size={13} />
            <span className="max-w-[280px] truncate font-mono" title={scan.rootPath}>
              {scan.rootPath}
            </span>
            <span className="text-base-400">·</span>
            <span>
              {progress && !progress.done ? progress.filesScanned : scan.fileCount} files
              {progress && !progress.done ? '…' : ` · ${formatBytes(scan.totalBytes)}`}
            </span>
          </div>
          <button
            type="button"
            onClick={() => void rescan()}
            disabled={scan.status === 'running'}
            className="btn-ghost h-8 px-2.5"
            title="Rescan this folder"
          >
            <RefreshCw size={14} className={scan.status === 'running' ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            onClick={() => setCurrentScanId(null)}
            className="btn-secondary h-8 px-3 text-xs"
          >
            Change folder
          </button>
        </div>
      )}
    </header>
  );
}
