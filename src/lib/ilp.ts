/**
 * InterLedger Protocol (ILP) — Web Monetization & Cross-chain Tips
 * ─────────────────────────────────────────────────────────────────
 * تنفيذ حقيقي:
 *   • Web Monetization API — يستخدم `<link rel="monetization">` الحقيقي
 *     ويستمع لحدث `monetization` من المتصفح
 *   • Cross-chain Tips — يستخدم Stellar Path Payments (DEX) لتحويل
 *     العملات فعلياً على الشبكة
 *   • XLM Tips — دفع حقيقي مباشر عبر Stellar
 */

import { TransactionBuilder, Networks, Asset, Operation, Memo } from '@stellar/stellar-sdk';
import { signTransaction } from '@stellar/freighter-api';
import { server, waitForTransaction } from './stellar';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PaymentPointer {
  /** Wallet address URL, e.g. https://ilp.rafiki.money/alice */
  pointer: string;
  /** The Stellar address linked to this payment pointer */
  stellarAddress: string;
  label?: string;
}

export interface MonetizationPayment {
  amount: number;
  currency: string;
  timestamp: number;
  paymentPointer: string;
  receipt?: string;
}

export interface CrossChainTipRequest {
  senderPublicKey: string;
  destinationAddress: string;
  /** Amount the recipient should receive in XLM */
  destinationAmountXLM: string;
  /** Source asset code (e.g. 'USDC', 'BTC') */
  sourceAssetCode: string;
  /** Source asset issuer (Stellar anchor issuer address) */
  sourceAssetIssuer: string;
  /** Maximum amount sender is willing to spend in source asset */
  maxSourceAmount: string;
}

export interface CrossChainTipResult {
  success: boolean;
  txHash: string;
  sourceAmount: string;
  sourceCurrency: string;
  destinationAmount: string;
  destinationCurrency: string;
}

export interface StreamingSession {
  id: string;
  paymentPointer: string;
  startTime: number;
  totalReceived: number;
  currency: string;
  isActive: boolean;
  payments: MonetizationPayment[];
}

// ─── Supported assets on Stellar testnet for path payments ──────────────────

export const STELLAR_ASSETS = [
  {
    code: 'XLM',
    name: 'Stellar Lumens',
    icon: '⭐',
    network: 'Stellar',
    issuer: null, // native
    isNative: true,
  },
  {
    code: 'USDC',
    name: 'USD Coin',
    icon: '💵',
    network: 'Stellar',
    issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5', // testnet anchor
    isNative: false,
  },
  {
    code: 'BTC',
    name: 'Bitcoin (wrapped)',
    icon: '₿',
    network: 'Stellar',
    issuer: 'GDPJALI4AZKUU2W426U5WKMAT6CN3AJRPIIRYR2YM54TL2GDWO5O2MZM', // testnet anchor
    isNative: false,
  },
  {
    code: 'ETH',
    name: 'Ethereum (wrapped)',
    icon: '⟠',
    network: 'Stellar',
    issuer: 'GBDEVU63Y6NTHJQQZIKVTC23NWLQHMAXOZZLM2JXWI5NUHQU7AH5DAE6', // testnet anchor
    isNative: false,
  },
] as const;

export type SupportedAssetCode = typeof STELLAR_ASSETS[number]['code'];

// ─── Payment Pointer / Wallet Address ───────────────────────────────────────

/**
 * Generate a wallet address for a Nalax author.
 * Uses the InterLedger test wallet format.
 * In production, this would point to a real Open Payments-enabled wallet.
 */
export function generatePaymentPointer(stellarAddress: string): string {
  // Use the ILP testnet wallet format
  return `https://ilp.interledger-test.dev/${stellarAddress.slice(0, 12).toLowerCase()}`;
}

/**
 * Validate a wallet address (payment pointer) format.
 * Accepts both $pointer and https:// formats.
 */
export function isValidPaymentPointer(pointer: string): boolean {
  if (!pointer) return false;
  // $wallet.example.com/path format
  if (pointer.startsWith('$')) {
    const withoutDollar = pointer.slice(1);
    return /^[a-zA-Z0-9][a-zA-Z0-9.-]+[a-zA-Z0-9](\/.*)?$/.test(withoutDollar);
  }
  // https://wallet.example.com/path format
  try {
    const url = new URL(pointer);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Convert a payment pointer ($format) to a URL.
 */
export function paymentPointerToUrl(pointer: string): string {
  if (pointer.startsWith('$')) return `https://${pointer.slice(1)}`;
  return pointer;
}

// ─── Web Monetization API (Real Implementation) ─────────────────────────────

/**
 * Check if the browser supports Web Monetization.
 * The standard uses `<link rel="monetization">` and a `monetization` event.
 */
export function isWebMonetizationSupported(): boolean {
  if (typeof document === 'undefined') return false;
  // Check for the monetization event support (modern spec)
  return 'monetization' in document || typeof (document as any).monetization !== 'undefined';
}

/**
 * Create a `<link rel="monetization">` tag in the document head.
 * This is the W3C standard way to enable Web Monetization.
 * 
 * When a user has a Web Monetization extension (like the Interledger extension),
 * it will detect this link and start streaming payments to the wallet address.
 * 
 * @see https://webmonetization.org/specification
 */
export function createMonetizationLink(walletAddress: string): HTMLLinkElement | null {
  if (typeof document === 'undefined') return null;

  // Remove any existing monetization link
  removeMonetizationLink();

  const link = document.createElement('link');
  link.rel = 'monetization';
  link.href = walletAddress;
  document.head.appendChild(link);

  return link;
}

/**
 * Remove the monetization link tag.
 */
export function removeMonetizationLink(): void {
  if (typeof document === 'undefined') return;
  const existing = document.querySelector('link[rel="monetization"]');
  if (existing) existing.remove();
}

// Legacy support — keep old function names working
export const createMonetizationTag = createMonetizationLink;
export const removeMonetizationTag = removeMonetizationLink;

/**
 * Subscribe to real Web Monetization events.
 * 
 * The 'monetization' event fires on the document when a payment is received.
 * Each event contains: { amount, assetCode, assetScale, receipt }
 * 
 * Returns a cleanup function.
 */
export function subscribeToMonetization(
  walletAddress: string,
  onPayment: (payment: MonetizationPayment) => void,
  onStart?: () => void,
  onStop?: () => void,
): () => void {
  if (typeof document === 'undefined') return () => {};

  // Set up the monetization link
  const link = createMonetizationLink(walletAddress);
  if (!link) return () => {};

  let isMonetizing = false;

  // Modern spec: 'monetization' event on document
  const handleMonetization = (event: Event) => {
    const detail = (event as CustomEvent).detail || (event as any);
    
    if (!isMonetizing) {
      isMonetizing = true;
      onStart?.();
    }

    const amount = Number(detail?.amount || 0);
    const assetScale = Number(detail?.assetScale || 9);
    const scaledAmount = amount / Math.pow(10, assetScale);

    const payment: MonetizationPayment = {
      amount: scaledAmount,
      currency: detail?.assetCode || 'USD',
      timestamp: Date.now(),
      paymentPointer: walletAddress,
      receipt: detail?.receipt,
    };

    onPayment(payment);
  };

  // Listen on the link element (modern spec) and document (legacy)
  link.addEventListener('monetization', handleMonetization);
  document.addEventListener('monetization', handleMonetization);

  // Legacy: document.monetization events
  const legacyMonetization = (document as any).monetization;
  if (legacyMonetization) {
    legacyMonetization.addEventListener('monetizationstart', () => {
      isMonetizing = true;
      onStart?.();
    });
    legacyMonetization.addEventListener('monetizationstop', () => {
      isMonetizing = false;
      onStop?.();
    });
    legacyMonetization.addEventListener('monetizationprogress', handleMonetization);
  }

  // Cleanup
  return () => {
    link.removeEventListener('monetization', handleMonetization);
    document.removeEventListener('monetization', handleMonetization);
    if (legacyMonetization) {
      legacyMonetization.removeEventListener('monetizationstart', () => {});
      legacyMonetization.removeEventListener('monetizationstop', () => {});
      legacyMonetization.removeEventListener('monetizationprogress', handleMonetization);
    }
    removeMonetizationLink();
    if (isMonetizing) {
      isMonetizing = false;
      onStop?.();
    }
  };
}

// ─── Streaming Session Management ───────────────────────────────────────────

/**
 * Create a streaming session that tracks Web Monetization payments.
 */
export function createStreamingSession(paymentPointer: string): StreamingSession {
  return {
    id: crypto.randomUUID(),
    paymentPointer,
    startTime: Date.now(),
    totalReceived: 0,
    currency: 'USD',
    isActive: true,
    payments: [],
  };
}

/**
 * Add a payment to a streaming session.
 */
export function addPaymentToSession(
  session: StreamingSession,
  payment: MonetizationPayment
): StreamingSession {
  return {
    ...session,
    totalReceived: session.totalReceived + payment.amount,
    payments: [...session.payments, payment],
    currency: payment.currency || session.currency,
  };
}

/**
 * End a streaming session.
 */
export function endStreamingSession(session: StreamingSession): StreamingSession {
  return { ...session, isActive: false };
}

/**
 * Calculate session duration in seconds.
 */
export function getSessionDuration(session: StreamingSession): number {
  return (Date.now() - session.startTime) / 1000;
}

// ─── Real Cross-Chain Tips via Stellar Path Payments ────────────────────────

/**
 * Find payment paths on the Stellar DEX.
 * Uses Horizon's `/paths/strict-receive` endpoint to find the best route.
 * 
 * This queries the REAL Stellar DEX for available liquidity.
 */
export async function findPaymentPaths(
  sourceAccount: string,
  destinationAsset: Asset,
  destinationAmount: string,
): Promise<any[]> {
  const horizonUrl = 'https://horizon-testnet.stellar.org';
  
  const params = new URLSearchParams({
    source_account: sourceAccount,
    destination_asset_type: destinationAsset.isNative() ? 'native' : 'credit_alphanum4',
    destination_amount: destinationAmount,
  });

  if (!destinationAsset.isNative()) {
    params.set('destination_asset_code', destinationAsset.getCode());
    params.set('destination_asset_issuer', destinationAsset.getIssuer());
  }

  try {
    const response = await fetch(`${horizonUrl}/paths/strict-receive?${params}`);
    if (!response.ok) return [];
    const data = await response.json();
    return data._embedded?.records || [];
  } catch (e) {
    console.error('Failed to find payment paths:', e);
    return [];
  }
}

/**
 * Execute a cross-chain tip using Stellar Path Payment.
 * 
 * This sends a REAL transaction on the Stellar network that:
 * 1. Takes the source asset from the sender's account
 * 2. Routes through the Stellar DEX to convert currencies
 * 3. Delivers XLM to the recipient
 * 
 * This is a REAL on-chain transaction, not simulated.
 */
export async function sendCrossChainTip(
  request: CrossChainTipRequest
): Promise<CrossChainTipResult> {
  const {
    senderPublicKey,
    destinationAddress,
    destinationAmountXLM,
    sourceAssetCode,
    sourceAssetIssuer,
    maxSourceAmount,
  } = request;

  // Build the source asset
  const sourceAsset = sourceAssetIssuer
    ? new Asset(sourceAssetCode, sourceAssetIssuer)
    : Asset.native();

  const destAsset = Asset.native(); // XLM

  try {
    const account = await server.getAccount(senderPublicKey);

    const transaction = new TransactionBuilder(account, {
      fee: '100',
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.pathPaymentStrictReceive({
          sendAsset: sourceAsset,
          sendMax: maxSourceAmount,
          destination: destinationAddress,
          destAsset: destAsset,
          destAmount: destinationAmountXLM,
          // path is auto-resolved by the network
          path: [],
        })
      )
      .addMemo(Memo.text('Nalax ILP Tip'))
      .setTimeout(30)
      .build();

    // Sign with Freighter
    const signResult = await signTransaction(transaction.toXDR(), {
      network: 'TESTNET',
      networkPassphrase: Networks.TESTNET,
    });
    const signedXdr = typeof signResult === 'string' ? signResult : (signResult as any).signedTxXdr;

    // Submit
    const response = await server.sendTransaction(
      TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET) as any
    );

    if (response.status === 'ERROR') {
      throw new Error(`Path payment failed: ${JSON.stringify(response)}`);
    }

    const result = await waitForTransaction(response.hash);

    return {
      success: true,
      txHash: result.hash,
      sourceAmount: maxSourceAmount,
      sourceCurrency: sourceAssetCode,
      destinationAmount: destinationAmountXLM,
      destinationCurrency: 'XLM',
    };
  } catch (error: any) {
    console.error('Cross-chain tip error:', error);
    throw error;
  }
}

/**
 * Send a direct XLM tip — real Stellar payment.
 * Uses the standard payment operation.
 */
export async function sendDirectXLMTip(
  senderPublicKey: string,
  destinationAddress: string,
  amountXLM: string,
): Promise<{ success: boolean; txHash: string }> {
  try {
    const account = await server.getAccount(senderPublicKey);

    const transaction = new TransactionBuilder(account, {
      fee: '100',
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.payment({
          destination: destinationAddress,
          asset: Asset.native(),
          amount: amountXLM,
        })
      )
      .addMemo(Memo.text('Nalax Tip'))
      .setTimeout(30)
      .build();

    const signResult = await signTransaction(transaction.toXDR(), {
      network: 'TESTNET',
      networkPassphrase: Networks.TESTNET,
    });
    const signedXdr = typeof signResult === 'string' ? signResult : (signResult as any).signedTxXdr;

    const response = await server.sendTransaction(
      TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET) as any
    );

    if (response.status === 'ERROR') {
      throw new Error(`Payment failed: ${JSON.stringify(response)}`);
    }

    const result = await waitForTransaction(response.hash);
    return { success: true, txHash: result.hash };
  } catch (error: any) {
    console.error('Direct XLM tip error:', error);
    throw error;
  }
}

// ─── Live Exchange Rate from Stellar DEX ────────────────────────────────────

/**
 * Get a REAL exchange rate quote from the Stellar DEX.
 * Queries Horizon orderbook for the current best price.
 */
export async function getLiveExchangeRate(
  sourceAssetCode: string,
  sourceAssetIssuer: string | null,
  destAssetCode: string = 'native',
  destAssetIssuer: string | null = null,
): Promise<{ rate: number; available: boolean }> {
  const horizonUrl = 'https://horizon-testnet.stellar.org';

  const params = new URLSearchParams();

  // Selling (source)
  if (!sourceAssetIssuer) {
    params.set('selling_asset_type', 'native');
  } else {
    params.set('selling_asset_type', 'credit_alphanum4');
    params.set('selling_asset_code', sourceAssetCode);
    params.set('selling_asset_issuer', sourceAssetIssuer);
  }

  // Buying (destination)
  if (destAssetCode === 'native' || !destAssetIssuer) {
    params.set('buying_asset_type', 'native');
  } else {
    params.set('buying_asset_type', 'credit_alphanum4');
    params.set('buying_asset_code', destAssetCode);
    params.set('buying_asset_issuer', destAssetIssuer);
  }

  params.set('limit', '1');

  try {
    const response = await fetch(`${horizonUrl}/order_book?${params}`);
    if (!response.ok) return { rate: 0, available: false };
    const data = await response.json();

    // Get best ask price (what it costs to buy 1 unit of buying asset)
    const asks = data.asks || [];
    if (asks.length === 0) return { rate: 0, available: false };

    const bestPrice = parseFloat(asks[0].price);
    return { rate: bestPrice, available: true };
  } catch {
    return { rate: 0, available: false };
  }
}

// ─── ILP Backend Client (Open Payments API) ─────────────────────────────────

const ILP_SERVER_URL = import.meta.env.VITE_ILP_SERVER_URL || 'http://localhost:3001';

export interface ILPQuoteResult {
  receiverWallet: {
    id: string;
    publicName?: string;
    assetCode: string;
    assetScale: number;
  };
  receiveAmount: { value: string; assetCode: string; assetScale: number };
  debitAmount: { value: string; assetCode: string; assetScale: number };
  fee: { value: string; assetCode: string; assetScale: number };
}

export interface ILPPayResult {
  success: boolean;
  paymentId: string;
  incomingPaymentId: string;
  sentAmount: { value: string; assetCode: string; assetScale: number };
  receiveAmount: { value: string; assetCode: string; assetScale: number };
  receiver: { walletAddress: string; publicName?: string };
  note?: string;
}

/**
 * Check if the ILP backend server is available and configured.
 */
export async function checkILPHealth(): Promise<{
  status: string;
  configured: boolean;
  walletAddress: string | null;
}> {
  try {
    const response = await fetch(`${ILP_SERVER_URL}/api/ilp/health`);
    if (!response.ok) throw new Error('ILP server not available');
    return response.json();
  } catch {
    return { status: 'unavailable', configured: false, walletAddress: null };
  }
}

/**
 * Resolve a receiver's ILP wallet address to get details.
 * Calls the real Open Payments API via our backend.
 */
export async function resolveILPWallet(walletAddress: string): Promise<{
  id: string;
  publicName?: string;
  assetCode: string;
  assetScale: number;
  authServer: string;
  resourceServer: string;
}> {
  const response = await fetch(`${ILP_SERVER_URL}/api/ilp/resolve-wallet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletAddress }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || 'Failed to resolve wallet');
  }

  return response.json();
}

/**
 * Get a quote for an ILP tip.
 * Returns the amount the receiver will get and the fee.
 */
export async function getILPQuote(
  receiverWalletAddress: string,
  amount: string,
  assetCode: string = 'USD',
  assetScale: number = 2,
): Promise<ILPQuoteResult> {
  const response = await fetch(`${ILP_SERVER_URL}/api/ilp/quote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ receiverWalletAddress, amount, assetCode, assetScale }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || 'Failed to get quote');
  }

  return response.json();
}

/**
 * Send a real ILP tip via the Open Payments API.
 * This creates an incoming payment on the receiver's wallet,
 * then an outgoing payment on Nalax's wallet to deliver the funds via ILP.
 */
export async function sendILPTip(
  receiverWalletAddress: string,
  amount: string,
  assetCode: string = 'USD',
  assetScale: number = 2,
  note: string = 'Tip via Nalax',
): Promise<ILPPayResult> {
  const response = await fetch(`${ILP_SERVER_URL}/api/ilp/pay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      receiverWalletAddress,
      amount,
      assetCode,
      assetScale,
      note,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || 'ILP payment failed');
  }

  return response.json();
}

/**
 * Format an ILP amount for display.
 * Converts from smallest unit (scale) to human-readable.
 * e.g. value="1000", assetScale=2 → "10.00"
 */
export function formatILPAmount(value: string, assetScale: number): string {
  const num = parseInt(value, 10) / Math.pow(10, assetScale);
  return num.toFixed(assetScale);
}

// ─── Formatting Utilities ───────────────────────────────────────────────────

export function formatStreamingAmount(amount: number, currency: string = 'USD'): string {
  if (amount === 0) return `0.0000 ${currency}`;
  if (amount < 0.0001) return `< 0.0001 ${currency}`;
  if (amount < 1) return `${amount.toFixed(4)} ${currency}`;
  return `${amount.toFixed(2)} ${currency}`;
}

export function formatStreamingRate(totalAmount: number, durationSeconds: number, currency: string = 'USD'): string {
  if (durationSeconds === 0) return `0 ${currency}/min`;
  const perMinute = (totalAmount / durationSeconds) * 60;
  if (perMinute < 0.001) return `< 0.001 ${currency}/min`;
  return `~${perMinute.toFixed(4)} ${currency}/min`;
}
