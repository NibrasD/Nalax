/**
 * Privy Integration Layer for Stellar Testnet
 * ─────────────────────────────────────────────
 * هذا الملف يبني طبقة Privy كاملة بدون حاجة لحزمة @privy-io/react-auth.
 * عند رفع المشروع للإنتاج، استبدل هذا الملف بـ:
 *   import { PrivyProvider, usePrivy } from '@privy-io/react-auth'
 * وأبقِ نفس الـ interface (loginWithEmail, logout, user, ready).
 *
 * كيف تعمل الآن (Dev/Testnet):
 * 1. المستخدم يدخل إيميله → يُرسَل OTP مزيّف (يظهر في console)
 * 2. يُدخل الـ OTP → تُولَّد محفظة Stellar من seed مشتق من الإيميل (PBKDF2)
 * 3. المفتاح العام يُخزَّن في localStorage مشفراً
 * 4. التوقيع يتم locally بالمفتاح الخاص (محاكاة Privy TEE)
 *
 * عند دمج Privy الحقيقي (npm install @privy-io/react-auth):
 * - PrivyProvider يأخذ appId من dashboard.privy.io
 * - كل شيء آخر يبقى كما هو
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Keypair, Networks, TransactionBuilder } from '@stellar/stellar-sdk';

// ── Types ────────────────────────────────────────────────────────────────────

export interface PrivyUser {
  id: string;
  email: string;
  wallet: {
    address: string;       // Stellar public key (G...)
    walletClientType: 'privy';
  };
  createdAt: number;
}

export interface PrivyContextValue {
  ready: boolean;
  authenticated: boolean;
  user: PrivyUser | null;
  loginWithEmail: (email: string) => Promise<void>;
  sendOTP: (email: string) => Promise<void>;
  verifyOTP: (email: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  signStellarTransaction: (xdr: string) => Promise<string>;
  otpPending: boolean;
  authError: string | null;
}

// ── Context ──────────────────────────────────────────────────────────────────

const PrivyContext = createContext<PrivyContextValue | null>(null);

// ── Crypto Helpers ───────────────────────────────────────────────────────────

/**
 * توليد Stellar Keypair من إيميل + OTP باستخدام PBKDF2
 * في الإنتاج: Privy يفعل هذا في TEE محمي
 */
async function deriveKeypairFromEmail(email: string, otp: string): Promise<Keypair> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(email + ':nalax-privy-v1'),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: encoder.encode(otp + ':stellar-testnet'),
      iterations: 100_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  const seed = new Uint8Array(derivedBits);
  return Keypair.fromRawEd25519Seed(Buffer.from(seed));
}

/**
 * تشفير المفتاح الخاص للتخزين في localStorage
 */
async function encryptSecret(secret: string, passphrase: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey']
  );
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: encoder.encode('nalax-salt'), iterations: 50_000, hash: 'SHA-256' },
    keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt']
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(secret)
  );
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  return btoa(String.fromCharCode(...combined));
}

async function decryptSecret(encryptedB64: string, passphrase: string): Promise<string> {
  const encoder = new TextEncoder();
  const combined = Uint8Array.from(atob(encryptedB64), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey']
  );
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: encoder.encode('nalax-salt'), iterations: 50_000, hash: 'SHA-256' },
    keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['decrypt']
  );
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return new TextDecoder().decode(decrypted);
}

// ── OTP Simulation ────────────────────────────────────────────────────────────

const OTP_STORE: Record<string, string> = {};

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function simulateSendOTP(email: string): Promise<string> {
  const otp = generateOTP();
  OTP_STORE[email] = otp;
  // في الإنتاج: Privy يرسل الـ OTP عبر إيميل حقيقي
  console.info(`
╔══════════════════════════════════════╗
║        🔐 Nalax Auth OTP Code        ║
║  Email: ${email.padEnd(28)} ║
║  Code:  ${otp.padEnd(28)} ║
╚══════════════════════════════════════╝
  `);
  return otp;
}

// ── Storage Keys ──────────────────────────────────────────────────────────────

const STORAGE_KEY_USER = 'nalax_privy_user';
const STORAGE_KEY_SECRET = 'nalax_privy_secret';

// ── Provider ──────────────────────────────────────────────────────────────────

interface PrivyProviderProps {
  appId: string;          // في الإنتاج: ID من dashboard.privy.io
  children: React.ReactNode;
  onSuccess?: (user: PrivyUser) => void;
}

export function PrivyProvider({ appId, children, onSuccess }: PrivyProviderProps) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<PrivyUser | null>(null);
  const [otpPending, setOtpPending] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // استعادة الجلسة من localStorage عند التحميل
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_USER);
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch {
      // ignore
    } finally {
      setReady(true);
    }
  }, []);

  const sendOTP = useCallback(async (email: string) => {
    setAuthError(null);
    if (!email || !email.includes('@')) {
      setAuthError('البريد الإلكتروني غير صحيح');
      return;
    }
    await simulateSendOTP(email);
    setOtpPending(true);
  }, []);

  const verifyOTP = useCallback(async (email: string, code: string) => {
    setAuthError(null);
    const expected = OTP_STORE[email];
    if (!expected || expected !== code.trim()) {
      setAuthError('الرمز غير صحيح. تحقق من console للرمز التجريبي.');
      throw new Error('Invalid OTP');
    }

    // توليد محفظة Stellar من الإيميل + OTP
    const keypair = await deriveKeypairFromEmail(email, code);
    const publicKey = keypair.publicKey();
    const secret = keypair.secret();

    // تشفير المفتاح الخاص وحفظه
    const encrypted = await encryptSecret(secret, email + code);
    localStorage.setItem(STORAGE_KEY_SECRET, JSON.stringify({ email, encrypted }));

    const newUser: PrivyUser = {
      id: `privy-${publicKey.slice(0, 12)}`,
      email,
      wallet: { address: publicKey, walletClientType: 'privy' },
      createdAt: Date.now(),
    };

    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(newUser));
    setUser(newUser);
    setOtpPending(false);
    delete OTP_STORE[email];
    onSuccess?.(newUser);

    // تمويل المحفظة الجديدة من Friendbot تلقائياً
    try {
      await fetch(`https://friendbot.stellar.org?addr=${publicKey}`);
      console.info(`✅ محفظة Stellar جديدة ممولة: ${publicKey}`);
    } catch {
      // Friendbot اختياري
    }
  }, [onSuccess]);

  const loginWithEmail = useCallback(async (email: string) => {
    await sendOTP(email);
  }, [sendOTP]);

  const logout = useCallback(async () => {
    localStorage.removeItem(STORAGE_KEY_USER);
    localStorage.removeItem(STORAGE_KEY_SECRET);
    setUser(null);
    setOtpPending(false);
    setAuthError(null);
  }, []);

  /**
   * توقيع معاملة Stellar XDR بالمفتاح الخاص للمستخدم
   * في الإنتاج: Privy يفعل هذا داخل TEE محمي
   */
  const signStellarTransaction = useCallback(async (xdr: string): Promise<string> => {
    if (!user) throw new Error('المستخدم غير مسجّل');

    const stored = localStorage.getItem(STORAGE_KEY_SECRET);
    if (!stored) throw new Error('المفتاح الخاص غير موجود');

    // لإعادة البناء نحتاج الـ passphrase — في الإنتاج Privy يتحكم بهذا
    // هنا نطلب من المستخدم تأكيد بـ biometric أو كلمة سر (مبسّط: نستخدم prompt)
    const { email, encrypted } = JSON.parse(stored);
    
    // في الـ stub: نستخدم session key مؤقت
    // عند الإنتاج: Privy يوقّع مباشرة بدون كشف المفتاح
    const sessionOTP = sessionStorage.getItem(`privy_session_${email}`);
    if (!sessionOTP) {
      throw new Error('انتهت جلسة التوقيع. سجّل دخولك مجدداً.');
    }

    const secret = await decryptSecret(encrypted, email + sessionOTP);
    const keypair = Keypair.fromSecret(secret);

    const tx = TransactionBuilder.fromXDR(xdr, Networks.TESTNET);
    tx.sign(keypair);
    return tx.toXDR();
  }, [user]);

  const value: PrivyContextValue = {
    ready,
    authenticated: !!user,
    user,
    loginWithEmail,
    sendOTP,
    verifyOTP,
    logout,
    signStellarTransaction,
    otpPending,
    authError,
  };

  return <PrivyContext.Provider value={value}>{children}</PrivyContext.Provider>;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function usePrivy(): PrivyContextValue {
  const ctx = useContext(PrivyContext);
  if (!ctx) throw new Error('usePrivy must be used inside <PrivyProvider>');
  return ctx;
}

/**
 * حفظ الـ OTP في sessionStorage بعد التحقق (للتوقيع لاحقاً)
 */
export function persistSessionOTP(email: string, otp: string) {
  sessionStorage.setItem(`privy_session_${email}`, otp);
}
