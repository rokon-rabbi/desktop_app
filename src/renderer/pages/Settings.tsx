import { useEffect } from 'react';
import { FilePlus2, FolderPlus, Monitor, Moon, Sun, Trash2, X } from 'lucide-react';
import { useSettingsStore } from '@renderer/stores/settingsStore';
import { useAsync } from '@renderer/hooks/useAsync';
import { toastError, toastSuccess } from '@renderer/stores/toastStore';
import { truncatePath } from '@renderer/lib/format';
import type { AppSettings } from '@shared/types';

const THEME_OPTIONS: { value: AppSettings['theme']; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor }
];

export function Settings(): React.JSX.Element {
  const { settings, load, update } = useSettingsStore();
  const { data: watched, reload } = useAsync(() => window.cleanSpace.monitoring.list(), []);

  useEffect(() => {
    void load();
  }, [load]);

  async function addFolder(): Promise<void> {
    const path = await window.cleanSpace.selectFolder();
    if (!path) return;
    try {
      await window.cleanSpace.monitoring.watch(path);
      toastSuccess('Now watching', truncatePath(path, 50));
      reload();
    } catch (error) {
      toastError(error, 'Could not watch that folder');
    }
  }

  async function removeFolder(path: string): Promise<void> {
    try {
      await window.cleanSpace.monitoring.unwatch(path);
      reload();
    } catch (error) {
      toastError(error, 'Could not stop watching that folder');
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <section className="panel p-5">
        <h3 className="text-[13px] font-semibold text-base-900">Appearance</h3>
        <p className="mt-0.5 text-xs text-base-500">Choose how CleanSpace looks.</p>
        <div className="mt-3 flex gap-2">
          {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => void update({ theme: value })}
              className={`flex flex-1 flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-xs font-medium transition-colors
                ${settings?.theme === value ? 'border-accent-400 bg-accent-50 text-accent-700' : 'border-base-200 text-base-500 hover:bg-base-50'}`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="panel p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[13px] font-semibold text-base-900">Watched folders</h3>
            <p className="mt-0.5 text-xs text-base-500">
              CleanSpace notifies you when new files show up here — useful for a Downloads folder.
            </p>
          </div>
          <button
            type="button"
            className="btn-secondary h-8 px-3 text-xs"
            onClick={() => void addFolder()}
          >
            <FolderPlus size={13} />
            Add folder
          </button>
        </div>

        <div className="mt-3 space-y-1.5">
          {(!watched || watched.length === 0) && (
            <p className="rounded-lg bg-base-50 px-3 py-4 text-center text-xs text-base-400">
              No folders are being watched.
            </p>
          )}
          {watched?.map((path) => (
            <div
              key={path}
              className="flex items-center gap-2.5 rounded-lg border border-base-100 px-3 py-2"
            >
              <FilePlus2 size={14} className="shrink-0 text-base-400" />
              <span
                className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-base-700"
                title={path}
              >
                {path}
              </span>
              <button
                type="button"
                onClick={() => void removeFolder(path)}
                className="rounded p-1 text-base-400 hover:bg-base-100 hover:text-important"
                aria-label={`Stop watching ${path}`}
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="panel p-5">
        <h3 className="text-[13px] font-semibold text-base-900">About</h3>
        <p className="mt-1 text-xs leading-relaxed text-base-500">
          CleanSpace is local-first: everything runs on this machine, nothing is uploaded, and no
          permanent deletion happens without going through the Linux Trash first. See History for a
          full undo trail.
        </p>
        <div className="mt-3 flex items-center gap-2 text-xs text-base-400">
          <Trash2 size={13} />
          Version 0.1.0
        </div>
      </section>
    </div>
  );
}
