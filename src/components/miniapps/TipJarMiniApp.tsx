/**
 * TipJarMiniApp — Real Payments: Stellar + InterLedger Protocol
 * ──────────────────────────────────────────────────────────────
 * Two payment methods:
 *   • Stellar (XLM): direct on-chain payment via Freighter
 *   • InterLedger (ILP): real Open Payments API via Nalax backend
 *     Uses ILP Testnet wallets (rafiki.money) for cross-network tips
 */

import { useState, useEffect } from 'react';
import { MiniAppContainer } from '../MiniAppContainer';
import { useWallet } from '../../store/useWallet';
import { useToast } from '../../store/useToast';
import {
  sendDirectXLMTip,
  checkILPHealth,
  getILPQuote,
  sendILPTip,
  formatILPAmount,
  ILPQuoteResult,
} from '../../lib/ilp';
import { Heart, Send, Sparkles, Globe, ChevronDown, ExternalLink, Zap, Layers } from 'lucide-react';

const TIP_AMOUNTS_XLM = [1, 5, 10, 25];

type PaymentMethod = 'stellar' | 'ilp';

interface TipJarMiniAppProps {
  recipientName: string;
  recipientAddress: string;
  /** ILP wallet address for the recipient (e.g. https://ilp.rafiki.money/bob) */
  recipientILPWallet?: string;
}

export function TipJarMiniApp({ recipientName, recipientAddress, recipientILPWallet }: TipJarMiniAppProps) {
  const { isConnected, publicKey, provider, refreshBalance } = useWallet();
  const toast = useToast();

  // Quick Wallet signs locally — no extension prompt, no extra confirmation step.
  // This drives the loading toast copy and the helper text under the button.
  const isQuickWallet = provider === 'quick-wallet';

  const [method, setMethod] = useState<PaymentMethod>('stellar');
  const [selectedAmount, setSelectedAmount] = useState(5);
  const [customAmount, setCustomAmount] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [lastILPPaymentId, setLastILPPaymentId] = useState<string | null>(null);
  const [ilpAvailable, setIlpAvailable] = useState(false);
  const [ilpQuote, setIlpQuote] = useState<ILPQuoteResult | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);

  const currentAmount = customAmount ? Number(customAmount) : selectedAmount;

  // Check ILP health on mount
  useEffect(() => {
    checkILPHealth().then(h => setIlpAvailable(h.configured && h.status === 'ok'));
  }, []);

  // Get ILP quote
  useEffect(() => {
    if (method !== 'ilp' || !recipientILPWallet || currentAmount <= 0) { setIlpQuote(null); return; }
    const t = setTimeout(async () => {
      setLoadingQuote(true);
      try {
        const q = await getILPQuote(recipientILPWallet, Math.round(currentAmount * 100).toString(), 'USD', 2);
        setIlpQuote(q);
      } catch { setIlpQuote(null); }
      finally { setLoadingQuote(false); }
    }, 500);
    return () => clearTimeout(t);
  }, [method, currentAmount, recipientILPWallet]);

  const handleTip = async () => {
    if (method === 'stellar') {
      if (!isConnected || !publicKey || currentAmount <= 0) {
        toast.addToast({ type: 'error', title: 'المحفظة مطلوبة', message: 'اربط محفظتك أولاً' });
        return;
      }
      setSending(true);
      const lid = toast.addToast({
        type: 'loading',
        title: 'جاري الإرسال عبر Stellar...',
        message: isQuickWallet ? 'توقيع محلى — بلا انتظار' : 'في انتظار توقيع المحفظة',
      });
      try {
        const result = await sendDirectXLMTip(publicKey, recipientAddress, currentAmount.toString());
        setLastTxHash(result.txHash); setLastILPPaymentId(null);
        toast.updateToast(lid, { type: 'success', title: 'تم إرسال الدعم!', message: `${currentAmount} XLM → TX: ${result.txHash.slice(0, 12)}...` });
        setSent(true); setTimeout(() => { setSent(false); setLastTxHash(null); }, 5000);
      } catch (e: any) {
        toast.updateToast(lid, { type: 'error', title: 'فشل الإرسال', message: e?.message || 'تم رفض المعاملة' });
      } finally { setSending(false); refreshBalance(); }
    } else {
      if (!recipientILPWallet || currentAmount <= 0) {
        toast.addToast({ type: 'error', title: 'ILP Wallet مطلوب', message: 'الكاتب ليس لديه عنوان ILP' });
        return;
      }
      setSending(true);
      const lid = toast.addToast({ type: 'loading', title: 'جاري الإرسال عبر InterLedger...', message: 'Open Payments → ILP STREAM' });
      try {
        const result = await sendILPTip(recipientILPWallet, Math.round(currentAmount * 100).toString(), 'USD', 2, `Tip via Nalax`);
        if (!result.success) throw new Error('Payment failed');
        setLastILPPaymentId(result.paymentId); setLastTxHash(null);
        toast.updateToast(lid, { type: 'success', title: 'تم الإرسال عبر ILP!', message: `$${currentAmount.toFixed(2)} → ${result.receiver.publicName || 'Recipient'}` });
        setSent(true); setTimeout(() => { setSent(false); setLastILPPaymentId(null); }, 5000);
      } catch (e: any) {
        toast.updateToast(lid, { type: 'error', title: 'فشل ILP', message: e?.message || 'فشل التحويل عبر InterLedger' });
      } finally { setSending(false); }
    }
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
        <div className="text-center">
          <p className="text-[13px] text-[var(--color-text-secondary)] mb-1">
            ادعم <span className="text-primary font-semibold">{recipientName}</span>
          </p>
        </div>

        {/* Payment Method Toggle */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg">
          <button onClick={() => { setMethod('stellar'); setSelectedAmount(5); setCustomAmount(''); }}
            className={`py-2 px-3 rounded-md text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${method === 'stellar' ? 'bg-primary text-white shadow-sm' : 'text-[var(--color-text-dim)] hover:text-white'}`}>
            <Layers className="w-3.5 h-3.5" /> Stellar (XLM)
          </button>
          <button onClick={() => { setMethod('ilp'); setSelectedAmount(5); setCustomAmount(''); }}
            disabled={!ilpAvailable}
            className={`py-2 px-3 rounded-md text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${method === 'ilp' ? 'bg-accent text-black shadow-sm' : ilpAvailable ? 'text-[var(--color-text-dim)] hover:text-white' : 'text-[var(--color-text-muted)] opacity-50 cursor-not-allowed'}`}>
            <Globe className="w-3.5 h-3.5" /> InterLedger
          </button>
        </div>

        {/* Amount Buttons */}
        <div className="grid grid-cols-4 gap-2">
          {(method === 'stellar' ? TIP_AMOUNTS_XLM : [1, 5, 10, 25]).map(amount => (
            <button key={amount} onClick={() => { setSelectedAmount(amount); setCustomAmount(''); }}
              className={`py-2.5 rounded-lg text-[13px] font-semibold transition-all cursor-pointer border ${selectedAmount === amount && !customAmount ? (method === 'stellar' ? 'bg-primary text-white border-primary' : 'bg-accent text-black border-accent') : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-primary/40'}`}>
              {method === 'stellar' ? `${amount} XLM` : `$${amount}`}
            </button>
          ))}
        </div>

        {/* Custom Amount */}
        <div className="relative">
          <input type="number" placeholder={method === 'stellar' ? 'مبلغ مخصص بـ XLM...' : 'مبلغ مخصص بـ USD...'} value={customAmount}
            onChange={e => { setCustomAmount(e.target.value); setSelectedAmount(0); }}
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-[13px] outline-none focus:border-primary/50 transition-colors placeholder:text-[var(--color-text-muted)]" />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-mono text-[var(--color-text-muted)]">
            {method === 'stellar' ? 'XLM' : 'USD'}
          </span>
        </div>

        {/* ILP Quote */}
        {method === 'ilp' && currentAmount > 0 && (
          <div className="bg-accent/5 border border-accent/20 rounded-lg p-3 space-y-1.5">
            <div className="flex items-center gap-2 text-[11px] text-accent font-medium">
              <Globe className="w-3.5 h-3.5" /> InterLedger — Open Payments API
            </div>
            {loadingQuote ? (
              <div className="text-[10px] text-[var(--color-text-dim)]">جاري حساب التكلفة...</div>
            ) : ilpQuote ? (
              <>
                <div className="flex justify-between text-[10px]">
                  <span className="text-[var(--color-text-dim)]">سيستلم</span>
                  <span className="font-mono text-accent">${formatILPAmount(ilpQuote.receiveAmount.value, ilpQuote.receiveAmount.assetScale)}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-[var(--color-text-dim)]">رسوم ILP</span>
                  <span className="font-mono">${formatILPAmount(ilpQuote.fee.value, ilpQuote.fee.assetScale)}</span>
                </div>
              </>
            ) : (
              <div className="text-[10px] text-[var(--color-warning)]">{recipientILPWallet ? 'تعذّر جلب السعر' : 'لا يوجد عنوان ILP للكاتب'}</div>
            )}
          </div>
        )}

        {/* Send */}
        <button onClick={handleTip}
          disabled={sending || (method === 'stellar' && !isConnected) || currentAmount <= 0 || (method === 'ilp' && !ilpAvailable)}
          className={`w-full py-3 rounded-lg font-semibold text-[14px] flex items-center justify-center gap-2 transition-all cursor-pointer ${sent ? 'bg-accent text-black' : method === 'stellar' ? 'bg-gradient-to-r from-primary to-primary/80 text-white hover:shadow-[0_0_20px_rgba(108,58,255,0.4)]' : 'bg-gradient-to-r from-accent to-accent/80 text-black hover:shadow-[0_0_20px_rgba(0,255,136,0.4)]'} disabled:opacity-40 disabled:cursor-not-allowed`}>
          {sending ? (<><span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> {method === 'stellar' ? 'Stellar...' : 'ILP...'}</>) : sent ? (<><Sparkles className="w-4 h-4" /> تم! ✨</>) : (<><Send className="w-4 h-4" /> {method === 'stellar' ? `إرسال ${currentAmount} XLM` : `إرسال $${currentAmount.toFixed(2)} عبر ILP`}</>)}
        </button>

        {/* TX Link */}
        {lastTxHash && (
          <div className="text-center">
            <a href={`https://stellar.expert/explorer/testnet/tx/${lastTxHash}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] font-mono text-accent hover:underline">
              <ExternalLink className="w-3 h-3" /> TX: {lastTxHash.slice(0, 16)}...
            </a>
          </div>
        )}
        {lastILPPaymentId && (
          <div className="text-center">
            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-accent">
              <Zap className="w-3 h-3" /> ILP: {lastILPPaymentId.slice(0, 20)}...
            </span>
          </div>
        )}

        {/* Badge */}
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-wider text-[var(--color-text-dim)] bg-[var(--color-surface)] px-2.5 py-1 rounded-full border border-[var(--color-border)]">
            <span className={`w-1.5 h-1.5 rounded-full ${method === 'stellar' ? 'bg-primary' : 'bg-accent'} animate-pulse`} />
            {method === 'stellar' ? 'Stellar Testnet' : 'ILP Testnet — Open Payments'}
            {isQuickWallet && method === 'stellar' && (
              <>
                <span className="text-[var(--color-text-muted)]">·</span>
                <span className="text-[var(--color-accent)]">⚡ توقيع فورى</span>
              </>
            )}
          </span>
        </div>
      </div>
    </MiniAppContainer>
  );
}