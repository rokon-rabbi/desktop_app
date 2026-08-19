import { useState } from 'react';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, FolderSearch, Search } from 'lucide-react';
import { FILE_CATEGORIES } from '@shared/constants';
import type { FileCategory, ScanFilesQuery } from '@shared/types';
import { useAppStore } from '@renderer/stores/appStore';
import { useAsync } from '@renderer/hooks/useAsync';
import { CategoryBadge } from '@renderer/components/Badges';
import { EmptyState } from '@renderer/components/EmptyState';
import { SkeletonRows } from '@renderer/components/Skeleton';
import { formatBytes, formatDateTime, truncatePath } from '@renderer/lib/format';

const PAGE_SIZE = 50;

type SortBy = NonNullable<ScanFilesQuery['sortBy']>;

function SortHeader({
  label,
  column,
  sortBy,
  sortDir,
  onSort
}: {
  label: string;
  column: SortBy;
  sortBy: SortBy;
  sortDir: 'asc' | 'desc';
  onSort: (column: SortBy) => void;
}): React.JSX.Element {
  const active = sortBy === column;
  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className={`flex items-center gap-1 text-[11.5px] font-semibold uppercase tracking-wide ${active ? 'text-accent-600' : 'text-base-400 hover:text-base-600'}`}
    >
      {label}
      {active && (sortDir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
    </button>
  );
}

export function Files(): React.JSX.Element {
  const scanId = useAppStore((s) => s.currentScanId);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<FileCategory | 'All'>('All');
  const [sortBy, setSortBy] = useState<SortBy>('size');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  const { data, loading } = useAsync(async () => {
    if (!scanId) return null;
    return window.cleanSpace.scan.getFiles({
      scanId,
      search: search || undefined,
      category,
      sortBy,
      sortDir,
      page,
      pageSize: PAGE_SIZE
    });
  }, [scanId, search, category, sortBy, sortDir, page]);

  function onSort(column: SortBy): void {
    if (sortBy === column) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortDir(column === 'name' ? 'asc' : 'desc');
    }
    setPage(1);
  }

  if (!scanId) {
    return (
      <EmptyState
        icon={FolderSearch}
        title="No active scan"
        description="Start a scan from the Dashboard to browse files."
      />
    );
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base-400"
          />
          <input
            className="input pl-8"
            placeholder="Search filenames…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <select
          className="input w-auto"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value as FileCategory | 'All');
            setPage(1);
          }}
        >
          <option value="All">All categories</option>
          {FILE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        {data && <span className="text-xs text-base-500">{data.total.toLocaleString()} files</span>}
      </div>

      <div className="panel overflow-hidden">
        <div className="grid grid-cols-[1fr_120px_140px_140px] items-center gap-3 border-b border-base-100 bg-base-50 px-4 py-2.5">
          <SortHeader
            label="Name"
            column="name"
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={onSort}
          />
          <SortHeader
            label="Category"
            column="category"
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={onSort}
          />
          <SortHeader
            label="Size"
            column="size"
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={onSort}
          />
          <SortHeader
            label="Modified"
            column="modified"
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={onSort}
          />
        </div>

        {loading && (
          <div className="p-3">
            <SkeletonRows rows={8} />
          </div>
        )}

        {!loading && data && data.files.length === 0 && (
          <div className="px-4 py-10">
            <EmptyState
              icon={Search}
              title="No files match"
              description="Try a different search or category filter."
            />
          </div>
        )}

        {!loading &&
          data?.files.map((file) => (
            <div
              key={file.id}
              className="grid grid-cols-[1fr_120px_140px_140px] items-center gap-3 border-b border-base-100 px-4 py-2.5 text-[13px] last:border-b-0 hover:bg-base-50"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-base-800" title={file.filename}>
                  {file.filename}
                </p>
                <p className="truncate font-mono text-[11px] text-base-400" title={file.path}>
                  {truncatePath(file.parentFolder, 46)}
                </p>
              </div>
              <div>
                <CategoryBadge category={file.category} />
              </div>
              <span className="tabular-nums text-base-600">{formatBytes(file.sizeBytes)}</span>
              <span className="text-base-500">{formatDateTime(file.modifiedAt)}</span>
            </div>
          ))}
      </div>

      {data && data.total > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-base-500">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-secondary h-8 px-2.5"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              className="btn-secondary h-8 px-2.5"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
