import type { CleanupRisk, FileCategory } from '@shared/types';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '@renderer/lib/category';

export function CategoryBadge({ category }: { category: FileCategory }): React.JSX.Element {
  const Icon = CATEGORY_ICONS[category];
  return (
    <span className="badge border border-base-200 bg-base-50 text-base-600">
      <Icon size={12} style={{ color: CATEGORY_COLORS[category] }} />
      {category}
    </span>
  );
}

const RISK_STYLES: Record<CleanupRisk, string> = {
  safe: 'bg-safe-bg text-safe-text',
  review: 'bg-review-bg text-review-text',
  important: 'bg-important-bg text-important-text'
};

const RISK_LABELS: Record<CleanupRisk, string> = {
  safe: 'Safe',
  review: 'Review',
  important: 'Important'
};

export function RiskBadge({ risk }: { risk: CleanupRisk }): React.JSX.Element {
  return <span className={`badge ${RISK_STYLES[risk]}`}>{RISK_LABELS[risk]}</span>;
}
