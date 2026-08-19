import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useToastStore, type Toast } from '@renderer/stores/toastStore';

const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info } as const;
const ACCENTS = {
  success: 'text-safe border-safe/30 bg-safe-bg',
  error: 'text-important border-important/30 bg-important-bg',
  info: 'text-accent-600 border-accent-200 bg-accent-50'
} as const;

function ToastCard({ toast }: { toast: Toast }): React.JSX.Element {
  const dismiss = useToastStore((s) => s.dismiss);
  const Icon = ICONS[toast.type];

  return (
    <div
      role="status"
      className={`animate-slide-up pointer-events-auto flex w-80 items-start gap-2.5 rounded-xl border px-3.5 py-3 shadow-floating ${ACCENTS[toast.type]}`}
    >
      <Icon size={18} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium leading-tight text-base-900">{toast.title}</p>
        {toast.description && (
          <p
            className="mt-0.5 truncate text-xs leading-snug text-base-600"
            title={toast.description}
          >
            {toast.description}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => dismiss(toast.id)}
        className="shrink-0 rounded p-0.5 text-base-400 hover:bg-base-900/5 hover:text-base-700"
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastContainer(): React.JSX.Element {
  const toasts = useToastStore((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} />
      ))}
    </div>
  );
}
