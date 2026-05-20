/**
 * Privy ↔ Stellar Bridge
 * ────────────────────────────
 * يحوّل توقيعات Privy raw_sign إلى توقيعات XDR صالحة على شبكة Stellar.
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

// ─── Types ──────────────────────────────────────────────────────────────────

export interface StellarWalletLike {
  address: string;
  chainType?: 'stellar' | string;
  rawSign?: (input: { hash: string }) => Promise<{ signature: string }>;
  signRawHash?: (input: { hash: string }) => Promise<{ signature: string }>;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * هل العنوان عنوان Stellar صالح؟
 * Stellar pubkeys: تبدأ بـ G وطولها 56 حرفاً (Strkey/Base32).
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
 * استخراج محفظة Stellar من قائمة محافظ Privy.
 * يجرب عدة معايير لزيادة الموثوقية بين إصدارات SDK المختلفة:
 *   1. chainType === 'stellar'
 *   2. عنوان يبدأ بـ G وطوله 56
 */
export function findStellarWallet(
  wallets: readonly any[] | undefined
): StellarWalletLike | null {
  if (!wallets || wallets.length === 0) return null;

  const byChainType = wallets.find((w: any) => w?.chainType === 'stellar');
  if (byChainType) return byChainType as StellarWalletLike;

  const byAddrShape = wallets.find((w: any) => isStellarAddress(w?.address));
  if (byAddrShape) return byAddrShape as StellarWalletLike;

  return null;
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
      `hasRawSign=${typeof w?.rawSign === 'function' || typeof w?.signRawHash === 'function'}`
    );
  });
}

function bufferToHex(buf: Buffer | Uint8Array): string {
  return '0x' + Buffer.from(buf).toString('hex');
}

function hexToBuffer(hex: string): Buffer {
  return Buffer.from(hex.replace(/^0x/, ''), 'hex');
}

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

export async function signStellarTransactionWithPrivy(
  xdrString: string,
  wallet: StellarWalletLike,
  networkPassphrase: string = Networks.TESTNET
): Promise<string> {
  if (!wallet) {
    throw new Error('Wallet ليست متوفرة.');
  }
  if (!isStellarAddress(wallet.address)) {
    throw new Error(
      `العنوان "${wallet.address}" ليس عنوان Stellar صالح. ` +
      `يبدو أن Privy لم تنشئ محفظة Stellar — تحقق من إعدادات Privy.`
    );
  }

  const tx = TransactionBuilder.fromXDR(xdrString, networkPassphrase) as
    | Transaction
    | FeeBumpTransaction;

  const txHash = tx.hash();
  const signature = await privyRawSign(wallet, txHash);

  const keypair = Keypair.fromPublicKey(wallet.address);
  const hint = keypair.signatureHint();

  const decoratedSig = new xdr.DecoratedSignature({
    hint,
    signature,
  });
  tx.signatures.push(decoratedSig);

  return tx.toXDR();
}

export function isStellarWalletReady(wallet: any): wallet is StellarWalletLike {
  return (
    !!wallet &&
    isStellarAddress(wallet.address) &&
    typeof (wallet.rawSign || wallet.signRawHash) === 'function'
  );
}
