interface ProgressBarProps {
  value: number;
  max: number;
  indeterminate?: boolean;
  className?: string;
}

export function ProgressBar({
  value,
  max,
  indeterminate,
  className
}: ProgressBarProps): React.JSX.Element {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-base-200 ${className ?? ''}`}>
      {indeterminate ? (
        <div className="h-full w-2/5 animate-indeterminate rounded-full bg-accent-500" />
      ) : (
        <div
          className="h-full rounded-full bg-accent-500 transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      )}
    </div>
  );
}
