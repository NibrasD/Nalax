/**
 * Privy ↔ Stellar Bridge
 * ────────────────────────────
 * يحوّل توقيعات Privy raw_sign إلى توقيعات XDR صالحة على شبكة Stellar.
 *
 * كيف يعمل التوقيع على Stellar:
 *   1. نبني المعاملة (TransactionBuilder)
 *   2. نحسب hash للمعاملة → tx.hash() = SHA-256(network_id + envelope_type + tx)
 *   3. نطلب من Privy توقيع الـ hash بـ Ed25519 (raw_sign)
 *   4. نبني DecoratedSignature(hint = آخر 4 bytes من المفتاح العام، signature)
 *   5. نضيفها لـ tx.signatures ونعيد XDR
 */

import { Buffer } from 'buffer';
import {
  TransactionBuilder,
  Networks,
  Keypair,
  xdr,
  FeeBumpTransaction,
  Transaction,
} from '@stellar/stellar-sdk';
import type { ConnectedWallet } from '@privy-io/react-auth';

// ─── Types ──────────────────────────────────────────────────────────────────

/**
 * أي wallet object من Privy يدعم rawSign على chain من Tier 2 (مثل Stellar).
 * Privy يضيف الـ method ديناميكياً للمحافظ من نوع Tier 2.
 */
export interface StellarWalletLike {
  address: string;
  chainType: 'stellar' | string;
  rawSign?: (input: { hash: string }) => Promise<{ signature: string }>;
  // بعض إصدارات Privy تستخدم signRawHash بدلاً من rawSign
  signRawHash?: (input: { hash: string }) => Promise<{ signature: string }>;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * استخراج محفظة Stellar من قائمة محافظ Privy.
 */
export function findStellarWallet(
  wallets: readonly ConnectedWallet[] | undefined
): StellarWalletLike | null {
  if (!wallets || wallets.length === 0) return null;
  const stellar = wallets.find((w: any) => w.chainType === 'stellar');
  return (stellar as any as StellarWalletLike) ?? null;
}

/**
 * تحويل Buffer إلى hex string بصيغة 0x... كما تتوقع Privy.
 */
function bufferToHex(buf: Buffer | Uint8Array): string {
  return '0x' + Buffer.from(buf).toString('hex');
}

/**
 * تحويل hex string من Privy إلى Buffer.
 */
function hexToBuffer(hex: string): Buffer {
  return Buffer.from(hex.replace(/^0x/, ''), 'hex');
}

/**
 * توقيع hash خام عبر Privy. يدعم كلا الاسمين (rawSign أو signRawHash)
 * احتياطاً لاختلاف الإصدارات.
 */
async function privyRawSign(
  wallet: StellarWalletLike,
  hash: Buffer
): Promise<Buffer> {
  const hashHex = bufferToHex(hash);
  const signFn = wallet.rawSign || wallet.signRawHash;
  if (!signFn) {
    throw new Error(
      'محفظة Privy لا تدعم rawSign. تأكد من أن chainType=stellar وأن SDK محدّث (@privy-io/react-auth@^3).'
    );
  }
  const result = await signFn.call(wallet, { hash: hashHex });
  if (!result?.signature) {
    throw new Error('Privy rawSign أرجع نتيجة فارغة.');
  }
  return hexToBuffer(result.signature);
}

// ─── Main Signing Function ──────────────────────────────────────────────────

/**
 * توقيع معاملة Stellar XDR بمفتاح المستخدم في Privy.
 *
 * @param xdrString  المعاملة المُجمَّعة (بعد simulate إن كانت Soroban)
 * @param wallet     محفظة Stellar من Privy useWallets()
 * @param networkPassphrase  افتراضياً Networks.TESTNET
 * @returns          XDR موقَّع جاهز لـ submitTransaction
 */
export async function signStellarTransactionWithPrivy(
  xdrString: string,
  wallet: StellarWalletLike,
  networkPassphrase: string = Networks.TESTNET
): Promise<string> {
  if (!wallet || wallet.chainType !== 'stellar') {
    throw new Error('Wallet ليست من نوع Stellar.');
  }
  if (!wallet.address) {
    throw new Error('عنوان محفظة Stellar غير متوفر.');
  }

  // 1. parse الـ XDR إلى Transaction object
  const tx = TransactionBuilder.fromXDR(xdrString, networkPassphrase) as
    | Transaction
    | FeeBumpTransaction;

  // 2. حساب hash المعاملة (هذا ما سيُوقَّع)
  const txHash = tx.hash(); // Buffer of 32 bytes

  // 3. توقيع الـ hash عبر Privy raw_sign
  const signature = await privyRawSign(wallet, txHash);

  // 4. بناء signature hint (آخر 4 bytes من المفتاح العام)
  const keypair = Keypair.fromPublicKey(wallet.address);
  const hint = keypair.signatureHint();

  // 5. إضافة DecoratedSignature إلى المعاملة
  const decoratedSig = new xdr.DecoratedSignature({
    hint,
    signature,
  });
  tx.signatures.push(decoratedSig);

  // 6. إعادة XDR موقَّع
  return tx.toXDR();
}

/**
 * مساعد للتحقق من صلاحية محفظة Privy للتوقيع على Stellar.
 */
export function isStellarWalletReady(wallet: any): wallet is StellarWalletLike {
  return (
    !!wallet &&
    wallet.chainType === 'stellar' &&
    typeof wallet.address === 'string' &&
    wallet.address.startsWith('G') &&
    wallet.address.length === 56 &&
    typeof (wallet.rawSign || wallet.signRawHash) === 'function'
  );
}
