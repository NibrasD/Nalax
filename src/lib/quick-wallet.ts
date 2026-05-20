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

export async function fundFromFriendbot(address: string): Promise<boolean> {
  try {
    const res = await fetch(`https://friendbot.stellar.org?addr=${address}`);
    if (res.ok) {
      console.info(`[quick-wallet] ✅ مُموَّلة: ${address}`);
      return true;
    }
    return false;
  } catch (e) {
    console.warn('[quick-wallet] Friendbot فشل (الحساب قد يكون مُموَّلاً مسبقاً):', e);
    return false;
  }
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
