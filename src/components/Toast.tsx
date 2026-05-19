import { CheckCircle, XCircle, Info, Loader2, X } from 'lucide-react';
import { useToast, type ToastType } from '../store/useToast';

const iconMap: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="w-5 h-5 text-success" />,
  error: <XCircle className="w-5 h-5 text-error" />,
  info: <Info className="w-5 h-5 text-info" />,
  loading: <Loader2 className="w-5 h-5 text-primary animate-spin" />,
};

const borderMap: Record<ToastType, string> = {
  success: 'border-l-[var(--color-success)]',
  error: 'border-l-[var(--color-error)]',
  info: 'border-l-[var(--color-info)]',
  loading: 'border-l-[var(--color-primary)]',
};

export function ToastContainer() {
  const toasts = useToast((s) => s.toasts);
  const dismissToast = useToast((s) => s.dismissToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-24 right-6 z-[100] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            pointer-events-auto
            glass-panel-elevated
            border-l-[3px] ${borderMap[toast.type]}
            p-4 flex items-start gap-3
            ${toast.dismissing ? 'animate-toastOut' : 'animate-toastIn'}
          `}
        >
          <div className="mt-0.5 shrink-0">{iconMap[toast.type]}</div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold text-[var(--color-text-main)] leading-tight">
              {toast.title}
            </div>
            {toast.message && (
              <div className="text-[12px] text-[var(--color-text-dim)] mt-1 leading-relaxed break-all">
                {toast.message}
              </div>
            )}
          </div>
          {toast.type !== 'loading' && (
            <button
              onClick={() => dismissToast(toast.id)}
              className="text-[var(--color-text-dim)] hover:text-white transition-colors cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
