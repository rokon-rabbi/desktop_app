import { create } from 'zustand';
import type { AppSettings } from '@shared/types';

interface SettingsState {
  settings: AppSettings | null;
  loading: boolean;
  load: () => Promise<void>;
  update: (partial: Partial<AppSettings>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  loading: true,
  load: async () => {
    set({ loading: true });
    const settings = await window.cleanSpace.settings.get();
    set({ settings, loading: false });
  },
  update: async (partial) => {
    const current = get().settings;
    if (current) set({ settings: { ...current, ...partial } });
    const settings = await window.cleanSpace.settings.update(partial);
    set({ settings });
  }
}));
