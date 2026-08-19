import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent
}: StatCardProps): React.JSX.Element {
  return (
    <div className="panel p-4">
      <div className="flex items-center gap-2 text-base-500">
        <Icon size={15} className={accent ? 'text-accent-500' : ''} />
        <span className="text-[12.5px] font-medium">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-base-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-base-500">{hint}</p>}
    </div>
  );
}
