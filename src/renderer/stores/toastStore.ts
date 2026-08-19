import { create } from 'zustand';

export interface Toast {
  id: string;
  type: 'info' | 'success' | 'error';
  title: string;
  description?: string;
}

interface ToastState {
  toasts: Toast[];
  push: (toast: Omit<Toast, 'id'>) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (toast) => {
    const id = crypto.randomUUID();
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 6000);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
}));

export function toastError(error: unknown, fallbackTitle = 'Something went wrong'): void {
  const message = error instanceof Error ? error.message : String(error);
  useToastStore.getState().push({ type: 'error', title: fallbackTitle, description: message });
}

export function toastSuccess(title: string, description?: string): void {
  useToastStore.getState().push({ type: 'success', title, description });
}
