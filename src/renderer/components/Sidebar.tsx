import {
  Copy,
  FolderOpen,
  History,
  LayoutDashboard,
  Settings as SettingsIcon,
  Sparkles,
  Trash2,
  Wand2
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAppStore, type Page } from '@renderer/stores/appStore';

interface NavItem {
  page: Page;
  label: string;
  icon: LucideIcon;
  requiresScan: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { page: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, requiresScan: false },
  { page: 'files', label: 'Files', icon: FolderOpen, requiresScan: true },
  { page: 'organize', label: 'Organize', icon: Wand2, requiresScan: true },
  { page: 'duplicates', label: 'Duplicates', icon: Copy, requiresScan: true },
  { page: 'cleanup', label: 'Cleanup', icon: Trash2, requiresScan: true },
  { page: 'history', label: 'History', icon: History, requiresScan: false },
  { page: 'settings', label: 'Settings', icon: SettingsIcon, requiresScan: false }
];

export function Sidebar(): React.JSX.Element {
  const page = useAppStore((s) => s.page);
  const setPage = useAppStore((s) => s.setPage);
  const currentScanId = useAppStore((s) => s.currentScanId);

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-base-200 bg-base-0/60 px-3 py-4">
      <div className="mb-6 flex items-center gap-2 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-500 text-base-0">
          <Sparkles size={18} strokeWidth={2.25} />
        </div>
        <span className="text-[15px] font-semibold tracking-tight text-base-900">CleanSpace</span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const disabled = item.requiresScan && !currentScanId;
          const active = page === item.page;
          const Icon = item.icon;
          return (
            <button
              key={item.page}
              type="button"
              disabled={disabled}
              onClick={() => setPage(item.page)}
              className={`group flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors
                ${active ? 'bg-accent-50 text-accent-700' : 'text-base-600 hover:bg-base-100 hover:text-base-900'}
                ${disabled ? 'cursor-not-allowed opacity-40 hover:bg-transparent hover:text-base-600' : ''}`}
              title={disabled ? 'Scan a folder first' : undefined}
            >
              <Icon size={17} strokeWidth={active ? 2.4 : 2} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-4 rounded-xl border border-base-200 bg-base-50 px-3 py-2.5 text-[11px] leading-relaxed text-base-500">
        Files are never permanently deleted — CleanSpace always uses the Linux Trash and keeps an
        undo history.
      </div>
    </aside>
  );
}
