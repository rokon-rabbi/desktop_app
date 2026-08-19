export function Skeleton({ className }: { className?: string }): React.JSX.Element {
  return <div className={`skeleton ${className ?? ''}`} />;
}

export function SkeletonRows({
  rows = 5,
  className
}: {
  rows?: number;
  className?: string;
}): React.JSX.Element {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className={`h-11 w-full ${className ?? ''}`} />
      ))}
    </div>
  );
}
