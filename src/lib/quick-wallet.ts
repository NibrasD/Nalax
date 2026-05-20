/**
 * Quick Wallet — محفظة Stellar محلية بسيطة
 * ─────────────────────────────────────────────
 * بدون أي خدمات خارجية. زر واحد → محفظة جاهزة.
 *
 *   1. تُولَّد Keypair عشوائي محلياً
 *   2. تُحفظ في localStorage (testnet فقط)
 *   3. تُموَّل من Friendbot تلقائياً
 *   4. توقيع كل المعاملات محلياً بـ stellar-sdk
 *
 * للإنتاج بأموال حقيقية: استبدل localStorage بحلٍّ أكثر أماناً
 * (TEE، hardware wallet، أو backend مع تشفير قوي).
 */

import {
  Keypair,
  TransactionBuilder,
  Networks,
  FeeBumpTransaction,
  Transaction,
} from '@stellar/stellar-sdk';

const STORAGE_KEY = 'nalax_quick_wallet_v1';

// ─── الذاكرة المؤقتة ────────────────────────────────────────────────────────

let _activeKeypair: Keypair | null = null;

// ─── Helpers ────────────────────────────────────────────────────────────────

export function isStellarAddress(addr: unknown): addr is string {
  return (
    typeof addr === 'string' &&
    addr.length === 56 &&
    addr.startsWith('G') &&
    /^[A-Z2-7]+$/.test(addr)
  );
}

export function isStellarSecret(secret: unknown): secret is string {
  return (
    typeof secret === 'string' &&
    secret.length === 56 &&
    secret.startsWith('S') &&
    /^[A-Z2-7]+$/.test(secret)
  );
}

// ─── الوصول للمحفظة الحالية ──────────────────────────────────────────────────

export function getActiveKeypair(): Keypair | null {
  return _activeKeypair;
}

export function getActiveAddress(): string | null {
  return _activeKeypair?.publicKey() ?? null;
}

// ─── إنشاء / استيراد / تحميل ──────────────────────────────────────────────────

interface StoredWallet {
  secret: string;
  publicKey: string;
  createdAt: number;
}

function saveToStorage(kp: Keypair) {
  const data: StoredWallet = {
    secret: kp.secret(),
    publicKey: kp.publicKey(),
    createdAt: Date.now(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/**
 * توليد محفظة Stellar جديدة عشوائية.
 */
export function generateNewWallet(): Keypair {
  const kp = Keypair.random();
  saveToStorage(kp);
  _activeKeypair = kp;
  return kp;
}

/**
 * تحميل المحفظة المحفوظة من localStorage (إن وُجدت).
 */
export function loadWalletFromStorage(): Keypair | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    const parsed: StoredWallet = JSON.parse(data);
    if (!parsed.secret || !isStellarSecret(parsed.secret)) return null;
    const kp = Keypair.fromSecret(parsed.secret);
    _activeKeypair = kp;
    return kp;
  } catch (e) {
    console.error('[quick-wallet] فشل تحميل المحفظة:', e);
    return null;
  }
}

/**
 * استيراد محفظة موجودة من Secret Key (S...).
 */
export function importWalletFromSecret(secret: string): Keypair {
  const trimmed = secret.trim();
  if (!isStellarSecret(trimmed)) {
    throw new Error('المفتاح السري غير صحيح. يجب أن يبدأ بـ S وطوله 56 حرفاً.');
  }
  const kp = Keypair.fromSecret(trimmed);
  saveToStorage(kp);
  _activeKeypair = kp;
  return kp;
}

/**
 * مسح المحفظة من الذاكرة و localStorage.
 */
export function clearWallet() {
  localStorage.removeItem(STORAGE_KEY);
  _activeKeypair = null;
}

// ─── Friendbot للتمويل التلقائي على testnet ────────────────────────────────

export interface FundResult {
  funded: boolean;
  balance: number;       // الرصيد الحالي بـ XLM
  alreadyFunded: boolean; // الحساب كان مُموَّل من قبل
  error?: string;
}

/**
 * فحص الرصيد الحالي لحساب على Horizon testnet.
 * يُرجع 0 إن لم يكن الحساب موجوداً.
 */
async function fetchAccountBalance(address: string): Promise<number> {
  try {
    const res = await fetch(
      `https://horizon-testnet.stellar.org/accounts/${address}`
    );
    if (!res.ok) return 0; // 404 = الحساب غير موجود (غير مُموَّل)
    const data = await res.json();
    const native = data.balances?.find((b: any) => b.asset_type === 'native');
    return parseFloat(native?.balance || '0');
  } catch {
    return 0;
  }
}

/**
 * تمويل محفظة من Friendbot (testnet) مع انتظار الرصيد فعلياً على Horizon.
 *
 * @param address              عنوان Stellar
 * @param options.pollTimeout  مدة الانتظار القصوى (ms) — افتراضي 20 ثانية
 * @returns                    نتيجة العملية مع الرصيد الفعلي
 */
export async function fundFromFriendbot(
  address: string,
  options: { pollTimeout?: number } = {}
): Promise<FundResult> {
  const { pollTimeout = 20_000 } = options;

  // 1) فحص هل الحساب مُموَّل بالفعل؟
  const initialBalance = await fetchAccountBalance(address);
  if (initialBalance > 0) {
    console.info(
      `[quick-wallet] الحساب مُموَّل مسبقاً (${initialBalance} XLM): ${address}`
    );
    return { funded: true, balance: initialBalance, alreadyFunded: true };
  }

  // 2) استدعاء Friendbot
  let friendbotOk = false;
  let friendbotError: string | undefined;
  try {
    const res = await fetch(`https://friendbot.stellar.org?addr=${address}`);
    if (res.ok) {
      friendbotOk = true;
    } else {
      // Friendbot أحياناً يُرجع 400 إن كان الحساب موجوداً
      const errBody = await res.json().catch(() => ({}));
      friendbotError =
        errBody?.detail || errBody?.title || `HTTP ${res.status}`;
      // تابع الـ polling — الحساب قد يكون أُنشئ بطريقة أخرى
      console.warn('[quick-wallet] Friendbot رفض:', friendbotError);
    }
  } catch (e: any) {
    friendbotError = e?.message || 'Network error';
    console.warn('[quick-wallet] Friendbot fetch فشل:', friendbotError);
  }

  // 3) Polling للرصيد حتى يظهر فعلياً على Horizon
  const startTime = Date.now();
  while (Date.now() - startTime < pollTimeout) {
    await new Promise((r) => setTimeout(r, 1500));
    const balance = await fetchAccountBalance(address);
    if (balance > 0) {
      console.info(
        `[quick-wallet] ✅ مُموَّلة بـ ${balance} XLM: ${address}`
      );
      return { funded: true, balance, alreadyFunded: false };
    }
  }

  // 4) timeout
  return {
    funded: false,
    balance: 0,
    alreadyFunded: false,
    error: friendbotError || 'انتهت مهلة انتظار Friendbot',
  };
}

// ─── التوقيع المحلي ───────────────────────────────────────────────────────────

/**
 * توقيع XDR محلياً بمفتاح المحفظة الحالية.
 */
export async function signXdrLocally(
  xdrString: string,
  networkPassphrase: string = Networks.TESTNET
): Promise<string> {
  if (!_activeKeypair) {
    throw new Error('لا توجد محفظة نشطة. أنشئ أو استورد محفظة أولاً.');
  }
  const tx = TransactionBuilder.fromXDR(xdrString, networkPassphrase) as
    | Transaction
    | FeeBumpTransaction;
  tx.sign(_activeKeypair);
  return tx.toXDR();
}
