/**
 * TipJarMiniApp — Cross-chain Tips via InterLedger Protocol
 * ──────────────────────────────────────────────────────────
 * يدعم:
 *   • إرسال tips بـ XLM (Stellar مباشرة)
 *   • إرسال tips من عملات أخرى عبر ILP (ETH, BTC, XRP, USDC, SOL)
 *   • عرض سعر الصرف المباشر والرسوم
 *   • سجل الإكراميات عبر السلاسل
 */

import { useState } from 'react';
import { MiniAppContainer } from '../MiniAppContainer';
import { useWallet } from '../../store/useWallet';
import { useILP } from '../../store/useILP';
import { 
  SUPPORTED_CURRENCIES, 
  SupportedCurrency, 
  getCrossChainQuote, 
  sendCrossChainTip,
  generatePaymentPointer,
  isValidPaymentPointer,
} from '../../lib/ilp';
import { Heart, Send, Sparkles, ArrowRightLeft, Globe, TrendingUp, ChevronDown } from 'lucide-react';

const TIP_AMOUNTS_XLM = [1, 5, 10, 25];

interface TipJarMiniAppProps {
  recipientName: string;
  recipientAddress: string;
}

export function TipJarMiniApp({ recipientName, recipientAddress }: TipJarMiniAppProps) {
  const { isConnected } = useWallet();
  const { addCrossChainTip } = useILP();
  
  const [selectedAmount, setSelectedAmount] = useState(5);
  const [customAmount, setCustomAmount] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState<SupportedCurrency>('XLM');
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [totalTips, setTotalTips] = useState(47);
  const [lastTipResult, setLastTipResult] = useState<{
    destinationAmount: number;
    sourceCurrency: string;
    sourceAmount: number;
  } | null>(null);

  const currentAmount = customAmount ? Number(customAmount) : selectedAmount;
  const isXLM = selectedCurrency === 'XLM';
  
  // Get cross-chain quote
  const quote = !isXLM && currentAmount > 0
    ? getCrossChainQuote(selectedCurrency, currentAmount, 'XLM')
    : null;

  const recipientPointer = generatePaymentPointer(recipientAddress);

  const handleTip = async () => {
    if (!isConnected || currentAmount <= 0) return;
    setSending(true);

    try {
      if (isXLM) {
        // Direct Stellar tip (existing behavior)
        await new Promise(r => setTimeout(r, 1500));
        setSent(true);
        setTotalTips(prev => prev + 1);
        setLastTipResult(null);
      } else {
        // Cross-chain tip via ILP
        const result = await sendCrossChainTip({
          sourceCurrency: selectedCurrency,
          sourceAmount: currentAmount,
          destinationPointer: recipientPointer,
          destinationCurrency: 'XLM',
        });

        if (result.success) {
          addCrossChainTip(result);
          setSent(true);
          setTotalTips(prev => prev + 1);
          setLastTipResult({
            destinationAmount: result.destinationAmount,
            sourceCurrency: result.sourceCurrency,
            sourceAmount: result.sourceAmount,
          });
        }
      }
    } catch (error) {
      console.error('Tip failed:', error);
    } finally {
      setSending(false);
      setTimeout(() => {
        setSent(false);
        setLastTipResult(null);
      }, 4000);
    }
  };

  const currentCurrencyInfo = SUPPORTED_CURRENCIES.find(c => c.code === selectedCurrency);

  const config = {
    id: 'tip-jar',
    name: 'Cross-chain Tips',
    name_ar: 'إكراميات عابرة للسلاسل',
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
          <p className="text-[10px] font-mono text-[var(--color-text-muted)] flex items-center justify-center gap-1">
            <Globe className="w-3 h-3" />
            أرسل من أي عملة عبر InterLedger
          </p>
        </div>

        {/* Currency Selector */}
        <div className="relative">
          <button
            onClick={() => setShowCurrencyPicker(!showCurrencyPicker)}
            className="w-full flex items-center justify-between px-3 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[13px] hover:border-primary/40 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="text-[16px]">{currentCurrencyInfo?.icon}</span>
              <span className="font-medium">{currentCurrencyInfo?.name}</span>
              <span className="text-[10px] font-mono text-[var(--color-text-dim)] bg-[var(--color-bg-base)] px-1.5 py-0.5 rounded">
                {currentCurrencyInfo?.network}
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-[var(--color-text-dim)] transition-transform ${showCurrencyPicker ? 'rotate-180' : ''}`} />
          </button>

          {showCurrencyPicker && (
            <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg shadow-xl overflow-hidden">
              {SUPPORTED_CURRENCIES.map(currency => (
                <button
                  key={currency.code}
                  onClick={() => {
                    setSelectedCurrency(currency.code as SupportedCurrency);
                    setShowCurrencyPicker(false);
                    setCustomAmount('');
                    setSelectedAmount(currency.code === 'XLM' ? 5 : currency.code === 'ETH' ? 0.001 : 1);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-[12px] hover:bg-primary/10 transition-colors cursor-pointer ${
                    selectedCurrency === currency.code ? 'bg-primary/5 text-primary' : ''
                  }`}
                >
                  <span className="text-[16px]">{currency.icon}</span>
                  <span className="font-medium flex-1 text-right">{currency.name}</span>
                  <span className="font-mono text-[10px] text-[var(--color-text-dim)]">{currency.code}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Amount Selector (for XLM) */}
        {isXLM && (
          <div className="grid grid-cols-4 gap-2">
            {TIP_AMOUNTS_XLM.map(amount => (
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
        )}

        {/* Custom Amount */}
        <div className="relative">
          <input
            type="number"
            placeholder={isXLM ? 'مبلغ مخصص...' : `المبلغ بـ ${selectedCurrency}...`}
            value={customAmount}
            onChange={e => { setCustomAmount(e.target.value); setSelectedAmount(0); }}
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-[13px] outline-none focus:border-primary/50 transition-colors placeholder:text-[var(--color-text-muted)]"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-mono text-[var(--color-text-muted)]">
            {selectedCurrency}
          </span>
        </div>

        {/* Cross-chain Quote */}
        {quote && currentAmount > 0 && (
          <div className="bg-accent/5 border border-accent/20 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-[11px] text-accent font-medium">
              <ArrowRightLeft className="w-3.5 h-3.5" />
              تحويل عبر InterLedger
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[var(--color-text-dim)]">سيستلم الكاتب</span>
              <span className="font-mono font-semibold text-primary">
                {quote.destinationAmount.toLocaleString()} XLM
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-[var(--color-text-dim)]">
              <span>سعر الصرف</span>
              <span className="font-mono">1 {selectedCurrency} = {quote.rate.toLocaleString()} XLM</span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-[var(--color-text-dim)]">
              <span>رسوم ILP</span>
              <span className="font-mono">{quote.fee} XLM (0.1%)</span>
            </div>
          </div>
        )}

        {/* Send Button */}
        <button
          onClick={handleTip}
          disabled={sending || !isConnected || currentAmount <= 0}
          className={`w-full py-3 rounded-lg font-semibold text-[14px] flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer ${
            sent
              ? 'bg-accent text-black'
              : 'bg-gradient-to-r from-primary to-primary/80 text-white hover:shadow-[0_0_25px_rgba(108,58,255,0.4)]'
          } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {sending ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {isXLM ? 'جاري الإرسال عبر Soroban...' : `جاري التحويل عبر ILP...`}
            </>
          ) : sent ? (
            <>
              <Sparkles className="w-4 h-4" />
              {lastTipResult 
                ? `✨ تم! ${lastTipResult.sourceAmount} ${lastTipResult.sourceCurrency} → ${lastTipResult.destinationAmount.toFixed(2)} XLM`
                : 'تم الإرسال بنجاح! ✨'
              }
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              {isXLM 
                ? `إرسال ${currentAmount} XLM`
                : `إرسال ${currentAmount} ${selectedCurrency}`
              }
              {!isXLM && <Globe className="w-3.5 h-3.5 mr-1 opacity-60" />}
            </>
          )}
        </button>

        {/* Stats */}
        <div className="flex items-center justify-center gap-4 pt-1">
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-dim)]">
            <Heart className="w-3 h-3 text-accent" />
            <span>{totalTips} داعم</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-accent">
            <TrendingUp className="w-3 h-3" />
            234 XLM إجمالي
          </div>
        </div>

        {/* ILP Badge */}
        {!isXLM && (
          <div className="text-center pt-1">
            <span className="inline-flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-wider text-[var(--color-text-dim)] bg-[var(--color-surface)] px-2.5 py-1 rounded-full border border-[var(--color-border)]">
              <Globe className="w-2.5 h-2.5" />
              Powered by InterLedger Protocol
            </span>
          </div>
        )}
      </div>
    </MiniAppContainer>
  );
}
