/**
 * Typed contract bindings for the StellarScribe Soroban smart contract.
 * These types mirror the Rust contract data structures.
 */

// ─── Contract Types ─────────────────────────────────────────────────────────

export interface ContentNFT {
  token_id: number;
  author: string;
  title: string;
  content_hash: string;
  excerpt: string;
  created_at: number;
  is_token_gated: boolean;
  access_price: bigint;  // in stroops (1 XLM = 10_000_000)
  total_raised: bigint;
  access_count: number;
  tip_count: number;
}

export interface AuthorProfile {
  address: string;
  name: string;
  bio: string;
  article_count: number;
  total_earned: bigint;
  registered_at: number;
}

// ─── Contract Error Codes (matching the Rust enum) ──────────────────────────

export enum ContractError {
  AlreadyInitialized = 1,
  NotInitialized = 2,
  Unauthorized = 3,
  AuthorAlreadyRegistered = 4,
  AuthorNotFound = 5,
  ContentNotFound = 6,
  InsufficientPayment = 7,
  AlreadyHasAccess = 8,
  NotTokenGated = 9,
  NoEarnings = 10,
  InvalidInput = 11,
  InvalidTipAmount = 12,
}

export const ContractErrorMessages: Record<number, string> = {
  1: 'Contract has already been initialized',
  2: 'Contract has not been initialized',
  3: 'Unauthorized — you are not the admin',
  4: 'Author profile already registered for this address',
  5: 'Author profile not found — please register first',
  6: 'Content not found',
  7: 'Insufficient payment amount',
  8: 'You already have access to this content',
  9: 'This content is not token-gated',
  10: 'No earnings to withdraw',
  11: 'Invalid input parameters',
  12: 'Tip amount must be positive',
};

// ─── Conversion Helpers ─────────────────────────────────────────────────────

/** Convert XLM to stroops (1 XLM = 10,000,000 stroops) */
export function xlmToStroops(xlm: number): bigint {
  return BigInt(Math.round(xlm * 10_000_000));
}

/** Convert stroops to XLM */
export function stroopsToXlm(stroops: bigint | number): number {
  return Number(stroops) / 10_000_000;
}

/** Format stroops as XLM string */
export function formatXlm(stroops: bigint | number): string {
  const xlm = stroopsToXlm(stroops);
  return xlm.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// ─── Contract Method Names ──────────────────────────────────────────────────

export const CONTRACT_METHODS = {
  INITIALIZE: 'initialize',
  REGISTER_AUTHOR: 'register_author',
  UPDATE_AUTHOR: 'update_author',
  GET_AUTHOR: 'get_author',
  MINT_CONTENT: 'mint_content',
  PURCHASE_ACCESS: 'purchase_access',
  HAS_ACCESS: 'has_access',
  TIP_AUTHOR: 'tip_author',
  GET_CONTENT: 'get_content',
  GET_ALL_CONTENT_IDS: 'get_all_content_ids',
  GET_AUTHOR_CONTENT_IDS: 'get_author_content_ids',
  GET_CONTENT_OWNER: 'get_content_owner',
  GET_NEXT_TOKEN_ID: 'get_next_token_id',
  GET_TOTAL_CONTENT: 'get_total_content',
} as const;

// ─── Content Hash Utility ───────────────────────────────────────────────────

/** Generate a SHA-256 hash of content for on-chain verification */
export async function hashContent(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
