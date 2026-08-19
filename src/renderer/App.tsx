import { useEffect } from 'react';
import { Sidebar } from '@renderer/components/Sidebar';
import { TopBar } from '@renderer/components/TopBar';
import { ToastContainer } from '@renderer/components/ToastContainer';
import { useAppStore } from '@renderer/stores/appStore';
import { useSettingsStore } from '@renderer/stores/settingsStore';
import { useTheme } from '@renderer/hooks/useTheme';
import { useIpcEvent } from '@renderer/hooks/useIpcEvent';
import { useToastStore } from '@renderer/stores/toastStore';
import { Dashboard } from '@renderer/pages/Dashboard';
import { Files } from '@renderer/pages/Files';
import { Organize } from '@renderer/pages/Organize';
import { Duplicates } from '@renderer/pages/Duplicates';
import { Cleanup } from '@renderer/pages/Cleanup';
import { History } from '@renderer/pages/History';
import { Settings } from '@renderer/pages/Settings';
import type { MonitorEvent } from '@shared/types';

const PAGES = {
  dashboard: Dashboard,
  files: Files,
  organize: Organize,
  duplicates: Duplicates,
  cleanup: Cleanup,
  history: History,
  settings: Settings
};

export function App(): React.JSX.Element {
  const page = useAppStore((s) => s.page);
  const loadSettings = useSettingsStore((s) => s.load);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useTheme();

  useIpcEvent<MonitorEvent>(
    window.cleanSpace.monitoring.onEvent,
    (event) => {
      if (event.type !== 'add') return;
      const filename = event.path.slice(event.path.lastIndexOf('/') + 1);
      useToastStore.getState().push({
        type: 'info',
        title: 'New file detected',
        description: `${filename} appeared in a watched folder`
      });
    },
    []
  );

  const Page = PAGES[page];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-base-50">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex-1 overflow-y-auto px-6 py-6">
          <Page />
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}
