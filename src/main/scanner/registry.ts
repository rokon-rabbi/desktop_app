interface ScanToken {
  cancelled: boolean;
}

const activeScans = new Map<string, ScanToken>();

export function registerScan(scanId: string): ScanToken {
  const token: ScanToken = { cancelled: false };
  activeScans.set(scanId, token);
  return token;
}

export function cancelScan(scanId: string): boolean {
  const token = activeScans.get(scanId);
  if (!token) return false;
  token.cancelled = true;
  return true;
}

export function unregisterScan(scanId: string): void {
  activeScans.delete(scanId);
}

export class ScanCancelledError extends Error {
  constructor(scanId: string) {
    super(`Scan ${scanId} was cancelled`);
    this.name = 'ScanCancelledError';
  }
}
