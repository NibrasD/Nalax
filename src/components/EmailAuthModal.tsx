/**
 * EmailAuthModal — تسجيل دخول حقيقي عبر Privy
 * ──────────────────────────────────────────────
 *   1. useLoginWithEmail().sendCode({ email })  → Privy يرسل OTP
 *   2. useLoginWithEmail().loginWithCode({ code })
 *   3. useCreateWallet().createWallet({ chainType: 'stellar' })
 *
 * يتعامل بأمان مع حالات:
 *   - Privy ينشئ ETH تلقائياً (لو الإعداد لم يُعطّله)
 *   - createWallet لا يدعم Stellar (يُظهر خطأ واضح)
 *   - تأخر تحديث useWallets بعد الإنشاء (يستمع للتغيرات)
 */

import { useState, useRef, useEffect } from 'react';
import {
  Mail,
  Key,
  Loader2,
  X,
  CheckCircle,
  Wallet,
  Shield,
  AlertTriangle,
  AlertCircle,
} from 'lucide-react';
import {
  useLoginWithEmail,
  usePrivy,
  useCreateWallet,
  useWallets,
  useLogout,
} from '../lib/privy';
import { useWallet } from '../store/useWallet';
import { findStellarWallet, debugWallets, isStellarAddress } from '../lib/privy-stellar';

interface EmailAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'email' | 'otp' | 'creating-wallet' | 'success' | 'wallet-error';

export function EmailAuthModal({ isOpen, onClose }: EmailAuthModalProps) {
  const { authenticated, ready } = usePrivy();
  const { sendCode, loginWithCode, state } = useLoginWithEmail();
  const { createWallet } = useCreateWallet();
  const { wallets } = useWallets();
  const { logout: privyLogout } = useLogout();
  const connectWithPrivy = useWallet((s) => s.connectWithPrivy);

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [step, setStep] = useState<Step>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stellarAddress, setStellarAddress] = useState<string | null>(null);
  const [hasTriedCreate, setHasTriedCreate] = useState(false);
  const [errorKind, setErrorKind] = useState<'already-has-wallet' | 'generic' | null>(null);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const otpLength = 6;

  // ── إعادة تعيين الحالة عند الفتح/الإغلاق ─────────────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      setStep('email');
      setEmail('');
      setOtp(Array(otpLength).fill(''));
      setError(null);
      setErrorKind(null);
      setLoading(false);
      setStellarAddress(null);
      setHasTriedCreate(false);
    }
  }, [isOpen]);

  // ── متابعة المحافظ — يطبع ما يجده في كل تحديث ───────────────────────────────
  useEffect(() => {
    if (authenticated) debugWallets(wallets, 'EmailAuthModal');
  }, [wallets, authenticated]);

  // ── بعد تسجيل الدخول → ابحث عن Stellar أو أنشئها ────────────────────────────
  useEffect(() => {
    if (!authenticated || !ready) return;
    if (step !== 'otp' && step !== 'creating-wallet') return;

    // 1) محفظة Stellar موجودة؟ → جاهز
    const existing = findStellarWallet(wallets);
    if (existing && isStellarAddress(existing.address)) {
      handleStellarReady(existing.address);
      return;
    }

    // 2) لم نحاول الإنشاء بعد؟ → جرّب
    if (!hasTriedCreate) {
      setHasTriedCreate(true);
      setStep('creating-wallet');
      (async () => {
        try {
          // محاولة إنشاء محفظة Stellar صراحة
          const result: any = await createWallet({ chainType: 'stellar' as any } as any);
          console.info('[privy] createWallet result:', result);
          // قد ترجع المحفظة في result أو في result.wallet أو يتم تحديث useWallets فقط
          const addr = result?.address || result?.wallet?.address;
          if (isStellarAddress(addr)) {
            handleStellarReady(addr);
            return;
          }
          // العنوان ليس Stellar → ربما تأخر التحديث، ننتظر useEffect الـ wallets
          console.warn(
            '[privy] createWallet أرجع عنوان غير Stellar:',
            addr,
            '\nسننتظر تحديث useWallets...'
          );
        } catch (e: any) {
          console.error('[privy] createWallet error:', e);
          setStep('wallet-error');

          const msg = String(e?.message || '').toLowerCase();
          if (msg.includes('already has') || msg.includes('embedded wallet')) {
            // المشكلة الشائعة: Privy أنشأ ETH بالفعل ويرفض إنشاء Stellar
            setErrorKind('already-has-wallet');
            setError(
              'لديك محفظة Ethereum أُنشئت تلقائياً عند أول تسجيل دخول، ' +
              'وPrivy يرفض إنشاء محفظة Stellar إضافية. ' +
              'اضغط "تسجيل خروج وإعادة المحاولة" لتنظيف الجلسة.'
            );
          } else {
            setErrorKind('generic');
            setError(
              e?.message ||
                'فشل إنشاء محفظة Stellar. ربما إصدار Privy SDK لا يدعم Stellar مباشرة، أو الميزة معطّلة في تطبيقك على Privy Dashboard.'
            );
          }
        }
      })();
    }
  }, [authenticated, ready, wallets, step, hasTriedCreate]);

  // ── انتظار تحديث wallets بعد createWallet ───────────────────────────────────
  useEffect(() => {
    if (step !== 'creating-wallet') return;
    const stellar = findStellarWallet(wallets);
    if (stellar?.address && isStellarAddress(stellar.address)) {
      handleStellarReady(stellar.address);
    }
  }, [wallets, step]);

  // ── timeout لإظهار خطأ لو لم تُنشأ المحفظة خلال 10 ثوان ────────────────────
  useEffect(() => {
    if (step !== 'creating-wallet') return;
    const timer = setTimeout(() => {
      const stellar = findStellarWallet(wallets);
      if (!stellar) {
        setStep('wallet-error');
        setError(
          'انتهت المهلة المحدّدة دون إنشاء محفظة Stellar. ' +
          'تحقق من Privy Dashboard أن Stellar مفعّلة (Tier 2) لتطبيقك.'
        );
      }
    }, 10000);
    return () => clearTimeout(timer);
  }, [step, wallets]);

  function handleStellarReady(address: string) {
    setStellarAddress(address);
    setStep('success');
    connectWithPrivy(address);

    // تمويل تلقائي من Friendbot على testnet
    fetch(`https://friendbot.stellar.org?addr=${address}`)
      .then(() => console.info(`✅ محفظة جديدة مُموَّلة: ${address}`))
      .catch(() => {
        // متوقع لو الحساب مُموَّل سابقاً
      });

    setTimeout(() => onClose(), 2200);
  }

  if (!isOpen) return null;

  const hasAppId = !!import.meta.env.VITE_PRIVY_APP_ID &&
                   import.meta.env.VITE_PRIVY_APP_ID !== 'your_privy_app_id_here';

  // ── معالجات الأحداث ─────────────────────────────────────────────────────────
  const handleSendCode = async () => {
    setError(null);
    if (!email.trim() || !email.includes('@')) {
      setError('أدخل بريداً إلكترونياً صحيحاً');
      return;
    }
    setLoading(true);
    try {
      await sendCode({ email: email.trim().toLowerCase() });
      setStep('otp');
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (e: any) {
      console.error('sendCode error:', e);
      setError(e?.message || 'تعذّر إرسال رمز التحقق.');
    } finally {
      setLoading(false);
    }
  };

  const handleOTPInput = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < otpLength - 1) otpRefs.current[index + 1]?.focus();
    if (newOtp.slice(0, otpLength).every((d) => d !== '')) {
      handleVerifyOTP(newOtp.slice(0, otpLength).join(''));
    }
  };

  const handleOTPKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async (codeOverride?: string) => {
    const code = (codeOverride ?? otp.slice(0, otpLength).join('')).trim();
    if (code.length !== otpLength) return;
    setError(null);
    setLoading(true);
    try {
      await loginWithCode({ code });
    } catch (e: any) {
      console.error('loginWithCode error:', e);
      setError(e?.message || 'الرمز غير صحيح. حاول مجدداً.');
      setOtp(Array(otpLength).fill(''));
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } finally {
      setLoading(false);
    }
  };

  const isSending = state.status === 'sending-code' || loading;
  const isSubmitting = state.status === 'submitting-code' || loading;

  // ── UI ──────────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-md"
        onClick={
          step !== 'success' && step !== 'creating-wallet' ? onClose : undefined
        }
      />

      <div className="relative glass-panel-elevated w-full max-w-sm p-8 animate-slideUp">
        {step !== 'success' && step !== 'creating-wallet' && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-[var(--color-text-muted)] hover:text-white transition-colors cursor-pointer p-1"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {!hasAppId && step === 'email' && (
          <div className="mb-5 p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
            <div className="text-[11px] text-yellow-200 leading-relaxed">
              <strong>VITE_PRIVY_APP_ID</strong> غير مضبوط. أضِفه في{' '}
              <code className="bg-black/40 px-1 rounded">.env.local</code> من{' '}
              <a href="https://dashboard.privy.io" target="_blank" rel="noreferrer"
                 className="underline">dashboard.privy.io</a>
            </div>
          </div>
        )}

        {/* ── الخطوة 1: إدخال الإيميل ─────────────────────────────── */}
        {step === 'email' && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-serif mb-1">سجّل بإيميلك</h3>
              <p className="text-[13px] text-[var(--color-text-dim)] leading-relaxed">
                لا محفظة؟ سنُنشئ لك محفظة Stellar آمنة عبر Privy.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { icon: '🔐', label: 'Privy TEE' },
                { icon: '⚡', label: 'فوري' },
                { icon: '🌟', label: 'Stellar' },
              ].map((f) => (
                <div key={f.label} className="p-2 bg-white/[0.03] rounded-lg border border-[var(--color-border)]">
                  <div className="text-lg mb-0.5">{f.icon}</div>
                  <div className="text-[10px] text-[var(--color-text-dim)]">{f.label}</div>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendCode()}
                placeholder="name@example.com"
                className="input-field text-center text-[15px] tracking-wide"
                autoFocus
                dir="ltr"
                disabled={isSending}
              />

              {error && (
                <p className="text-[12px] text-[var(--color-error)] text-center">{error}</p>
              )}

              <button
                onClick={handleSendCode}
                disabled={isSending || !email.trim() || !hasAppId}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {isSending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> جاري الإرسال...</>
                ) : (
                  <><Mail className="w-4 h-4" /> إرسال رمز التحقق</>
                )}
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-[var(--color-border)]" />
              <span className="text-[11px] text-[var(--color-text-muted)]">أو</span>
              <div className="h-px flex-1 bg-[var(--color-border)]" />
            </div>

            <p className="text-center text-[11px] text-[var(--color-text-muted)] leading-relaxed">
              لديك محفظة Freighter؟{' '}
              <button onClick={onClose} className="text-primary hover:underline cursor-pointer">
                استخدم ربط المحفظة
              </button>
            </p>
          </div>
        )}

        {/* ── الخطوة 2: OTP ───────────────────────────────────────── */}
        {step === 'otp' && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-accent/20 to-primary/20 border border-accent/30 flex items-center justify-center">
                <Key className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-xl font-serif mb-1">أدخل رمز التحقق</h3>
              <p className="text-[13px] text-[var(--color-text-dim)]">
                أُرسل رمز من {otpLength} أرقام إلى
              </p>
              <p className="text-[13px] font-mono text-primary mt-0.5" dir="ltr">{email}</p>
            </div>

            <div className="flex gap-2 justify-center" dir="ltr">
              {Array(otpLength).fill(0).map((_, i) => (
                <input
                  key={i}
                  ref={(el) => { otpRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={otp[i] || ''}
                  onChange={(e) => handleOTPInput(i, e.target.value)}
                  onKeyDown={(e) => handleOTPKeyDown(i, e)}
                  className={`w-11 h-13 text-center text-[20px] font-mono font-bold rounded-lg border bg-[var(--color-bg-base)] outline-none transition-all
                    ${otp[i] ? 'border-primary text-primary' : 'border-[var(--color-border)] text-white'}
                    focus:border-primary focus:ring-1 focus:ring-primary/30
                  `}
                  style={{ height: '52px' }}
                  disabled={isSubmitting}
                />
              ))}
            </div>

            {isSubmitting && (
              <div className="flex items-center justify-center gap-2 text-[13px] text-[var(--color-text-dim)]">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                جاري التحقق...
              </div>
            )}

            {error && (
              <p className="text-[12px] text-[var(--color-error)] text-center">{error}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => { setStep('email'); setOtp(Array(otpLength).fill('')); setError(null); }}
                className="btn-outline flex-1 text-[12px]"
                disabled={isSubmitting}
              >
                رجوع
              </button>
              <button
                onClick={() => handleVerifyOTP()}
                disabled={isSubmitting || otp.slice(0, otpLength).some((d) => !d)}
                className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                تحقق
              </button>
            </div>

            <button
              onClick={handleSendCode}
              disabled={isSending}
              className="w-full text-[11px] text-[var(--color-text-muted)] hover:text-primary transition-colors cursor-pointer"
            >
              إعادة إرسال الرمز
            </button>
          </div>
        )}

        {/* ── الخطوة 3: إنشاء المحفظة ─────────────────────────────── */}
        {step === 'creating-wallet' && (
          <div className="text-center space-y-5 py-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Loader2 className="w-7 h-7 text-primary animate-spin" />
            </div>
            <div>
              <h3 className="text-xl font-serif mb-1">جاري إنشاء محفظتك</h3>
              <p className="text-[13px] text-[var(--color-text-dim)]">
                Privy تُولّد مفتاح Stellar آمناً في TEE...
              </p>
            </div>
            <div className="text-[11px] font-mono text-[var(--color-text-muted)] uppercase tracking-wider">
              Ed25519 · Stellar Testnet
            </div>
          </div>
        )}

        {/* ── خطأ في إنشاء المحفظة ─────────────────────────────────── */}
        {step === 'wallet-error' && (
          <div className="space-y-5 py-2">
            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                <AlertCircle className="w-7 h-7 text-red-400" />
              </div>
              <h3 className="text-xl font-serif mb-1">
                {errorKind === 'already-has-wallet'
                  ? 'محفظة Ethereum موجودة بدلاً من Stellar'
                  : 'تعذّر إنشاء محفظة Stellar'}
              </h3>
              <p className="text-[12px] text-[var(--color-text-dim)] leading-relaxed">
                {error}
              </p>
            </div>

            {errorKind === 'already-has-wallet' ? (
              <>
                <div className="p-4 rounded-lg border border-yellow-500/20 bg-yellow-500/5 text-[11px] leading-relaxed text-[var(--color-text-secondary)]">
                  <div className="font-semibold text-yellow-300 mb-2">لماذا حدث هذا؟</div>
                  <p className="text-[var(--color-text-dim)] mb-3">
                    Privy ينشئ محفظة افتراضية (Ethereum) عند أول تسجيل دخول. للحصول على
                    محفظة Stellar، يجب تفعيلها أولاً في Privy Dashboard ثم تسجيل دخول مستخدم جديد.
                  </p>
                  <div className="font-semibold text-yellow-300 mb-1">الخطوات:</div>
                  <ol className="list-decimal pr-4 space-y-1 text-[var(--color-text-dim)]">
                    <li>افتح <a href="https://dashboard.privy.io" target="_blank" rel="noreferrer" className="text-primary underline">Privy Dashboard</a></li>
                    <li>في تطبيقك → <strong>Wallets</strong> → فعّل <strong>Stellar</strong> (Tier 2)</li>
                    <li>اضغط الزر أدناه لتنظيف الجلسة وإعادة المحاولة</li>
                  </ol>
                </div>

                <div className="flex gap-2">
                  <button onClick={onClose} className="btn-outline flex-1 text-[12px]">
                    إغلاق
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await privyLogout();
                      } catch {}
                      // إعادة تعيين كل شيء والبدء من جديد
                      setStep('email');
                      setError(null);
                      setErrorKind(null);
                      setHasTriedCreate(false);
                      setOtp(Array(otpLength).fill(''));
                    }}
                    className="btn-primary flex-1 text-[12px]"
                  >
                    تسجيل خروج وإعادة المحاولة
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="p-4 rounded-lg border border-yellow-500/20 bg-yellow-500/5 text-[11px] leading-relaxed text-[var(--color-text-secondary)]">
                  <div className="font-semibold text-yellow-300 mb-2">ماذا تفعل؟</div>
                  <ol className="list-decimal pr-4 space-y-1 text-[var(--color-text-dim)]">
                    <li>افتح <a href="https://dashboard.privy.io" target="_blank" rel="noreferrer" className="text-primary underline">Privy Dashboard</a></li>
                    <li>اختر تطبيقك ثم انتقل إلى Wallets / Chain Configuration</li>
                    <li>فعّل دعم <strong>Stellar</strong> (Tier 2). إن لم تجده، تواصل مع دعم Privy لتفعيله</li>
                    <li>تأكد أن إصدار <code className="bg-black/40 px-1 rounded">@privy-io/react-auth</code> هو <code className="bg-black/40 px-1 rounded">^3.0.0</code></li>
                    <li>افتح Console للحصول على تفاصيل الـ debugging</li>
                  </ol>
                </div>

                <button onClick={onClose} className="btn-outline w-full text-[12px]">
                  إغلاق
                </button>
              </>
            )}
          </div>
        )}

        {/* ── الخطوة 4: نجاح ─────────────────────────────────────── */}
        {step === 'success' && (
          <div className="text-center space-y-5 py-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-accent" />
            </div>
            <div>
              <h3 className="text-xl font-serif mb-1">مرحباً! 🎉</h3>
              <p className="text-[13px] text-[var(--color-text-dim)]">
                تم إنشاء محفظتك على Stellar Testnet
              </p>
            </div>
            <div className="p-3 bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-lg">
              <div className="text-[10px] font-mono text-[var(--color-text-muted)] uppercase tracking-wider mb-1">
                عنوان محفظتك
              </div>
              <div className="text-[11px] font-mono text-accent break-all" dir="ltr">
                {stellarAddress}
              </div>
            </div>
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-[var(--color-text-dim)]">
              <Wallet className="w-3.5 h-3.5 text-primary" />
              جاري التحميل...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
