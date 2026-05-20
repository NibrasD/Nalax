/**
 * Privy ↔ Stellar Bridge (Deterministic Derivation Approach)
 * ───────────────────────────────────────────────────────────
 *
 * الفلسفة:
 *   Privy v3 React SDK لا يدعم خلق محفظة Stellar إذا كانت ETH موجودة
 *   ("User already has an embedded wallet"). الحل العملي:
 *
 *   1. ندَع Privy ينشئ ETH wallet كالعادة
 *   2. نطلب من ETH wallet توقيع رسالة ثابتة (deterministic ECDSA)
 *   3. نأخذ التوقيع → SHA-256 → 32 bytes → Ed25519 seed → Stellar Keypair
 *   4. نوقّع معاملات Soroban محلياً بهذا الـ Keypair
 *
 *   النتيجة: نفس الإيميل = نفس عنوان Stellar (G...) دائماً، حتى من جهاز آخر.
 */

import { Buffer } from 'buffer';
import {
  TransactionBuilder,
  Networks,
  Keypair,
  FeeBumpTransaction,
  Transaction,
  hash as stellarHash,
} from '@stellar/stellar-sdk';

// ─── الرسالة الثابتة لاستخراج المفتاح ─────────────────────────────────────────
// تغيير هذه الرسالة سيُغيّر كل عناوين Stellar للمستخدمين الحاليين.
// لا تُعدّلها بعد الإصدار للإنتاج.
export const STELLAR_DERIVATION_MESSAGE =
  'Nalax Stellar Wallet Derivation v1\n' +
  'Network: Stellar Testnet\n' +
  'By signing this, you authorize the creation of your Stellar wallet on Nalax.';

// ─── Types ──────────────────────────────────────────────────────────────────

/**
 * أي wallet object من Privy له signMessage (المحفظة الـ Ethereum الافتراضية).
 */
export interface PrivyEthWalletLike {
  address: string;
  chainType?: string;
  signMessage?: (input: { message: string }) => Promise<{ signature: string }>;
  // قد تستخدم بعض الإصدارات API مختلفة:
  sign?: (message: string) => Promise<string>;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * هل العنوان عنوان Stellar صالح؟
 */
export function isStellarAddress(addr: unknown): addr is string {
  return (
    typeof addr === 'string' &&
    addr.length === 56 &&
    addr.startsWith('G') &&
    /^[A-Z2-7]+$/.test(addr)
  );
}

/**
 * استخراج محفظة Ethereum من Privy (ستستخدم لتوقيع رسالة الاستخراج).
 */
export function findEthereumWallet(
  wallets: readonly any[] | undefined
): PrivyEthWalletLike | null {
  if (!wallets || wallets.length === 0) return null;
  const eth = wallets.find(
    (w: any) =>
      w?.chainType === 'ethereum' ||
      (typeof w?.address === 'string' && w.address.startsWith('0x'))
  );
  return (eth as any as PrivyEthWalletLike) ?? null;
}

/**
 * طباعة قائمة المحافظ في console لمساعدة الـ debugging.
 */
export function debugWallets(wallets: readonly any[] | undefined, label = 'wallets') {
  if (!wallets || wallets.length === 0) {
    console.info(`[privy:${label}] empty wallets list`);
    return;
  }
  console.info(`[privy:${label}] ${wallets.length} wallet(s):`);
  wallets.forEach((w: any, i: number) => {
    console.info(
      `  #${i}: chainType=${w?.chainType ?? '?'}, ` +
      `walletClientType=${w?.walletClientType ?? '?'}, ` +
      `address=${w?.address ?? '?'}, ` +
      `hasSignMessage=${typeof w?.signMessage === 'function'}`
    );
  });
}

function hexToBuffer(hex: string): Buffer {
  return Buffer.from(hex.replace(/^0x/, ''), 'hex');
}

// ─── استخراج Stellar Keypair من توقيع ETH ──────────────────────────────────

/**
 * استدعاء signMessage على محفظة Privy. يدعم عدة API shapes.
 */
async function callSignMessage(
  wallet: PrivyEthWalletLike,
  message: string
): Promise<string> {
  if (typeof wallet.signMessage === 'function') {
    const r: any = await wallet.signMessage({ message });
    if (typeof r === 'string') return r;
    if (r?.signature) return r.signature;
    throw new Error('signMessage أرجع شكل غير متوقع');
  }
  if (typeof wallet.sign === 'function') {
    return await wallet.sign(message);
  }
  throw new Error('محفظة Privy لا تدعم signMessage');
}

/**
 * استخراج Stellar Keypair بشكل deterministic من ETH signature.
 *
 * @param ethWallet  محفظة Ethereum من Privy (لها signMessage)
 * @returns          { keypair, address } لـ Stellar
 */
export async function deriveStellarKeypairFromPrivy(
  ethWallet: PrivyEthWalletLike
): Promise<{ keypair: Keypair; address: string }> {
  if (!ethWallet?.address) {
    throw new Error('محفظة Ethereum غير متوفرة في Privy.');
  }

  // 1. اطلب من ETH wallet توقيع الرسالة الثابتة
  const sigHex = await callSignMessage(ethWallet, STELLAR_DERIVATION_MESSAGE);
  const sigBytes = hexToBuffer(sigHex);

  // 2. SHA-256 على التوقيع → 32 bytes seed
  const seed32 = stellarHash(sigBytes);

  // 3. أنشئ Stellar Keypair من الـ seed
  const keypair = Keypair.fromRawEd25519Seed(seed32);
  return { keypair, address: keypair.publicKey() };
}

// ─── إدارة الـ keypair في الذاكرة ─────────────────────────────────────────────

let _activeKeypair: Keypair | null = null;
let _activeAddress: string | null = null;

export function setActiveStellarKeypair(kp: Keypair | null) {
  _activeKeypair = kp;
  _activeAddress = kp?.publicKey() ?? null;
}

export function getActiveStellarAddress(): string | null {
  return _activeAddress;
}

// ─── Main Signing Function ──────────────────────────────────────────────────

/**
 * توقيع معاملة Stellar XDR محلياً بالـ keypair المُستخرَج.
 */
export async function signStellarTransactionWithPrivy(
  xdrString: string,
  _walletIgnored: any,
  networkPassphrase: string = Networks.TESTNET
): Promise<string> {
  if (!_activeKeypair) {
    throw new Error(
      'لم يتم استخراج Stellar Keypair بعد. سجّل الدخول بالإيميل أولاً.'
    );
  }

  const tx = TransactionBuilder.fromXDR(xdrString, networkPassphrase) as
    | Transaction
    | FeeBumpTransaction;

  // التوقيع المحلي بـ stellar-sdk
  tx.sign(_activeKeypair);

  return tx.toXDR();
}
