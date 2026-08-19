import { useEffect } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

interface ModalProps {
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: 'md' | 'lg' | 'xl';
}

const WIDTHS = { md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl' };

export function Modal({
  title,
  description,
  onClose,
  children,
  footer,
  width = 'md'
}: ModalProps): React.JSX.Element {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-base-950/40 px-4 animate-fade-in">
      <div
        className={`animate-slide-up w-full ${WIDTHS[width]} overflow-hidden rounded-2xl border border-base-200 bg-base-0 shadow-floating`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between border-b border-base-100 px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-base-900">{title}</h2>
            {description && <p className="mt-0.5 text-[13px] text-base-500">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-base-400 hover:bg-base-100 hover:text-base-700"
            aria-label="Close dialog"
          >
            <X size={16} />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-base-100 px-5 py-3.5">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
