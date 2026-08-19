import { useEffect } from 'react';
import { useSettingsStore } from '@renderer/stores/settingsStore';

function applyResolvedTheme(theme: 'light' | 'dark' | 'system'): void {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = theme === 'dark' || (theme === 'system' && prefersDark);
  document.documentElement.classList.toggle('dark', isDark);
}

/** Applies the user's theme choice to <html>, following the OS when set to "system". */
export function useTheme(): void {
  const theme = useSettingsStore((s) => s.settings?.theme ?? 'system');

  useEffect(() => {
    applyResolvedTheme(theme);
    if (theme !== 'system') return;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (): void => applyResolvedTheme('system');
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [theme]);
}
