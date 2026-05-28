import { CheckCircle, Loader2, FileText, Shield, Hash, UploadCloud, UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PublishModalProps {
  isOpen: boolean;
  currentStep: number;
  title: string;
  error?: string | null;
  txHash?: string | null;
  onClose: () => void;
}

export function PublishModal({ isOpen, currentStep, title, error, txHash, onClose }: PublishModalProps) {
  const { t } = useTranslation();

  const PUBLISH_STEPS = [
    {
      label: t('publish_modal.steps.ipfs_label'),
      description: t('publish_modal.steps.ipfs_desc'),
      icon: <UploadCloud className="w-5 h-5" />,
    },
    {
      label: t('publish_modal.steps.register_label'),
      description: t('publish_modal.steps.register_desc'),
      icon: <UserPlus className="w-5 h-5" />,
    },
    {
      label: t('publish_modal.steps.nft_label'),
      description: t('publish_modal.steps.nft_desc'),
      icon: <FileText className="w-5 h-5" />,
    },
    {
      label: t('publish_modal.steps.sign_label'),
      description: t('publish_modal.steps.sign_desc'),
      icon: <Shield className="w-5 h-5" />,
    },
    {
      label: t('publish_modal.steps.confirm_label'),
      description: t('publish_modal.steps.confirm_desc'),
      icon: <CheckCircle className="w-5 h-5" />,
    },
  ];

  if (!isOpen) return null;

  const isComplete = currentStep >= PUBLISH_STEPS.length;
  const isFailed = !!error;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={isComplete || isFailed ? onClose : undefined} />
      
      {/* Modal */}
      <div className="relative glass-panel-elevated w-full max-w-md p-8 animate-slideUp">
        {/* Header */}
        <div className="text-center mb-8">
          <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
            isFailed ? 'bg-[var(--color-error)]/10 border border-[var(--color-error)]/30' :
            isComplete ? 'bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30' :
            'bg-primary/10 border border-primary/30'
          }`}>
            {isFailed ? (
              <span className="text-[var(--color-error)] text-2xl">✕</span>
            ) : isComplete ? (
              <CheckCircle className="w-7 h-7 text-accent" />
            ) : (
              <Loader2 className="w-7 h-7 text-primary animate-spin" />
            )}
          </div>
          
          <h3 className="text-xl font-serif mb-1">
            {isFailed
              ? t('publish_modal.failed')
              : isComplete
              ? t('publish_modal.published')
              : t('publish_modal.publishing')}
          </h3>
          <p className="text-[13px] text-[var(--color-text-dim)] font-mono truncate max-w-[300px] mx-auto">
            {title || t('publish_modal.untitled')}
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-3 mb-8">
          {PUBLISH_STEPS.map((step, i) => {
            const isActive = i === currentStep && !isFailed;
            const isDone = i < currentStep || isComplete;

            return (
              <div
                key={i}
                className={`flex items-center gap-3 p-3 rounded-sm transition-all duration-300 ${
                  isActive ? 'bg-primary/5 border border-primary/20' :
                  isDone ? 'bg-[var(--color-accent)]/5 border border-transparent' :
                  'border border-transparent opacity-40'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  isDone ? 'bg-accent/20 text-accent' :
                  isActive ? 'bg-primary/20 text-primary' :
                  'bg-white/5 text-[var(--color-text-muted)]'
                }`}>
                  {isDone ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : isActive ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    step.icon
                  )}
                </div>
                <div>
                  <div className={`text-[12px] font-medium ${isDone ? 'text-accent' : isActive ? 'text-white' : 'text-[var(--color-text-dim)]'}`}>
                    {step.label}
                  </div>
                  <div className="text-[10px] text-[var(--color-text-dim)]">
                    {step.description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Error */}
        {isFailed && (
          <div className="p-3 bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 rounded-sm mb-4">
            <p className="text-[12px] text-[var(--color-error)] font-mono break-all">{error}</p>
          </div>
        )}

        {/* TX Hash */}
        {txHash && (
          <div className="p-3 bg-[var(--color-accent)]/5 border border-[var(--color-accent)]/20 rounded-sm mb-4">
            <div className="text-[10px] font-mono text-[var(--color-text-dim)] uppercase tracking-wider mb-1">
              {t('publish_modal.tx_hash_label')}
            </div>
            <p className="text-[11px] text-accent font-mono break-all">{txHash}</p>
          </div>
        )}

        {/* Actions */}
        {(isComplete || isFailed) && (
          <button
            onClick={onClose}
            className={`w-full py-3 font-semibold text-[12px] uppercase tracking-[1.5px] cursor-pointer transition-all rounded-sm ${
              isComplete ? 'btn-accent' : 'btn-outline'
            }`}
          >
            {isComplete ? t('publish_modal.view_article') : t('publish_modal.close')}
          </button>
        )}
      </div>
    </div>
  );
}
