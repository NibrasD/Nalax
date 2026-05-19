import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'loading';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  dismissing?: boolean;
}

interface ToastState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  dismissToast: (id: string) => void;
  updateToast: (id: string, updates: Partial<Toast>) => void;
}

let toastCounter = 0;

export const useToast = create<ToastState>((set, get) => ({
  toasts: [],

  addToast: (toast) => {
    const id = `toast-${++toastCounter}-${Date.now()}`;
    const newToast: Toast = { ...toast, id };

    set((state) => ({
      toasts: [...state.toasts, newToast].slice(-5), // max 5 toasts
    }));

    // Auto-dismiss after duration (default 5s, loading never auto-dismisses)
    if (toast.type !== 'loading') {
      const duration = toast.duration || 5000;
      setTimeout(() => {
        get().dismissToast(id);
      }, duration);
    }

    return id;
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  dismissToast: (id) => {
    // Trigger exit animation first
    set((state) => ({
      toasts: state.toasts.map((t) =>
        t.id === id ? { ...t, dismissing: true } : t
      ),
    }));
    // Remove after animation
    setTimeout(() => {
      get().removeToast(id);
    }, 300);
  },

  updateToast: (id, updates) => {
    set((state) => ({
      toasts: state.toasts.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
    }));

    // If updated to a non-loading type, auto-dismiss
    if (updates.type && updates.type !== 'loading') {
      const duration = updates.duration || 5000;
      setTimeout(() => {
        get().dismissToast(id);
      }, duration);
    }
  },
}));
