import { rpc, TransactionBuilder, Networks, xdr, Contract, Asset, Operation, Memo, nativeToScVal, scValToNative, Address } from '@stellar/stellar-sdk';
import { signTransaction } from '@stellar/freighter-api';
import { CONTRACT_METHODS } from './contract';

const SERVER_URL = 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE = Networks.TESTNET;

// Contract ID — replace with your deployed contract address
export const CONTRACT_ID = 'CAADFXFUZTD6IB5VG4SYTHNHZGFHCIH3P5CX453LUKBMU2HULKFF47F4';

export const server = new rpc.Server(SERVER_URL);

// Read-only account used exclusively to simulate view functions without Wallet connection
export const READ_ONLY_ADDR = 'GAGCT4NM5BYYRG3NSLMGPJWU5KGCXTHVEGUGN5DLRU7MN2KTXBLIJ7WJ';

export async function readSorobanContract(method: string, args: xdr.ScVal[] = []) {
  try {
    const account = await server.getAccount(READ_ONLY_ADDR);
    const contract = new Contract(CONTRACT_ID);
    const operation = contract.call(method, ...args);
    
    const transaction = new TransactionBuilder(account, { fee: '100', networkPassphrase: NETWORK_PASSPHRASE })
      .addOperation(operation)
      .setTimeout(30)
      .build();
      
    const simulated = await server.simulateTransaction(transaction);
    if (!rpc.Api.isSimulationSuccess(simulated)) {
      if (rpc.Api.isSimulationError(simulated)) {
        console.error("Read simulation failed:", simulated.error);
      }
      return null;
    }
    
    return scValToNative(simulated.result.retval);
  } catch (e) {
    console.error("Failed to read from Soroban:", e);
    return null;
  }
}

// ─── Soroban Contract Invocation ────────────────────────────────────────────

/**
 * Invokes a Soroban Smart Contract method via Freighter wallet
 */
export async function invokeSorobanContract(
  publicKey: string,
  contractId: string,
  method: string,
  args: xdr.ScVal[] = []
) {
  try {
    const account = await server.getAccount(publicKey);
    const contract = new Contract(contractId);
    const operation = contract.call(method, ...args);

    let transaction = new TransactionBuilder(account, {
      fee: '100',
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(operation)
      .setTimeout(30)
      .build();

    // Simulate transaction to get footprint and resource limits
    const simulated = await server.simulateTransaction(transaction);
    if (!rpc.Api.isSimulationSuccess(simulated)) {
      let errMsg = 'Contract simulation failed';
      if (rpc.Api.isSimulationError(simulated)) {
        errMsg = typeof simulated.error === 'string' ? simulated.error : JSON.stringify(simulated.error);
      }
      throw new Error(errMsg);
    }

    // Assemble the transaction with the simulation data
    transaction = rpc.assembleTransaction(transaction, simulated).build();

    // Ask Freighter to sign the transaction
    const signResult = await signTransaction(transaction.toXDR(), {
      network: 'TESTNET',
      networkPassphrase: NETWORK_PASSPHRASE,
    });
    const signedTxXdr = typeof signResult === 'string' ? signResult : (signResult as any).signedTxXdr;

    // Submit to Soroban RPC
    const response = await server.sendTransaction(
      TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE) as any
    );

    if (response.status === "ERROR") {
      throw new Error(`Transaction failed: ${JSON.stringify(response)}`);
    }

    // Wait for transaction confirmation
    const txHash = response.hash;
    const result = await waitForTransaction(txHash);
    return result;
  } catch (error) {
    console.error("Soroban invocation error:", error);
    throw error;
  }
}

/**
 * Poll for transaction completion
 */
export async function waitForTransaction(txHash: string, maxAttempts = 30): Promise<any> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const result = await server.getTransaction(txHash);
      
      if (result.status === 'SUCCESS') {
        return {
          hash: txHash,
          status: 'SUCCESS',
          result,
        };
      }
      
      if (result.status === 'FAILED') {
        throw new Error(`Transaction failed on-chain: ${txHash}`);
      }
      
      // NOT_FOUND means still processing
      await new Promise(r => setTimeout(r, 1000));
    } catch (e: any) {
      if (i === maxAttempts - 1) throw e;
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  throw new Error(`Transaction timed out: ${txHash}`);
}

// ─── Contract Helper Methods ────────────────────────────────────────────────

/**
 * Register an author on-chain
 */
export async function registerAuthor(publicKey: string, name: string, bio: string) {
  const args = [
    new Address(publicKey).toScVal(),
    nativeToScVal(name, { type: 'string' }),
    nativeToScVal(bio, { type: 'string' }),
  ];
  return invokeSorobanContract(publicKey, CONTRACT_ID, CONTRACT_METHODS.REGISTER_AUTHOR, args);
}

/**
 * Mint content as an NFT on-chain
 */
export async function mintContent(
  publicKey: string,
  title: string,
  contentHash: string,
  excerpt: string,
  isTokenGated: boolean,
  accessPrice: bigint
) {
  const args = [
    new Address(publicKey).toScVal(),
    nativeToScVal(title, { type: 'string' }),
    nativeToScVal(contentHash, { type: 'string' }),
    nativeToScVal(excerpt, { type: 'string' }),
    nativeToScVal(isTokenGated, { type: 'bool' }),
    nativeToScVal(Number(accessPrice), { type: 'i128' }),
  ];
  return invokeSorobanContract(publicKey, CONTRACT_ID, CONTRACT_METHODS.MINT_CONTENT, args);
}

/**
 * Purchase access to token-gated content
 */
export async function purchaseAccess(publicKey: string, tokenId: number) {
  const args = [
    new Address(publicKey).toScVal(),
    nativeToScVal(tokenId, { type: 'u64' }),
  ];
  return invokeSorobanContract(publicKey, CONTRACT_ID, CONTRACT_METHODS.PURCHASE_ACCESS, args);
}

/**
 * Tip an author via their content token
 */
export async function tipAuthor(publicKey: string, tokenId: number, amount: bigint) {
  const args = [
    new Address(publicKey).toScVal(),
    nativeToScVal(tokenId, { type: 'u64' }),
    nativeToScVal(Number(amount), { type: 'i128' }),
  ];
  return invokeSorobanContract(publicKey, CONTRACT_ID, CONTRACT_METHODS.TIP_AUTHOR, args);
}

// ─── Read-Only Contract Queries ─────────────────────────────────────────────

/**
 * Fetch all content token IDs from the contract (no wallet needed)
 */
export async function fetchAllContentIds(): Promise<number[]> {
  const result = await readSorobanContract(CONTRACT_METHODS.GET_ALL_CONTENT_IDS);
  if (!result || !Array.isArray(result)) return [];
  return result.map((id: any) => Number(id));
}

/**
 * Fetch content metadata for a single token ID (no wallet needed)
 */
export async function fetchContentById(tokenId: number): Promise<any | null> {
  const args = [nativeToScVal(tokenId, { type: 'u64' })];
  return readSorobanContract(CONTRACT_METHODS.GET_CONTENT, args);
}

/**
 * Fetch all articles from the contract, returning them as Article-shaped objects
 */
export async function fetchAllArticlesFromChain(): Promise<any[]> {
  const ids = await fetchAllContentIds();
  if (ids.length === 0) return [];
  
  const articles = await Promise.all(
    ids.map(async (tokenId) => {
      const content = await fetchContentById(tokenId);
      if (!content) return null;
      return {
        id: `onchain-${tokenId}`,
        tokenId: Number(content.token_id),
        title: String(content.title || ''),
        excerpt: String(content.excerpt || ''),
        content: '', // Will be loaded from IPFS on demand
        authorPublicKey: String(content.author || ''),
        createdAt: Number(content.created_at) * 1000, // Convert unix seconds to ms
        contentHash: String(content.content_hash || ''), // This is the IPFS CID
        isTokenGated: Boolean(content.is_token_gated),
        price: Number(content.access_price) / 10_000_000, // stroops to XLM
        totalRaised: Number(content.total_raised) / 10_000_000,
        accessCount: Number(content.access_count),
        tipCount: Number(content.tip_count),
        status: 'minted' as const,
        tags: [],
        readTime: '3 min read',
      };
    })
  );
  
  return articles.filter(Boolean);
}

/**
 * Executes a standard Stellar Payment operation via Freighter
 */
export async function sendStellarPayment(
  senderPublicKey: string,
  destination: string,
  amount: string,
  asset: Asset = Asset.native()
) {
  try {
    const account = await server.getAccount(senderPublicKey);

    const transaction = new TransactionBuilder(account, {
      fee: '100',
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        Operation.payment({
          destination,
          asset,
          amount,
        })
      )
      .setTimeout(30)
      .build();

    const signResult = await signTransaction(transaction.toXDR(), {
      network: 'TESTNET',
      networkPassphrase: NETWORK_PASSPHRASE,
    });
    const signedTxXdr = typeof signResult === 'string' ? signResult : (signResult as any).signedTxXdr;

    const response = await server.sendTransaction(
      TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE) as any
    );

    return await waitForTransaction(response.hash);
  } catch (error) {
    console.error("Payment error:", error);
    throw error;
  }
}

/**
 * Commits a hash to chain using a ManageData operation to represent a published article
 */
export async function writeArticleToChain(senderPublicKey: string, title: string, contentHash: string) {
  try {
    const account = await server.getAccount(senderPublicKey);
    const dataKey = title.substring(0, 64) || "New Article";

    const transaction = new TransactionBuilder(account, {
      fee: '100',
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        Operation.manageData({
          name: dataKey,
          value: contentHash.substring(0, 64),
        })
      )
      .addMemo(Memo.text(contentHash.substring(0, 28)))
      .setTimeout(30)
      .build();

    const signResult = await signTransaction(transaction.toXDR(), {
      network: 'TESTNET',
      networkPassphrase: NETWORK_PASSPHRASE,
    });
    const signedTxXdr = typeof signResult === 'string' ? signResult : (signResult as any).signedTxXdr;

    const response = await server.sendTransaction(
      TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE) as any
    );

    return await waitForTransaction(response.hash);
  } catch (error) {
    console.error("Write to chain error:", error);
    throw error;
  }
}

// ─── On-Chain Access Check ──────────────────────────────────────────────────

/**
 * Check if a user has access to a specific token-gated content (read-only, no wallet needed).
 * Calls the contract's `has_access` function.
 */
export async function checkAccess(publicKey: string, tokenId: number): Promise<boolean> {
  try {
    const args = [
      new Address(publicKey).toScVal(),
      nativeToScVal(tokenId, { type: 'u64' }),
    ];
    const result = await readSorobanContract(CONTRACT_METHODS.HAS_ACCESS, args);
    return result === true;
  } catch (e) {
    console.error('checkAccess error:', e);
    return false;
  }
}

// ─── Real Balance Fetching ──────────────────────────────────────────────────

/**
 * Fetch the real XLM balance from the Horizon testnet API.
 */
export async function fetchXlmBalance(publicKey: string): Promise<string> {
  try {
    const response = await fetch(`https://horizon-testnet.stellar.org/accounts/${publicKey}`);
    if (!response.ok) return '0';
    const data = await response.json();
    const nativeBalance = data.balances?.find((b: any) => b.asset_type === 'native');
    if (!nativeBalance) return '0';
    const bal = parseFloat(nativeBalance.balance);
    return bal.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  } catch {
    return '0';
  }
}

// ─── Token ID Extraction from Mint Result ───────────────────────────────────

/**
 * Extract the token_id from a mint_content transaction result.
 * The contract returns a ContentNFT struct which contains token_id.
 */
export function extractTokenIdFromResult(result: any): number | null {
  try {
    // Try to extract from resultMetaXdr (Soroban return value)
    const meta = result?.result?.resultMetaXdr;
    if (meta) {
      const returnVal = meta.v3().sorobanMeta().returnValue();
      const native = scValToNative(returnVal);
      if (native && typeof native.token_id !== 'undefined') {
        return Number(native.token_id);
      }
    }
  } catch (e) {
    console.error('Failed to extract token_id from result meta:', e);
  }

  // Fallback: try to get the next token id from the contract and subtract 1
  // (the just-minted token)
  return null;
}

// ─── Author Profile Fetching ────────────────────────────────────────────────

/**
 * Fetch an author's on-chain profile (name, bio, article_count, total_earned).
 * No wallet required — uses read-only simulation.
 */
export async function fetchAuthorProfile(publicKey: string): Promise<any | null> {
  try {
    const args = [new Address(publicKey).toScVal()];
    return await readSorobanContract(CONTRACT_METHODS.GET_AUTHOR, args);
  } catch (e) {
    console.error('fetchAuthorProfile error:', e);
    return null;
  }
}

/**
 * Fetch all content IDs minted by a specific author from the contract.
 */
export async function fetchAuthorContentIds(publicKey: string): Promise<number[]> {
  try {
    const args = [new Address(publicKey).toScVal()];
    const result = await readSorobanContract(CONTRACT_METHODS.GET_AUTHOR_CONTENT_IDS, args);
    if (!result || !Array.isArray(result)) return [];
    return result.map((id: any) => Number(id));
  } catch (e) {
    console.error('fetchAuthorContentIds error:', e);
    return [];
  }
}

/**
 * Fetch full article objects for a specific author from the chain.
 * Returns articles with on-chain stats (totalRaised, accessCount, tipCount).
 */
export async function fetchAuthorArticlesFromChain(publicKey: string): Promise<any[]> {
  const ids = await fetchAuthorContentIds(publicKey);
  if (ids.length === 0) return [];

  const articles = await Promise.all(
    ids.map(async (tokenId) => {
      const content = await fetchContentById(tokenId);
      if (!content) return null;
      return {
        id: `onchain-${tokenId}`,
        tokenId: Number(content.token_id),
        title: String(content.title || ''),
        excerpt: String(content.excerpt || ''),
        content: '',
        authorPublicKey: String(content.author || ''),
        createdAt: Number(content.created_at) * 1000,
        contentHash: String(content.content_hash || ''),
        isTokenGated: Boolean(content.is_token_gated),
        price: Number(content.access_price) / 10_000_000,
        totalRaised: Number(content.total_raised) / 10_000_000,
        accessCount: Number(content.access_count),
        tipCount: Number(content.tip_count),
        status: 'minted' as const,
        tags: [],
        readTime: '3 min read',
      };
    })
  );

  return articles.filter(Boolean);
}

