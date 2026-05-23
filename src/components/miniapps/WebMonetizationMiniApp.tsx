/**
 * WebMonetizationMiniApp — Streaming Micropayments
 * ─────────────────────────────────────────────────
 * يعرض حالة الدفع المتدفق أثناء قراءة المقال:
 *   • مؤشر الدفع الحي (live streaming indicator)
 *   • إجمالي المدفوع في الجلسة الحالية
 *   • معدل الدفع في الدقيقة
 *   • Payment Pointer للكاتب
 */

import { useState, useEffect, useRef } from 'react';
import { MiniAppContainer } from '../MiniAppContainer';
import { useILP } from '../../store/useILP';
import { 
  formatStreamingAmount, 
  formatStreamingRate,
  isWebMonetizationSupported,
  createMonetizationTag,
  removeMonetizationTag,
} from '../../lib/ilp';
import { Radio, Pause, Play, TrendingUp, Wallet, Zap, Clock } from 'lucide-react';

interface WebMonetizationMiniAppProps {
  authorPaymentPointer: string;
  authorName: string;
  articleTitle?: string;
}

export function WebMonetizationMiniApp({ 
  authorPaymentPointer, 
  authorName,
  articleTitle,
}: WebMonetizationMiniAppProps) {
  const { 
    isStreaming, 
    totalEarnedFromStreaming,
    currentSession,
    startStreamingSession,
    updateStreamingTotal,
    endCurrentSession,
  } = useILP();

  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  // Auto-start streaming when component mounts
  useEffect(() => {
    if (!authorPaymentPointer) return;
    
    // Set up Web Monetization meta tag
    createMonetizationTag(authorPaymentPointer);
    
    // Start streaming session
    startStreamingSession(authorPaymentPointer);
    startTimeRef.current = Date.now();

    return () => {
      removeMonetizationTag();
      endCurrentSession();
    };
  }, [authorPaymentPointer]);

  // Update streaming total every second
  useEffect(() => {
    if (isPaused) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      updateStreamingTotal();
      setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPaused, updateStreamingTotal]);

  const togglePause = () => {
    setIsPaused(prev => !prev);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const ratePerSecond = currentSession?.ratePerSecond || 0.001;
  const browserSupported = isWebMonetizationSupported();

  const config = {
    id: 'web-monetization',
    name: 'Web Monetization',
    name_ar: 'الدفع المتدفق',
    icon: '💸',
    type: 'custom' as const,
    verified: true,
  };

  return (
    <MiniAppContainer config={config}>
      <div className="space-y-4">
        {/* Status Indicator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`relative flex items-center justify-center w-8 h-8 rounded-full ${
              isStreaming && !isPaused 
                ? 'bg-accent/20' 
                : 'bg-[var(--color-surface)]'
            }`}>
              <Radio className={`w-4 h-4 ${
                isStreaming && !isPaused ? 'text-accent' : 'text-[var(--color-text-dim)]'
              }`} />
              {isStreaming && !isPaused && (
                <span className="absolute inset-0 rounded-full bg-accent/30 animate-ping" />
              )}
            </div>
            <div>
              <div className="text-[12px] font-semibold">
                {isStreaming && !isPaused ? 'جاري الدفع المتدفق' : isPaused ? 'متوقف مؤقتاً' : 'غير نشط'}
              </div>
              <div className="text-[10px] text-[var(--color-text-dim)] font-mono">
                InterLedger Protocol
              </div>
            </div>
          </div>
          
          <button
            onClick={togglePause}
            className={`p-2 rounded-lg border transition-all cursor-pointer ${
              isPaused 
                ? 'border-accent/40 bg-accent/10 text-accent hover:bg-accent/20' 
                : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-dim)] hover:text-white hover:border-[var(--color-border-bright)]'
            }`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Live Counter */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4 text-center relative overflow-hidden">
          {isStreaming && !isPaused && (
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 animate-pulse" />
          )}
          <div className="relative z-10">
            <div className="text-[10px] font-mono uppercase tracking-[2px] text-[var(--color-text-dim)] mb-2">
              إجمالي الجلسة
            </div>
            <div className="text-[28px] font-serif text-primary tabular-nums">
              {formatStreamingAmount(totalEarnedFromStreaming)}
            </div>
            <div className="flex items-center justify-center gap-3 mt-2 text-[10px] text-[var(--color-text-dim)]">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTime(elapsedTime)}
              </span>
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {formatStreamingRate(ratePerSecond)}
              </span>
            </div>
          </div>
        </div>

        {/* Recipient Info */}
        <div className="flex items-center justify-between py-2 px-3 bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-lg">
          <div className="flex items-center gap-2">
            <Wallet className="w-3.5 h-3.5 text-primary" />
            <div>
              <div className="text-[11px] font-medium">{authorName}</div>
              <div className="text-[9px] font-mono text-[var(--color-text-dim)]">
                {authorPaymentPointer}
              </div>
            </div>
          </div>
          <Zap className="w-3.5 h-3.5 text-accent" />
        </div>

        {/* Info */}
        <div className="text-[10px] text-[var(--color-text-dim)] leading-relaxed text-center space-y-1">
          <p>تُرسل مدفوعات صغيرة تلقائياً أثناء قراءتك عبر بروتوكول InterLedger.</p>
          {!browserSupported && (
            <p className="text-[var(--color-warning)]">
              ⚡ وضع المحاكاة — ثبّت إضافة Web Monetization لتفعيل الدفع الحقيقي
            </p>
          )}
        </div>
      </div>
    </MiniAppContainer>
  );
}
