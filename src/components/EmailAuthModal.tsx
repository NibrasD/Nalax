/**
 * EmailAuthModal — نافذة تسجيل الدخول بالإيميل عبر Privy
 * ──────────────────────────────────────────────────────────
 * الخطوة 1: المستخدم يدخل إيميله → يُرسَل OTP
 * الخطوة 2: يدخل الـ OTP → تُنشأ محفظة Stellar تلقائياً
 */

import { useState, useRef, useEffect } from 'react';
import { Mail, ArrowRight, Key, Loader2, X, CheckCircle, Wallet, Shield } from 'lucide-react';
import { usePrivy, persistSessionOTP } from '../lib/privy';
import { useWallet } from '../store/useWallet';

interface EmailAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EmailAuthModal({ isOpen, onClose }: EmailAuthModalProps) {
  const { sendOTP, verifyOTP, otpPending, authError, authenticated, user } = usePrivy();
  const connectWithPrivy = useWallet(s => s.connectWithPrivy);

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [step, setStep] = useState<'email' | 'otp' | 'success'>('email');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // إذا أصبح المستخدم authenticated → نبلّغ useWallet
  useEffect(() => {
    if (authenticated && user?.wallet?.address && step !== 'success') {
      setStep('success');
      connectWithPrivy(user.wallet.address);
      setTimeout(onClose, 1800);
    }
  }, [authenticated, user, step, connectWithPrivy, onClose]);

  if (!isOpen) return null;

  const handleSendOTP = async () => {
    setLocalError(null);
    if (!email.trim() || !email.includes('@')) {
      setLocalError('أدخل بريداً إلكترونياً صحيحاً');
      return;
    }
    setLoading(true);
    try {
      await sendOTP(email.trim().toLowerCase());
      setStep('otp');
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (e: any) {
      setLocalError(e?.message || 'حدث خطأ. حاول مجدداً.');
    } finally {
      setLoading(false);
    }
  };

  const handleOTPInput = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
    if (newOtp.every(d => d !== '')) {
      handleVerifyOTP(newOtp.join(''));
    }
  };

  const handleOTPKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async (code?: string) => {
    const finalCode = code || otp.join('');
    if (finalCode.length !== 6) return;
    setLocalError(null);
    setLoading(true);
    try {
      await verifyOTP(email.trim().toLowerCase(), finalCode);
      // حفظ OTP في session للتوقيع لاحقاً
      persistSessionOTP(email.trim().toLowerCase(), finalCode);
      setStep('success');
    } catch (e: any) {
      setLocalError(authError || e?.message || 'الرمز غير صحيح');
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } finally {
      setLoading(false);
    }
  };

  const error = localError || authError;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-md"
        onClick={step !== 'success' ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative glass-panel-elevated w-full max-w-sm p-8 animate-slideUp">
        {/* Close */}
        {step !== 'success' && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-[var(--color-text-muted)] hover:text-white transition-colors cursor-pointer p-1"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* ── Step: Email ─────────────────────────────────────── */}
        {step === 'email' && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-serif mb-1">سجّل بإيميلك</h3>
              <p className="text-[13px] text-[var(--color-text-dim)] leading-relaxed">
                لا محفظة؟ لا مشكلة. سنُنشئ لك محفظة Stellar آمنة تلقائياً.
              </p>
            </div>

            {/* Features */}
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { icon: '🔐', label: 'آمن 100%' },
                { icon: '⚡', label: 'فوري' },
                { icon: '🌟', label: 'Stellar Testnet' },
              ].map(f => (
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
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendOTP()}
                placeholder="name@example.com"
                className="input-field text-center text-[15px] tracking-wide"
                autoFocus
                dir="ltr"
              />

              {error && (
                <p className="text-[12px] text-[var(--color-error)] text-center">{error}</p>
              )}

              <button
                onClick={handleSendOTP}
                disabled={loading || !email.trim()}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {loading ? (
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

        {/* ── Step: OTP ───────────────────────────────────────── */}
        {step === 'otp' && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-accent/20 to-primary/20 border border-accent/30 flex items-center justify-center">
                <Key className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-xl font-serif mb-1">أدخل رمز التحقق</h3>
              <p className="text-[13px] text-[var(--color-text-dim)]">
                أُرسل رمز من 6 أرقام إلى
              </p>
              <p className="text-[13px] font-mono text-primary mt-0.5" dir="ltr">{email}</p>
              <p className="text-[11px] text-[var(--color-text-muted)] mt-2">
                🔍 تحقق من <strong>console</strong> للرمز التجريبي
              </p>
            </div>

            {/* OTP Inputs */}
            <div className="flex gap-2 justify-center" dir="ltr">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={el => { otpRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleOTPInput(i, e.target.value)}
                  onKeyDown={e => handleOTPKeyDown(i, e)}
                  className={`w-11 h-13 text-center text-[20px] font-mono font-bold rounded-lg border bg-[var(--color-bg-base)] outline-none transition-all
                    ${digit ? 'border-primary text-primary' : 'border-[var(--color-border)] text-white'}
                    focus:border-primary focus:ring-1 focus:ring-primary/30
                  `}
                  style={{ height: '52px' }}
                  disabled={loading}
                />
              ))}
            </div>

            {loading && (
              <div className="flex items-center justify-center gap-2 text-[13px] text-[var(--color-text-dim)]">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                جاري إنشاء محفظتك...
              </div>
            )}

            {error && (
              <p className="text-[12px] text-[var(--color-error)] text-center">{error}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => { setStep('email'); setOtp(['', '', '', '', '', '']); setLocalError(null); }}
                className="btn-outline flex-1 text-[12px]"
                disabled={loading}
              >
                رجوع
              </button>
              <button
                onClick={() => handleVerifyOTP()}
                disabled={loading || otp.some(d => !d)}
                className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                تحقق
              </button>
            </div>

            <button
              onClick={handleSendOTP}
              disabled={loading}
              className="w-full text-[11px] text-[var(--color-text-muted)] hover:text-primary transition-colors cursor-pointer"
            >
              إعادة إرسال الرمز
            </button>
          </div>
        )}

        {/* ── Step: Success ────────────────────────────────────── */}
        {step === 'success' && (
          <div className="text-center space-y-5 py-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-accent" />
            </div>
            <div>
              <h3 className="text-xl font-serif mb-1">مرحباً! 🎉</h3>
              <p className="text-[13px] text-[var(--color-text-dim)]">تم إنشاء محفظتك وتمويلها تلقائياً</p>
            </div>
            <div className="p-3 bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-lg">
              <div className="text-[10px] font-mono text-[var(--color-text-muted)] uppercase tracking-wider mb-1">
                عنوان محفظتك على Stellar
              </div>
              <div className="text-[11px] font-mono text-accent break-all" dir="ltr">
                {user?.wallet?.address}
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
