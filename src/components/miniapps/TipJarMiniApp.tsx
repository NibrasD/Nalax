/**
 * TipJarMiniApp — Real Stellar Payments + Path Payments
 * ──────────────────────────────────────────────────────
 * تنفيذ حقيقي:
 *   • XLM Tips: دفع حقيقي مباشر عبر Stellar (Operation.payment)
 *   • Cross-chain: Stellar Path Payment (DEX swap) - يحوّل أي أصل → XLM
 *   • يستخدم Freighter للتوقيع على المعاملات الحقيقية
 */

import { useState } from 'react';
import { MiniAppContainer } from '../MiniAppContainer';
import { useWallet } from '../../store/useWallet';
import { useToast } from '../../store/useToast';
import {
  STELLAR_ASSETS,
  SupportedAssetCode,
  sendDirectXLMTip,
  sendCrossChainTip,
  getLiveExchangeRate,
} from '../../lib/ilp';
import { Heart, Send, Sparkles, ArrowRightLeft, Globe, TrendingUp, ChevronDown, ExternalLink } from 'lucide-react';

const TIP_AMOUNTS_XLM = [1, 5, 10, 25];

interface TipJarMiniAppProps {
  recipientName: string;
  recipientAddress: string;
}

export function TipJarMiniApp({ recipientName, recipientAddress }: TipJarMiniAppProps) {
  const { isConnected, publicKey, refreshBalance } = useWallet();
  const toast = useToast();

  const [selectedAmount, setSelectedAmount] = useState(5);
  const [customAmount, setCustomAmount] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<SupportedAssetCode>('XLM');
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [loadingRate, setLoadingRate] = useState(false);

  const currentAmount = customAmount ? Number(customAmount) : selectedAmount;
  const isXLM = selectedAsset === 'XLM';
  const currentAssetInfo = STELLAR_ASSETS.find(a => a.code === selectedAsset);

  // Fetch live rate when selecting non-XLM asset
  const fetchRate = async (assetCode: string) => {
    const asset = STELLAR_ASSETS.find(a => a.code === assetCode);
    if (!asset || asset.isNative) {
      setExchangeRate(null);
      return;
    }
    setLoadingRate(true);
    try {
      const result = await getLiveExchangeRate(asset.code, asset.issuer);
      setExchangeRate(result.available ? result.rate : null);
    } catch {
      setExchangeRate(null);
    } finally {
      setLoadingRate(false);
    }
  };

  const handleTip = async () => {
    if (!isConnected || !publicKey || currentAmount <= 0) {
      toast.addToast({ type: 'error', title: 'المحفظة مطلوبة', message: 'اربط محفظتك أولاً' });
      return;
    }

    setSending(true);
    const loadingId = toast.addToast({
      type: 'loading',
      title: isXLM ? 'جاري إرسال الدعم...' : 'جاري التحويل عبر Stellar DEX...',
      message: 'في انتظار توقيع المحفظة',
    });

    try {
      if (isXLM) {
        // Real XLM payment
        const result = await sendDirectXLMTip(
          publicKey,
          recipientAddress,
          currentAmount.toString(),
        );
        setLastTxHash(result.txHash);
        toast.updateToast(loadingId, {
          type: 'success',
          title: 'تم إرسال الدعم!',
          message: `${currentAmount} XLM → TX: ${result.txHash.slice(0, 12)}...`,
        });
      } else {
        // Real path payment (cross-asset via DEX)
        const asset = STELLAR_ASSETS.find(a => a.code === selectedAsset);
        if (!asset || asset.isNative) throw new Error('Invalid asset');

        const result = await sendCrossChainTip({
          senderPublicKey: publicKey,
          destinationAddress: recipientAddress,
          destinationAmountXLM: currentAmount.toString(),
          sourceAssetCode: asset.code,
          sourceAssetIssuer: asset.issuer!,
          maxSourceAmount: (currentAmount * 1.05).toString(), // 5% slippage
        });
        setLastTxHash(result.txHash);
        toast.updateToast(loadingId, {
          type: 'success',
          title: 'تم التحويل عبر DEX!',
          message: `${result.sourceAmount} ${result.sourceCurrency} → ${result.destinationAmount} XLM`,
        });
      }

      setSent(true);
      setTimeout(() => {
        setSent(false);
        setLastTxHash(null);
      }, 5000);
    } catch (error: any) {
      console.error('Tip failed:', error);
      toast.updateToast(loadingId, {
        type: 'error',
        title: 'فشل الإرسال',
        message: error?.message || 'تم رفض المعاملة أو فشلت',
      });
    } finally {
      setSending(false);
      refreshBalance();
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
        {/* Recipient */}
        <div className="text-center">
          <p className="text-[13px] text-[var(--color-text-secondary)] mb-1">
            ادعم <span className="text-primary font-semibold">{recipientName}</span>
          </p>
          <p className="text-[10px] font-mono text-[var(--color-text-muted)] flex items-center justify-center gap-1">
            <Globe className="w-3 h-3" />
            دفع حقيقي عبر شبكة Stellar
          </p>
        </div>

        {/* Asset Selector */}
        <div className="relative">
          <button
            onClick={() => setShowAssetPicker(!showAssetPicker)}
            className="w-full flex items-center justify-between px-3 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[13px] hover:border-primary/40 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="text-[16px]">{currentAssetInfo?.icon}</span>
              <span className="font-medium">{currentAssetInfo?.name}</span>
              {!isXLM && (
                <span className="text-[9px] font-mono text-accent bg-accent/10 px-1.5 py-0.5 rounded">
                  Path Payment
                </span>
              )}
            </div>
            <ChevronDown className={`w-4 h-4 text-[var(--color-text-dim)] transition-transform ${showAssetPicker ? 'rotate-180' : ''}`} />
          </button>

          {showAssetPicker && (
            <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg shadow-xl overflow-hidden">
              {STELLAR_ASSETS.map(asset => (
                <button
                  key={asset.code}
                  onClick={() => {
                    setSelectedAsset(asset.code as SupportedAssetCode);
                    setShowAssetPicker(false);
                    setCustomAmount('');
                    setSelectedAmount(5);
                    if (!asset.isNative) fetchRate(asset.code);
                    else setExchangeRate(null);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-[12px] hover:bg-primary/10 transition-colors cursor-pointer ${
                    selectedAsset === asset.code ? 'bg-primary/5 text-primary' : ''
                  }`}
                >
                  <span className="text-[16px]">{asset.icon}</span>
                  <span className="font-medium flex-1 text-right">{asset.name}</span>
                  <span className="font-mono text-[10px] text-[var(--color-text-dim)]">
                    {asset.isNative ? 'Native' : 'DEX Swap'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick Amount Buttons (XLM) */}
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
            placeholder={isXLM ? 'مبلغ مخصص بـ XLM...' : `مبلغ XLM المطلوب استلامه...`}
            value={customAmount}
            onChange={e => { setCustomAmount(e.target.value); setSelectedAmount(0); }}
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-[13px] outline-none focus:border-primary/50 transition-colors placeholder:text-[var(--color-text-muted)]"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-mono text-[var(--color-text-muted)]">
            XLM
          </span>
        </div>

        {/* Path Payment Info */}
        {!isXLM && (
          <div className="bg-accent/5 border border-accent/20 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-[11px] text-accent font-medium">
              <ArrowRightLeft className="w-3.5 h-3.5" />
              Stellar Path Payment (DEX)
            </div>
            <div className="text-[10px] text-[var(--color-text-dim)] leading-relaxed">
              سيتم تحويل {currentAssetInfo?.code} → XLM عبر Stellar DEX تلقائياً.
              المعاملة حقيقية على شبكة Stellar Testnet.
            </div>
            {loadingRate && (
              <div className="text-[10px] text-[var(--color-text-dim)]">جاري جلب السعر...</div>
            )}
            {exchangeRate !== null && !loadingRate && (
              <div className="flex items-center justify-between text-[10px] text-[var(--color-text-dim)]">
                <span>سعر السوق</span>
                <span className="font-mono">1 {selectedAsset} ≈ {(1/exchangeRate).toFixed(4)} XLM</span>
              </div>
            )}
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
              {isXLM ? 'جاري الإرسال...' : 'جاري التحويل عبر DEX...'}
            </>
          ) : sent ? (
            <>
              <Sparkles className="w-4 h-4" />
              تم الإرسال بنجاح! ✨
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              {isXLM
                ? `إرسال ${currentAmount} XLM`
                : `تحويل ${selectedAsset} → ${currentAmount} XLM`
              }
            </>
          )}
        </button>

        {/* TX Hash */}
        {lastTxHash && (
          <div className="text-center">
            <a
              href={`https://stellar.expert/explorer/testnet/tx/${lastTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] font-mono text-accent hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              TX: {lastTxHash.slice(0, 16)}...
            </a>
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center justify-center gap-4 pt-1">
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-dim)]">
            <Heart className="w-3 h-3 text-accent" />
            <span>دفع حقيقي على Stellar</span>
          </div>
        </div>

        {/* Network Badge */}
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-wider text-[var(--color-text-dim)] bg-[var(--color-surface)] px-2.5 py-1 rounded-full border border-[var(--color-border)]">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            Stellar Testnet — Real Transactions
          </span>
        </div>
      </div>
    </MiniAppContainer>
  );
}
