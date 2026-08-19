import { Files, FolderTree, HardDrive, Loader2, TriangleAlert } from 'lucide-react';
import { useAsync } from '@renderer/hooks/useAsync';
import { useAppStore } from '@renderer/stores/appStore';
import { useCurrentScan } from '@renderer/hooks/useCurrentScan';
import { ScanPicker } from '@renderer/components/ScanPicker';
import { StatCard } from '@renderer/components/StatCard';
import { CategoryBreakdown } from '@renderer/components/CategoryBreakdown';
import { ProgressBar } from '@renderer/components/ProgressBar';
import { Skeleton } from '@renderer/components/Skeleton';
import { formatBytes, truncatePath } from '@renderer/lib/format';

function ScanningPanel(): React.JSX.Element {
  const { scan, progress } = useCurrentScan();
  if (!scan) return <></>;

  return (
    <div className="panel flex flex-col items-center gap-4 px-8 py-14 text-center">
      <Loader2 size={26} className="animate-spin text-accent-500" />
      <div>
        <p className="text-sm font-medium text-base-900">
          Scanning {truncatePath(scan.rootPath, 50)}…
        </p>
        <p className="mt-1 text-xs text-base-500">
          {progress
            ? `${progress.filesScanned.toLocaleString()} files · ${formatBytes(progress.bytesScanned)}`
            : 'Starting…'}
        </p>
      </div>
      <div className="w-full max-w-sm">
        <ProgressBar value={0} max={0} indeterminate />
      </div>
      {progress && progress.currentPath && (
        <p className="w-full max-w-md truncate font-mono text-[11px] text-base-400">
          {progress.currentPath}
        </p>
      )}
      <button
        type="button"
        className="btn-secondary mt-2 h-8 px-3 text-xs"
        onClick={() => void window.cleanSpace.scan.cancel(scan.id)}
      >
        Cancel scan
      </button>
    </div>
  );
}

function AnalyticsPanel({ scanId }: { scanId: string }): React.JSX.Element {
  const {
    data: analytics,
    loading,
    error
  } = useAsync(() => window.cleanSpace.analytics.getStorageSummary(scanId), [scanId]);

  if (loading) {
    return (
      <div className="grid gap-4">
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="panel flex items-center gap-3 px-5 py-4 text-sm text-important-text">
        <TriangleAlert size={16} />
        Could not load storage analytics for this scan.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={HardDrive}
          label="Total scanned"
          value={formatBytes(analytics.totalBytes)}
          accent
        />
        <StatCard icon={Files} label="Files found" value={analytics.totalFiles.toLocaleString()} />
        <StatCard
          icon={FolderTree}
          label="Categories present"
          value={String(analytics.categoryTotals.length)}
        />
      </div>

      <div className="panel p-5">
        <h3 className="text-[13px] font-semibold text-base-900">Storage by category</h3>
        <div className="mt-4">
          <CategoryBreakdown
            categoryTotals={analytics.categoryTotals}
            totalBytes={analytics.totalBytes}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="panel p-5">
          <h3 className="text-[13px] font-semibold text-base-900">Largest files</h3>
          <ul className="mt-3 divide-y divide-base-100">
            {analytics.largestFiles.slice(0, 8).map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3 py-2 text-[13px]">
                <span className="min-w-0 truncate text-base-700" title={f.path}>
                  {f.filename}
                </span>
                <span className="shrink-0 tabular-nums text-base-500">
                  {formatBytes(f.sizeBytes)}
                </span>
              </li>
            ))}
            {analytics.largestFiles.length === 0 && (
              <li className="py-3 text-xs text-base-400">No files found.</li>
            )}
          </ul>
        </div>

        <div className="panel p-5">
          <h3 className="text-[13px] font-semibold text-base-900">Largest folders</h3>
          <ul className="mt-3 divide-y divide-base-100">
            {analytics.largestFolders.slice(0, 8).map((f) => (
              <li
                key={f.folder}
                className="flex items-center justify-between gap-3 py-2 text-[13px]"
              >
                <span className="min-w-0 truncate text-base-700" title={f.folder}>
                  {truncatePath(f.folder, 40)}
                </span>
                <span className="shrink-0 tabular-nums text-base-500">
                  {formatBytes(f.totalBytes)}
                </span>
              </li>
            ))}
            {analytics.largestFolders.length === 0 && (
              <li className="py-3 text-xs text-base-400">No folders found.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function Dashboard(): React.JSX.Element {
  const currentScanId = useAppStore((s) => s.currentScanId);
  const { scan } = useCurrentScan();

  if (!currentScanId) return <ScanPicker />;
  if (scan && scan.status === 'running') return <ScanningPanel />;
  return <AnalyticsPanel scanId={currentScanId} />;
}
