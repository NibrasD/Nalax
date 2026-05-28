/**
 * QuickWalletModal — محفظة Stellar محلية بسيطة (بدون Privy)
 * ──────────────────────────────────────────────────────────────
 *
 *   - "إنشاء محفظة جديدة" → Keypair عشوائي → Friendbot fund → جاهز
 *   - "استيراد محفظة" → الصق Secret Key (S...) → جاهز
 *
 * المفتاح يُحفظ في localStorage. للإنتاج: استخدم تشفيراً قوياً.
 */

import { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Loader2,
  X,
  CheckCircle,
  Wallet,
  Copy,
  Check,
  Eye,
  EyeOff,
  AlertCircle,
  Download,
  KeyRound,
} from 'lucide-react';
import { useWallet } from '../store/useWallet';
import {
  generateNewWallet,
  importWalletFromSecret,
  fundFromFriendbot,
} from '../lib/quick-wallet';
import { registerAuthor, isAuthorRegistered } from '../lib/stellar';

interface EmailAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'create' | 'import';
type Step = 'choose' | 'creating' | 'funding' | 'created' | 'importing' | 'error';

export function EmailAuthModal({ isOpen, onClose }: EmailAuthModalProps) {
  const connectQuickWallet = useWallet((s) => s.connectQuickWallet);
  const refreshBalance = useWallet((s) => s.refreshBalance);

  const [tab, setTab] = useState<Tab>('create');
  const [step, setStep] = useState<Step>('choose');
  const [error, setError] = useState<string | null>(null);
  const [createdAddress, setCreatedAddress] = useState<string | null>(null);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [fundedBalance, setFundedBalance] = useState<number | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);
  const [addressCopied, setAddressCopied] = useState(false);
  const [importValue, setImportValue] = useState('');
  const [username, setUsername] = useState('');

  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setStep('choose');
      setTab('create');
      setError(null);
      setCreatedAddress(null);
      setCreatedSecret(null);
      setFundedBalance(null);
      setShowSecret(false);
      setSecretCopied(false);
      setAddressCopied(false);
      setImportValue('');
      setUsername('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreate = async () => {
    setError(null);

    // Validate username
    if (!username.trim()) {
      setError('يرجى اختيار اسم مستخدم');
      return;
    }
    if (username.trim().length < 2) {
      setError('اسم المستخدم يجب أن يكون حرفين على الأقل');
      return;
    }

    try {
      // 1. إنشاء المحفظة محلياً
      setStep('creating');
      const kp = generateNewWallet();
      const address = kp.publicKey();
      const secret = kp.secret();
      setCreatedAddress(address);
      setCreatedSecret(secret);

      // 2. تمويل عبر Friendbot وانتظار الرصيد
      setStep('funding');
      const result = await fundFromFriendbot(address);

      if (result.funded) {
        setFundedBalance(result.balance);
        connectQuickWallet(address);
        // تحديث الرصيد في useWallet ليعرض الرقم الفعلي
        setTimeout(() => refreshBalance(), 500);

        // 3. تسجيل المؤلف على العقد الذكي بالاسم المختار
        try {
          await registerAuthor(address, username.trim(), 'Nalax Creator');
          // حفظ الاسم محلياً
          localStorage.setItem('nalax_username', username.trim());
        } catch (regErr: any) {
          // إذا كان مسجّل بالفعل (Error #4) — تجاهل
          if (!regErr?.message?.includes('#4')) {
            console.warn('[QuickWallet] فشل تسجيل المؤلف:', regErr);
          }
        }

        setStep('created');
      } else {
        // فشل التمويل لكن المحفظة أُنشئت — اعرضها مع تحذير
        connectQuickWallet(address);
        setError(
          result.error
            ? `تعذّر التمويل التلقائي: ${result.error}. يمكنك المحاولة من Dashboard.`
            : 'تعذّر تمويل المحفظة. يمكنك المحاولة لاحقاً من Dashboard.'
        );
        setFundedBalance(0);
        setStep('created');
      }
    } catch (e: any) {
      console.error('[QuickWallet] generate error:', e);
      setError(e?.message || 'فشل إنشاء المحفظة');
      setStep('error');
    }
  };

  const handleImport = async () => {
    setError(null);
    if (!importValue.trim()) {
      setError('أدخل المفتاح السري');
      return;
    }
    setStep('importing');
    try {
      const kp = importWalletFromSecret(importValue.trim());
      const address = kp.publicKey();
      connectQuickWallet(address);

      // فحص الرصيد — إن كان الحساب جديداً (غير مُمَوَّل)، حاول تمويله
      const result = await fundFromFriendbot(address, { pollTimeout: 8000 });
      if (result.funded && !result.alreadyFunded) {
        setTimeout(() => refreshBalance(), 500);
      }

      setTimeout(() => onClose(), 800);
    } catch (e: any) {
      console.error('[QuickWallet] import error:', e);
      setError(e?.message || 'فشل استيراد المحفظة');
      setStep('error');
    }
  };

  const copyToClipboard = async (text: string, kind: 'address' | 'secret') => {
    try {
      await navigator.clipboard.writeText(text);
      if (kind === 'address') {
        setAddressCopied(true);
        setTimeout(() => setAddressCopied(false), 2000);
      } else {
        setSecretCopied(true);
        setTimeout(() => setSecretCopied(false), 2000);
      }
    } catch {}
  };

  const downloadSecret = () => {
    if (!createdSecret || !createdAddress) return;
    const content =
      `Nalax Stellar Wallet Backup\n` +
      `==========================\n\n` +
      `Public Key (G):\n${createdAddress}\n\n` +
      `Secret Key (S) — احفظها في مكان آمن:\n${createdSecret}\n\n` +
      `Created: ${new Date().toISOString()}\n` +
      `Network: Stellar Testnet\n`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nalax-wallet-${createdAddress.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-md"
        onClick={
          step === 'creating' || step === 'funding' || step === 'importing'
            ? undefined
            : onClose
        }
      />

      <div className="relative glass-panel-elevated w-full max-w-md p-8 animate-slideUp">
        {step !== 'creating' && step !== 'funding' && step !== 'importing' && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-[var(--color-text-muted)] hover:text-white transition-colors cursor-pointer p-1"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* ── شاشة الاختيار: إنشاء / استيراد ────────────────────────── */}
        {step === 'choose' && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-serif mb-1">محفظة Stellar فورية</h3>
              <p className="text-[13px] text-[var(--color-text-dim)] leading-relaxed">
                بدون إيميل، بدون انتظار. زر واحد ومحفظتك جاهزة.
              </p>
            </div>

            {/* تبديل التبويب */}
            <div className="flex gap-1 p-1 bg-[var(--color-bg-base)] rounded-xl border border-[var(--color-border)]">
              <button
                onClick={() => setTab('create')}
                className={`flex-1 py-2 px-3 text-[12px] font-semibold rounded-lg transition-all cursor-pointer ${
                  tab === 'create'
                    ? 'bg-primary text-white shadow-md'
                    : 'text-[var(--color-text-dim)] hover:text-white'
                }`}
              >
                إنشاء جديدة
              </button>
              <button
                onClick={() => setTab('import')}
                className={`flex-1 py-2 px-3 text-[12px] font-semibold rounded-lg transition-all cursor-pointer ${
                  tab === 'import'
                    ? 'bg-primary text-white shadow-md'
                    : 'text-[var(--color-text-dim)] hover:text-white'
                }`}
              >
                استيراد موجودة
              </button>
            </div>

            {tab === 'create' && (
              <div className="space-y-4">
                {/* حقل اسم المستخدم */}
                <div>
                  <label className="block text-[11px] text-[var(--color-text-dim)] mb-2">
                    اسم المستخدم (سيظهر ككاتب)
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="مثال: أحمد، Sarah، مبدع..."
                    className="input-field text-[13px]"
                    maxLength={30}
                  />
                </div>

                {error && step === 'choose' && (
                  <p className="text-[12px] text-[var(--color-error)] text-center">
                    {error}
                  </p>
                )}

                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { icon: '⚡', label: 'فوري' },
                    { icon: '🔐', label: 'محلي 100%' },
                    { icon: '🌟', label: 'Stellar' },
                  ].map((f) => (
                    <div
                      key={f.label}
                      className="p-2 bg-white/[0.03] rounded-lg border border-[var(--color-border)]"
                    >
                      <div className="text-lg mb-0.5">{f.icon}</div>
                      <div className="text-[10px] text-[var(--color-text-dim)]">
                        {f.label}
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleCreate}
                  disabled={!username.trim()}
                  className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Sparkles className="w-4 h-4" />
                  إنشاء محفظة الآن
                </button>

                <p className="text-center text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                  ستُحفظ المحفظة في متصفحك. سنعرض لك المفتاح السري لتحفظه أيضاً.
                </p>
              </div>
            )}

            {tab === 'import' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] text-[var(--color-text-dim)] mb-2">
                    Secret Key (يبدأ بـ S)
                  </label>
                  <input
                    ref={importRef}
                    type="password"
                    value={importValue}
                    onChange={(e) => setImportValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleImport()}
                    placeholder="SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                    className="input-field text-[12px] font-mono"
                    dir="ltr"
                    autoFocus
                  />
                </div>

                {error && (
                  <p className="text-[12px] text-[var(--color-error)] text-center">
                    {error}
                  </p>
                )}

                <button
                  onClick={handleImport}
                  disabled={!importValue.trim()}
                  className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  <KeyRound className="w-4 h-4" />
                  استيراد المحفظة
                </button>

                <p className="text-center text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                  المفتاح يُحفظ محلياً في متصفحك ولن يُرسَل لأي خادم.
                </p>
              </div>
            )}

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

        {/* ── جاري الإنشاء ─────────────────────────────────────────── */}
        {step === 'creating' && (
          <div className="text-center space-y-4 py-6">
            <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Loader2 className="w-7 h-7 text-primary animate-spin" />
            </div>
            <h3 className="text-lg font-serif">جاري إنشاء محفظتك...</h3>
          </div>
        )}

        {/* ── جاري التمويل من Friendbot ────────────────────────────── */}
        {step === 'funding' && (
          <div className="text-center space-y-4 py-6">
            <div className="w-14 h-14 mx-auto rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center">
              <Loader2 className="w-7 h-7 text-accent animate-spin" />
            </div>
            <div>
              <h3 className="text-lg font-serif mb-1">جاري ضخ XLM من Friendbot</h3>
              <p className="text-[12px] text-[var(--color-text-dim)] leading-relaxed">
                10,000 XLM في الطريق إلى محفظتك...
              </p>
            </div>
            <div className="p-2 bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-lg">
              <div className="text-[9px] font-mono text-[var(--color-text-muted)] uppercase tracking-wider mb-1">
                المحفظة الجديدة
              </div>
              <div className="text-[10px] font-mono text-accent break-all" dir="ltr">
                {createdAddress}
              </div>
            </div>
            <p className="text-[10px] text-[var(--color-text-muted)]">
              قد يستغرق ذلك حتى 20 ثانية...
            </p>
          </div>
        )}

        {/* ── جاري الاستيراد ────────────────────────────────────────── */}
        {step === 'importing' && (
          <div className="text-center space-y-4 py-6">
            <div className="w-14 h-14 mx-auto rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center">
              <CheckCircle className="w-7 h-7 text-accent" />
            </div>
            <h3 className="text-lg font-serif">تم استيراد المحفظة!</h3>
            <p className="text-[12px] text-[var(--color-text-dim)]">جاري التحميل...</p>
          </div>
        )}

        {/* ── تم الإنشاء — اعرض المفاتيح + احفظ النسخة الاحتياطية ────────── */}
        {step === 'created' && createdAddress && createdSecret && (
          <div className="space-y-5">
            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center">
                <CheckCircle className="w-7 h-7 text-accent" />
              </div>
              <h3 className="text-xl font-serif mb-1">تم إنشاء المحفظة! 🎉</h3>
              <p className="text-[12px] text-[var(--color-text-dim)] leading-relaxed">
                احفظ المفتاح السري في مكان آمن — لن نعرضه مرة أخرى.
              </p>
            </div>

            {/* بطاقة الرصيد بعد التمويل */}
            {fundedBalance !== null && fundedBalance > 0 && (
              <div className="p-4 bg-accent/5 border border-accent/30 rounded-lg text-center">
                <div className="text-[10px] font-mono text-accent uppercase tracking-wider mb-1">
                  💰 تم ضخ XLM في محفظتك
                </div>
                <div className="text-2xl font-serif text-accent">
                  {fundedBalance.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}{' '}
                  <span className="text-sm">XLM</span>
                </div>
                <div className="text-[10px] text-[var(--color-text-dim)] mt-1">
                  جاهزة للنشر والمعاملات على Stellar Testnet
                </div>
              </div>
            )}

            {/* تحذير لو فشل التمويل */}
            {error && step === 'created' && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
                <p className="text-[11px] text-yellow-200 leading-relaxed">
                  {error}
                </p>
              </div>
            )}

            {/* العنوان */}
            <div className="p-3 bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-lg">
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-[10px] font-mono text-[var(--color-text-muted)] uppercase tracking-wider">
                  عنوان المحفظة (Public)
                </div>
                <button
                  onClick={() => copyToClipboard(createdAddress, 'address')}
                  className="text-[10px] text-primary hover:underline cursor-pointer flex items-center gap-1"
                >
                  {addressCopied ? (
                    <>
                      <Check className="w-3 h-3" /> نُسخ
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" /> نسخ
                    </>
                  )}
                </button>
              </div>
              <div className="text-[11px] font-mono text-accent break-all" dir="ltr">
                {createdAddress}
              </div>
            </div>

            {/* المفتاح السري */}
            <div className="p-3 bg-[var(--color-warning)]/5 border border-[var(--color-warning)]/30 rounded-lg">
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-[10px] font-mono text-[var(--color-warning)] uppercase tracking-wider flex items-center gap-1.5">
                  <AlertCircle className="w-3 h-3" />
                  المفتاح السري (Secret)
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowSecret((v) => !v)}
                    className="text-[10px] text-[var(--color-text-dim)] hover:text-white cursor-pointer flex items-center gap-1"
                  >
                    {showSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {showSecret ? 'إخفاء' : 'إظهار'}
                  </button>
                  <button
                    onClick={() => copyToClipboard(createdSecret, 'secret')}
                    className="text-[10px] text-primary hover:underline cursor-pointer flex items-center gap-1"
                  >
                    {secretCopied ? (
                      <>
                        <Check className="w-3 h-3" /> نُسخ
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" /> نسخ
                      </>
                    )}
                  </button>
                </div>
              </div>
              <div className="text-[11px] font-mono break-all" dir="ltr">
                {showSecret ? (
                  <span className="text-[var(--color-warning)]">{createdSecret}</span>
                ) : (
                  <span className="text-[var(--color-text-muted)]">
                    {'•'.repeat(56)}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-[var(--color-text-dim)] mt-2 leading-relaxed">
                ⚠️ لا تُشاركه مع أحد. من يملكه يملك أموالك.
              </p>
            </div>

            <button
              onClick={downloadSecret}
              className="btn-outline w-full flex items-center justify-center gap-2 text-[12px]"
            >
              <Download className="w-4 h-4" />
              تنزيل نسخة احتياطية
            </button>

            <button onClick={onClose} className="btn-primary w-full text-[12px]">
              حفظت المفتاح، تابع
            </button>
          </div>
        )}

        {/* ── خطأ ──────────────────────────────────────────────────── */}
        {step === 'error' && (
          <div className="space-y-5 py-2">
            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                <AlertCircle className="w-7 h-7 text-red-400" />
              </div>
              <h3 className="text-xl font-serif mb-1">حدث خطأ</h3>
              <p className="text-[12px] text-[var(--color-text-dim)] leading-relaxed">
                {error}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={onClose} className="btn-outline flex-1 text-[12px]">
                إغلاق
              </button>
              <button
                onClick={() => {
                  setStep('choose');
                  setError(null);
                }}
                className="btn-primary flex-1 text-[12px]"
              >
                إعادة المحاولة
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
