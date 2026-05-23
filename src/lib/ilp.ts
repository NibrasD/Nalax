/**
 * InterLedger Protocol (ILP) — Web Monetization & Cross-chain Tips
 * ─────────────────────────────────────────────────────────────────
 * يوفر:
 *   • Web Monetization API — streaming micropayments أثناء القراءة
 *   • Cross-chain Tips — إرسال إكراميات من أي عملة عبر ILP
 *   • Payment Pointer management — إدارة عنوان الدفع لكل كاتب
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PaymentPointer {
  /** e.g. $wallet.nalax.com/username or $ilp.uphold.com/abc123 */
  pointer: string;
  /** The Stellar address linked to this payment pointer */
  stellarAddress: string;
  /** Display label */
  label?: string;
}

export interface MonetizationState {
  isMonetized: boolean;
  isStreaming: boolean;
  totalReceived: number;
  currency: string;
  paymentPointer: string | null;
  sessionPayments: MonetizationPayment[];
}

export interface MonetizationPayment {
  amount: number;
  currency: string;
  timestamp: number;
  requestId: string;
}

export interface CrossChainTipRequest {
  /** Source currency (ETH, BTC, XRP, USD, EUR, etc.) */
  sourceCurrency: string;
  /** Amount in source currency */
  sourceAmount: number;
  /** Destination payment pointer */
  destinationPointer: string;
  /** Destination currency (defaults to XLM) */
  destinationCurrency: string;
}

export interface CrossChainTipResult {
  success: boolean;
  txId: string;
  sourceAmount: number;
  sourceCurrency: string;
  destinationAmount: number;
  destinationCurrency: string;
  exchangeRate: number;
  fee: number;
}

export interface StreamingSession {
  id: string;
  paymentPointer: string;
  startTime: number;
  totalSent: number;
  currency: string;
  ratePerSecond: number;
  isActive: boolean;
}

// ─── Supported currencies for cross-chain tips ──────────────────────────────

export const SUPPORTED_CURRENCIES = [
  { code: 'XLM', name: 'Stellar Lumens', icon: '⭐', network: 'Stellar' },
  { code: 'ETH', name: 'Ethereum', icon: '⟠', network: 'Ethereum' },
  { code: 'BTC', name: 'Bitcoin', icon: '₿', network: 'Bitcoin' },
  { code: 'XRP', name: 'Ripple', icon: '✕', network: 'XRPL' },
  { code: 'USDC', name: 'USD Coin', icon: '💵', network: 'Multi' },
  { code: 'SOL', name: 'Solana', icon: '◎', network: 'Solana' },
] as const;

export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number]['code'];

// ─── Payment Pointer Utilities ──────────────────────────────────────────────

/**
 * Generate a payment pointer for a Nalax author.
 * Format: $nalax.app/{stellarAddress}
 */
export function generatePaymentPointer(stellarAddress: string): string {
  return `$nalax.app/${stellarAddress.slice(0, 8).toLowerCase()}`;
}

/**
 * Validate a payment pointer format.
 * Must start with $ and contain at least a domain.
 */
export function isValidPaymentPointer(pointer: string): boolean {
  if (!pointer || !pointer.startsWith('$')) return false;
  const withoutDollar = pointer.slice(1);
  // Must have domain-like structure
  return /^[a-zA-Z0-9][a-zA-Z0-9.-]+[a-zA-Z0-9](\/.*)?$/.test(withoutDollar);
}

/**
 * Convert a payment pointer to a URL for SPSP resolution.
 * $wallet.example.com/alice → https://wallet.example.com/alice
 */
export function paymentPointerToUrl(pointer: string): string {
  if (!pointer.startsWith('$')) return pointer;
  return `https://${pointer.slice(1)}`;
}

// ─── Web Monetization API ───────────────────────────────────────────────────

/**
 * Check if the browser supports Web Monetization API.
 */
export function isWebMonetizationSupported(): boolean {
  return typeof document !== 'undefined' && 'monetization' in document;
}

/**
 * Create the monetization meta tag for an article.
 * This enables streaming payments from readers who have Web Monetization enabled.
 */
export function createMonetizationTag(paymentPointer: string): HTMLMetaElement | null {
  if (typeof document === 'undefined') return null;
  
  // Remove any existing monetization tag
  removeMonetizationTag();
  
  const meta = document.createElement('meta');
  meta.name = 'monetization';
  meta.content = paymentPointer;
  document.head.appendChild(meta);
  
  return meta;
}

/**
 * Remove the monetization meta tag.
 */
export function removeMonetizationTag(): void {
  if (typeof document === 'undefined') return;
  const existing = document.querySelector('meta[name="monetization"]');
  if (existing) existing.remove();
}

/**
 * Subscribe to Web Monetization events and track payments.
 * Returns a cleanup function.
 */
export function subscribeToMonetization(
  onPayment: (payment: MonetizationPayment) => void,
  onStart?: () => void,
  onStop?: () => void,
): () => void {
  if (!isWebMonetizationSupported()) return () => {};

  const monetization = (document as any).monetization;

  const handleStart = () => onStart?.();
  const handleStop = () => onStop?.();
  const handleProgress = (event: any) => {
    const payment: MonetizationPayment = {
      amount: Number(event.detail?.amount || 0) / Math.pow(10, event.detail?.assetScale || 9),
      currency: event.detail?.assetCode || 'XLM',
      timestamp: Date.now(),
      requestId: event.detail?.requestId || crypto.randomUUID(),
    };
    onPayment(payment);
  };

  monetization?.addEventListener('monetizationstart', handleStart);
  monetization?.addEventListener('monetizationstop', handleStop);
  monetization?.addEventListener('monetizationprogress', handleProgress);

  return () => {
    monetization?.removeEventListener('monetizationstart', handleStart);
    monetization?.removeEventListener('monetizationstop', handleStop);
    monetization?.removeEventListener('monetizationprogress', handleProgress);
  };
}

// ─── Streaming Micropayments (Simulated for Testnet) ────────────────────────

const STREAMING_RATE_PER_SECOND = 0.001; // 0.001 XLM per second of reading

/**
 * Start a streaming payment session.
 * In production, this would connect to a real ILP connector (Rafiki).
 * For testnet/demo, we simulate the streaming.
 */
export function createStreamingSession(paymentPointer: string): StreamingSession {
  return {
    id: crypto.randomUUID(),
    paymentPointer,
    startTime: Date.now(),
    totalSent: 0,
    currency: 'XLM',
    ratePerSecond: STREAMING_RATE_PER_SECOND,
    isActive: true,
  };
}

/**
 * Calculate the total payment for a streaming session based on elapsed time.
 */
export function calculateStreamingTotal(session: StreamingSession): number {
  if (!session.isActive) return session.totalSent;
  const elapsed = (Date.now() - session.startTime) / 1000; // seconds
  return elapsed * session.ratePerSecond;
}

/**
 * End a streaming session and return the final amount.
 */
export function endStreamingSession(session: StreamingSession): StreamingSession {
  return {
    ...session,
    isActive: false,
    totalSent: calculateStreamingTotal(session),
  };
}

// ─── Cross-Chain Tips via ILP ───────────────────────────────────────────────

/**
 * Mock exchange rates for demo purposes.
 * In production, these would come from a real ILP connector or DEX.
 */
const EXCHANGE_RATES: Record<string, number> = {
  'ETH_XLM': 8500,    // 1 ETH ≈ 8500 XLM
  'BTC_XLM': 170000,  // 1 BTC ≈ 170000 XLM
  'XRP_XLM': 1.8,     // 1 XRP ≈ 1.8 XLM
  'USDC_XLM': 2.7,    // 1 USDC ≈ 2.7 XLM
  'SOL_XLM': 420,     // 1 SOL ≈ 420 XLM
  'XLM_XLM': 1,       // 1:1
};

/**
 * Get the exchange rate between two currencies.
 */
export function getExchangeRate(from: string, to: string): number {
  if (from === to) return 1;
  const key = `${from}_${to}`;
  return EXCHANGE_RATES[key] || 1;
}

/**
 * Get a quote for a cross-chain tip.
 * Returns the estimated destination amount and fee.
 */
export function getCrossChainQuote(
  sourceCurrency: string,
  sourceAmount: number,
  destinationCurrency: string = 'XLM'
): { destinationAmount: number; fee: number; rate: number } {
  const rate = getExchangeRate(sourceCurrency, destinationCurrency);
  const grossAmount = sourceAmount * rate;
  // ILP connector fee: 0.1%
  const fee = grossAmount * 0.001;
  const destinationAmount = grossAmount - fee;
  
  return {
    destinationAmount: Math.round(destinationAmount * 10000) / 10000,
    fee: Math.round(fee * 10000) / 10000,
    rate,
  };
}

/**
 * Execute a cross-chain tip via ILP.
 * In production, this would:
 *   1. Connect to an ILP connector (Rafiki)
 *   2. Resolve the recipient's SPSP endpoint
 *   3. Negotiate the payment path
 *   4. Stream the payment across chains
 * 
 * For testnet/demo, we simulate the ILP routing and convert to a Stellar payment.
 */
export async function sendCrossChainTip(
  request: CrossChainTipRequest
): Promise<CrossChainTipResult> {
  const { sourceCurrency, sourceAmount, destinationPointer, destinationCurrency } = request;
  
  // Validate
  if (sourceAmount <= 0) throw new Error('Amount must be positive');
  if (!isValidPaymentPointer(destinationPointer)) throw new Error('Invalid payment pointer');
  
  // Get quote
  const quote = getCrossChainQuote(sourceCurrency, sourceAmount, destinationCurrency);
  
  // Simulate ILP routing delay (packet exchange)
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // In production, this is where the actual ILP STREAM protocol would execute
  // For now, we return the simulated result
  const result: CrossChainTipResult = {
    success: true,
    txId: `ilp_${crypto.randomUUID().slice(0, 16)}`,
    sourceAmount,
    sourceCurrency,
    destinationAmount: quote.destinationAmount,
    destinationCurrency,
    exchangeRate: quote.rate,
    fee: quote.fee,
  };
  
  return result;
}

// ─── SPSP (Simple Payment Setup Protocol) ───────────────────────────────────

/**
 * Resolve a payment pointer to get the SPSP endpoint details.
 * In production, this makes an HTTP request to the payment pointer URL.
 */
export async function resolveSPSP(paymentPointer: string): Promise<{
  destinationAccount: string;
  sharedSecret: string;
  receiptsEnabled: boolean;
}> {
  // Simulated SPSP resolution for testnet
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return {
    destinationAccount: `g.nalax.${paymentPointer.replace('$', '').replace(/[/.]/g, '_')}`,
    sharedSecret: btoa(crypto.randomUUID()),
    receiptsEnabled: true,
  };
}

// ─── Open Payments API helpers ──────────────────────────────────────────────

/**
 * Create an incoming payment on the recipient's wallet.
 * Part of the Open Payments standard (built on ILP).
 */
export async function createIncomingPayment(
  paymentPointer: string,
  amount: number,
  currency: string = 'XLM'
): Promise<{ id: string; ilpAddress: string; expiresAt: string }> {
  // Simulated for testnet
  await new Promise(resolve => setTimeout(resolve, 300));
  
  return {
    id: `pay_${crypto.randomUUID().slice(0, 12)}`,
    ilpAddress: `g.nalax.${Date.now()}`,
    expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour
  };
}

/**
 * Format a streaming amount for display.
 */
export function formatStreamingAmount(amount: number, currency: string = 'XLM'): string {
  if (amount < 0.001) return `< 0.001 ${currency}`;
  if (amount < 1) return `${amount.toFixed(4)} ${currency}`;
  return `${amount.toFixed(2)} ${currency}`;
}

/**
 * Format streaming rate for display.
 */
export function formatStreamingRate(ratePerSecond: number, currency: string = 'XLM'): string {
  const perMinute = ratePerSecond * 60;
  if (perMinute < 0.01) return `~${(perMinute * 1000).toFixed(1)} m${currency}/min`;
  return `~${perMinute.toFixed(3)} ${currency}/min`;
}
