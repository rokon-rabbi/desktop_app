import type { CategoryTotal } from '@shared/types';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '@renderer/lib/category';
import { formatBytes } from '@renderer/lib/format';

interface CategoryBreakdownProps {
  categoryTotals: CategoryTotal[];
  totalBytes: number;
}

/**
 * A single-series proportional bar (share of total storage by category)
 * with a directly-labeled legend below it — every swatch carries a name
 * and value so identity never depends on color alone (dataviz skill:
 * three of the eight categorical hues sit below 3:1 contrast in light
 * mode, which is only permitted with visible labels — never bare dots).
 */
export function CategoryBreakdown({
  categoryTotals,
  totalBytes
}: CategoryBreakdownProps): React.JSX.Element {
  const sorted = [...categoryTotals]
    .filter((c) => c.totalBytes > 0)
    .sort((a, b) => b.totalBytes - a.totalBytes);

  return (
    <div>
      <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-base-100">
        {sorted.map((c) => (
          <div
            key={c.category}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{
              width: `${totalBytes > 0 ? (c.totalBytes / totalBytes) * 100 : 0}%`,
              backgroundColor: CATEGORY_COLORS[c.category]
            }}
            title={`${c.category}: ${formatBytes(c.totalBytes)}`}
          />
        ))}
      </div>

      <ul className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
        {sorted.map((c) => {
          const Icon = CATEGORY_ICONS[c.category];
          const pct = totalBytes > 0 ? (c.totalBytes / totalBytes) * 100 : 0;
          return (
            <li key={c.category} className="flex items-center gap-2.5 text-[13px]">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                style={{ backgroundColor: CATEGORY_COLORS[c.category] }}
                aria-hidden
              />
              <Icon size={13} className="shrink-0 text-base-400" />
              <span className="min-w-0 flex-1 truncate text-base-700">{c.category}</span>
              <span className="text-base-400">{c.fileCount.toLocaleString()}</span>
              <span className="w-16 shrink-0 text-right font-medium tabular-nums text-base-800">
                {formatBytes(c.totalBytes)}
              </span>
              <span className="w-10 shrink-0 text-right tabular-nums text-base-400">
                {pct.toFixed(0)}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
