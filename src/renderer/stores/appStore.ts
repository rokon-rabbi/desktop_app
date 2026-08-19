import { create } from 'zustand';

export type Page =
  'dashboard' | 'files' | 'organize' | 'duplicates' | 'cleanup' | 'history' | 'settings';

interface AppState {
  page: Page;
  currentScanId: string | null;
  setPage: (page: Page) => void;
  setCurrentScanId: (scanId: string | null) => void;
  /** Bumped whenever the on-disk state might have changed, so pages know to refetch. */
  dataVersion: number;
  invalidate: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  page: 'dashboard',
  currentScanId: null,
  setPage: (page) => set({ page }),
  setCurrentScanId: (currentScanId) => set({ currentScanId, page: 'dashboard' }),
  dataVersion: 0,
  invalidate: () => set((s) => ({ dataVersion: s.dataVersion + 1 }))
}));
