import { useState } from 'react';
import { MiniAppContainer } from '../MiniAppContainer';
import { useWallet } from '../../store/useWallet';
import { Heart, Send, Sparkles } from 'lucide-react';

const TIP_AMOUNTS = [1, 5, 10, 25];

interface TipJarMiniAppProps {
  recipientName: string;
  recipientAddress: string;
}

export function TipJarMiniApp({ recipientName, recipientAddress }: TipJarMiniAppProps) {
  const { isConnected } = useWallet();
  const [selectedAmount, setSelectedAmount] = useState(5);
  const [customAmount, setCustomAmount] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [totalTips, setTotalTips] = useState(47);

  const handleTip = async () => {
    if (!isConnected) return;
    setSending(true);
    // Simulate transaction for MVP
    await new Promise(r => setTimeout(r, 1500));
    setSent(true);
    setTotalTips(prev => prev + 1);
    setSending(false);
    setTimeout(() => setSent(false), 3000);
  };

  const config = {
    id: 'tip-jar',
    name: 'Tip Jar',
    name_ar: 'صندوق الدعم',
    icon: '💰',
    type: 'tip-jar' as const,
    verified: true,
  };

  return (
    <MiniAppContainer config={config}>
      <div className="space-y-4">
        {/* Recipient */}
        <div className="text-center">
          <p className="text-[13px] text-[var(--color-text-secondary)] mb-1">
            ادعم <span className="text-primary font-semibold">{recipientName}</span>
          </p>
          <p className="text-[10px] font-mono text-[var(--color-text-muted)]">
            مباشرة إلى محفظته على Stellar
          </p>
        </div>

        {/* Amount Selector */}
        <div className="grid grid-cols-4 gap-2">
          {TIP_AMOUNTS.map(amount => (
            <button
              key={amount}
              onClick={() => { setSelectedAmount(amount); setCustomAmount(''); }}
              className={`py-2.5 rounded-lg text-[14px] font-semibold transition-all duration-200 cursor-pointer border ${
                selectedAmount === amount && !customAmount
                  ? 'bg-primary text-white border-primary shadow-[0_0_15px_rgba(108,58,255,0.3)]'
                  : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-primary/40'
              }`}
            >
              {amount} XLM
            </button>
          ))}
        </div>

        {/* Custom Amount */}
        <div className="relative">
          <input
            type="number"
            placeholder="مبلغ مخصص..."
            value={customAmount}
            onChange={e => { setCustomAmount(e.target.value); setSelectedAmount(0); }}
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-[13px] outline-none focus:border-primary/50 transition-colors placeholder:text-[var(--color-text-muted)]"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-mono text-[var(--color-text-muted)]">
            XLM
          </span>
        </div>

        {/* Send Button */}
        <button
          onClick={handleTip}
          disabled={sending || !isConnected}
          className={`w-full py-3 rounded-lg font-semibold text-[14px] flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer ${
            sent
              ? 'bg-accent text-black'
              : 'bg-gradient-to-r from-primary to-primary/80 text-white hover:shadow-[0_0_25px_rgba(108,58,255,0.4)]'
          } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {sending ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              جاري الإرسال عبر Soroban...
            </>
          ) : sent ? (
            <>
              <Sparkles className="w-4 h-4" />
              تم الإرسال بنجاح! ✨
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              إرسال {customAmount || selectedAmount} XLM
            </>
          )}
        </button>

        {/* Stats */}
        <div className="flex items-center justify-center gap-4 pt-1">
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-dim)]">
            <Heart className="w-3 h-3 text-accent" />
            <span>{totalTips} داعم</span>
          </div>
          <div className="text-[11px] font-mono text-accent">
            234 XLM إجمالي
          </div>
        </div>
      </div>
    </MiniAppContainer>
  );
}
