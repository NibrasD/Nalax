/**
 * WebMonetizationMiniApp — Real Web Monetization
 * ────────────────────────────────────────────────
 * يستخدم الـ Web Monetization API الحقيقي:
 *   • يضيف `<link rel="monetization">` في head الصفحة
 *   • يستمع لأحداث `monetization` الحقيقية من المتصفح
 *   • يعرض المدفوعات الحقيقية المستلَمة
 *   • يدعم إضافة Web Monetization الرسمية من InterLedger
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { MiniAppContainer } from '../MiniAppContainer';
import {
  isWebMonetizationSupported,
  subscribeToMonetization,
  formatStreamingAmount,
  formatStreamingRate,
  MonetizationPayment,
  createStreamingSession,
  addPaymentToSession,
  endStreamingSession,
  getSessionDuration,
  StreamingSession,
} from '../../lib/ilp';
import { Radio, Pause, Play, TrendingUp, Wallet, Zap, Clock, ExternalLink } from 'lucide-react';

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
  const [session, setSession] = useState<StreamingSession | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [hasExtension, setHasExtension] = useState(false);
  // Auto-pause when the tab is hidden (background) so the reader is not
  // charged while looking at another tab/window.
  const [isHidden, setIsHidden] = useState(
    typeof document !== 'undefined' && document.visibilityState === 'hidden'
  );
  const cleanupRef = useRef<(() => void) | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check for Web Monetization support
  useEffect(() => {
    setHasExtension(isWebMonetizationSupported());
  }, []);

  // Track tab visibility via the Page Visibility API.
  // When the tab goes to the background, we tear down the monetization
  // subscription (removing <link rel="monetization">) so the browser
  // extension stops streaming payments. Reader is not on the page → no charge.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handleVisibilityChange = () => {
      setIsHidden(document.visibilityState === 'hidden');
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Create / dispose the streaming session once per article.
  // Kept separate from the subscription effect below so totals/elapsed time
  // are preserved across pause / tab-switch cycles.
  useEffect(() => {
    if (!authorPaymentPointer) return;
    setSession(createStreamingSession(authorPaymentPointer));
    setElapsedTime(0);
    return () => {
      setSession(prev => (prev ? endStreamingSession(prev) : null));
    };
  }, [authorPaymentPointer]);

  // Subscribe to real Web Monetization events.
  // Active only when:
  //   • there is a wallet address
  //   • the user did not manually pause
  //   • the tab is currently visible (Page Visibility API)
  // Any of these flipping causes the cleanup to run, which removes the
  // <link rel="monetization"> tag and stops the elapsed-time counter.
  useEffect(() => {
    if (isPaused || isHidden || !authorPaymentPointer) return;

    const cleanup = subscribeToMonetization(
      authorPaymentPointer,
      (payment: MonetizationPayment) => {
        // Real payment received from the browser extension
        setSession(prev => (prev ? addPaymentToSession(prev, payment) : prev));
      },
      () => setIsActive(true),
      () => setIsActive(false),
    );
    cleanupRef.current = cleanup;

    // Timer only ticks while monetization is actually live, so the
    // XLM/min rate stays accurate.
    timerRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => {
      cleanup();
      cleanupRef.current = null;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setIsActive(false);
    };
  }, [authorPaymentPointer, isPaused, isHidden]);

  const togglePause = useCallback(() => {
    setIsPaused(prev => !prev);
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const totalReceived = session?.totalReceived || 0;
  const currency = session?.currency || 'USD';
  const paymentCount = session?.payments.length || 0;

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
              isActive && !isPaused && !isHidden
                ? 'bg-accent/20'
                : 'bg-[var(--color-surface)]'
            }`}>
              <Radio className={`w-4 h-4 ${
                isActive && !isPaused && !isHidden ? 'text-accent' : 'text-[var(--color-text-dim)]'
              }`} />
              {isActive && !isPaused && !isHidden && (
                <span className="absolute inset-0 rounded-full bg-accent/30 animate-ping" />
              )}
            </div>
            <div>
              <div className="text-[12px] font-semibold">
                {isPaused
                  ? 'متوقف مؤقتاً'
                  : isHidden
                    ? 'متوقف — التبويب فى الخلفية'
                    : isActive
                      ? 'دفع متدفق نشط'
                      : hasExtension
                        ? 'في انتظار الدفع...'
                        : 'الإضافة غير مثبتة'}
              </div>
              <div className="text-[10px] text-[var(--color-text-dim)] font-mono">
                Web Monetization API
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

        {/* Payment Counter */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4 text-center relative overflow-hidden">
          {isActive && !isPaused && !isHidden && (
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 animate-pulse" />
          )}
          <div className="relative z-10">
            <div className="text-[10px] font-mono uppercase tracking-[2px] text-[var(--color-text-dim)] mb-2">
              المدفوعات المستلَمة
            </div>
            <div className="text-[28px] font-serif text-primary tabular-nums">
              {formatStreamingAmount(totalReceived, currency)}
            </div>
            <div className="flex items-center justify-center gap-3 mt-2 text-[10px] text-[var(--color-text-dim)]">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTime(elapsedTime)}
              </span>
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {paymentCount} عملية
              </span>
              {totalReceived > 0 && elapsedTime > 0 && (
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  {formatStreamingRate(totalReceived, elapsedTime, currency)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Recipient Info */}
        <div className="flex items-center justify-between py-2 px-3 bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-lg">
          <div className="flex items-center gap-2">
            <Wallet className="w-3.5 h-3.5 text-primary" />
            <div>
              <div className="text-[11px] font-medium">{authorName}</div>
              <div className="text-[9px] font-mono text-[var(--color-text-dim)] truncate max-w-[180px]">
                {authorPaymentPointer}
              </div>
            </div>
          </div>
          <Zap className="w-3.5 h-3.5 text-accent" />
        </div>

        {/* Info / Extension Notice */}
        <div className="text-[10px] text-[var(--color-text-dim)] leading-relaxed text-center space-y-2">
          {hasExtension ? (
            <p className="text-accent">
              ✅ إضافة Web Monetization مُفعّلة — المدفوعات تُرسل تلقائياً أثناء القراءة
            </p>
          ) : (
            <>
              <p>
                ثبّت إضافة Web Monetization للدفع التلقائي أثناء القراءة عبر InterLedger.
              </p>
              <a
                href="https://webmonetization.org/docs/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                تعرّف على Web Monetization
              </a>
            </>
          )}
        </div>
      </div>
    </MiniAppContainer>
  );
}
