import { useEffect, useState } from 'react';
import type { ScanProgress, ScanRecord } from '@shared/types';
import { useAppStore } from '@renderer/stores/appStore';
import { useIpcEvent } from './useIpcEvent';

interface CurrentScanState {
  scan: ScanRecord | null;
  progress: ScanProgress | null;
  loading: boolean;
}

/** Tracks the active scan's stored record plus live progress while it's still running. */
export function useCurrentScan(): CurrentScanState {
  const scanId = useAppStore((s) => s.currentScanId);
  const dataVersion = useAppStore((s) => s.dataVersion);
  const [scan, setScan] = useState<ScanRecord | null>(null);
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!scanId) {
      setScan(null);
      setProgress(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    window.cleanSpace.scan.getSummary(scanId).then((record) => {
      if (!cancelled) {
        setScan(record);
        setLoading(false);
        if (record && record.status !== 'running') setProgress(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [scanId, dataVersion]);

  useIpcEvent<ScanProgress>(
    window.cleanSpace.scan.onProgress,
    (p) => {
      if (p.scanId !== scanId) return;
      setProgress(p);
      if (p.done) {
        void window.cleanSpace.scan.getSummary(p.scanId).then(setScan);
      }
    },
    [scanId]
  );

  return { scan, progress, loading };
}
