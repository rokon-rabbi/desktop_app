const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

export function formatBytes(bytes: number, decimals = 1): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), UNITS.length - 1);
  const value = bytes / 1024 ** exponent;
  const formatted = exponent === 0 ? value.toFixed(0) : value.toFixed(decimals);
  return `${formatted} ${UNITS[exponent]}`;
}

export function parseGbToBytes(gb: number): number {
  return Math.round(gb * 1024 * 1024 * 1024);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffSec = Math.round(diffMs / 1000);
  const table: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, 'second'],
    [60, 'minute'],
    [24, 'hour'],
    [30, 'day'],
    [12, 'month'],
    [Number.POSITIVE_INFINITY, 'year']
  ];
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

  let value = diffSec;
  let unit: Intl.RelativeTimeFormatUnit = 'second';
  for (const [amount, nextUnit] of table) {
    if (Math.abs(value) < amount) {
      unit = nextUnit;
      break;
    }
    value = Math.trunc(value / amount);
    unit = nextUnit;
  }
  return rtf.format(-value, unit);
}

export function truncatePath(path: string, maxLength = 60): string {
  if (path.length <= maxLength) return path;
  const parts = path.split('/');
  const filename = parts.pop() ?? '';
  let result = `/${filename}`;
  let i = parts.length - 1;
  while (i >= 1 && result.length + parts[i]!.length + 1 < maxLength) {
    result = `/${parts[i]}${result}`;
    i--;
  }
  return `${i >= 1 ? '/…' : ''}${result}`;
}
