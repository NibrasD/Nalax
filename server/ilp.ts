/**
 * ILP Backend Server — Open Payments API Integration
 * ────────────────────────────────────────────────────
 * Express server that handles real InterLedger Protocol payments
 * using the Open Payments API standard.
 *
 * Flow for sending a tip:
 *   1. Client calls POST /api/ilp/quote → get receiver wallet info
 *   2. Client calls POST /api/ilp/pay → server creates incoming payment
 *      on receiver, requests outgoing payment grant from sender's wallet,
 *      then creates outgoing payment to complete the transfer via ILP.
 *
 * Prerequisites:
 *   - ILP Testnet wallet account (https://rafiki.money)
 *   - Private key for signing Open Payments requests (Ed25519)
 *   - Wallet address URL from the testnet
 */

import express from 'express';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

// ─── Configuration ──────────────────────────────────────────────────────────

const PORT = process.env.ILP_SERVER_PORT || 3001;

// The Nalax platform's wallet address on ILP Testnet
// This is the "sender" wallet that Nalax uses to initiate payments
const WALLET_ADDRESS_URL = process.env.ILP_WALLET_ADDRESS_URL || '';
const AUTH_SERVER = process.env.ILP_AUTH_SERVER || '';
const PRIVATE_KEY_BASE64 = process.env.ILP_PRIVATE_KEY_BASE64 || '';
const KEY_ID = process.env.ILP_KEY_ID || '';

// ─── Types ──────────────────────────────────────────────────────────────────

interface WalletAddress {
  id: string;
  publicName?: string;
  assetCode: string;
  assetScale: number;
  authServer: string;
  resourceServer: string;
}

interface IncomingPayment {
  id: string;
  walletAddress: string;
  incomingAmount?: { value: string; assetCode: string; assetScale: number };
  receivedAmount: { value: string; assetCode: string; assetScale: number };
  completed: boolean;
  createdAt: string;
  expiresAt?: string;
}

interface OutgoingPayment {
  id: string;
  walletAddress: string;
  quoteId?: string;
  receiveAmount: { value: string; assetCode: string; assetScale: number };
  debitAmount: { value: string; assetCode: string; assetScale: number };
  sentAmount: { value: string; assetCode: string; assetScale: number };
  failed: boolean;
  createdAt: string;
}

interface Grant {
  access_token: { value: string; manage: string };
  continue?: { access_token: { value: string }; uri: string };
}

// ─── HTTP Signature Utilities ───────────────────────────────────────────────

/**
 * Create an HTTP signature for Open Payments requests.
 * Open Payments uses HTTP Message Signatures (RFC 9421) with Ed25519.
 */
function createSignatureHeaders(
  method: string,
  url: string,
  body?: string,
): Record<string, string> {
  if (!PRIVATE_KEY_BASE64 || !KEY_ID) {
    throw new Error('ILP_PRIVATE_KEY_BASE64 and ILP_KEY_ID must be set');
  }

  const parsedUrl = new URL(url);
  const created = Math.floor(Date.now() / 1000);
  const nonce = crypto.randomUUID();

  // Content digest for body (SHA-512)
  let contentDigest = '';
  if (body) {
    const hash = crypto.createHash('sha512').update(body).digest('base64');
    contentDigest = `sha-512=:${hash}:`;
  }

  // Signature base string components
  const components = [
    `"@method": ${method.toUpperCase()}`,
    `"@target-uri": ${url}`,
    body ? `"content-digest": ${contentDigest}` : null,
    `"content-type": application/json`,
  ].filter(Boolean);

  const signatureParams = `("@method" "@target-uri"${body ? ' "content-digest" "content-type"' : ''});created=${created};nonce="${nonce}";keyid="${KEY_ID}";alg="ed25519"`;
  
  const signatureBase = components.join('\n') + `\n"@signature-params": ${signatureParams}`;

  // Sign with Ed25519
  const privateKeyDer = Buffer.from(PRIVATE_KEY_BASE64, 'base64');
  const keyObject = crypto.createPrivateKey({
    key: privateKeyDer,
    format: 'der',
    type: 'pkcs8',
  });
  
  const signature = crypto.sign(null, Buffer.from(signatureBase), keyObject);
  const signatureBase64 = signature.toString('base64');

  const headers: Record<string, string> = {
    'Signature': `sig1=:${signatureBase64}:`,
    'Signature-Input': `sig1=${signatureParams}`,
    'Content-Type': 'application/json',
  };

  if (contentDigest) {
    headers['Content-Digest'] = contentDigest;
  }

  return headers;
}

// ─── Open Payments API Client ───────────────────────────────────────────────

/**
 * Resolve a wallet address to get its metadata.
 * GET {walletAddressUrl} with Accept: application/json
 */
async function getWalletAddress(walletAddressUrl: string): Promise<WalletAddress> {
  const response = await fetch(walletAddressUrl, {
    headers: { 'Accept': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Failed to resolve wallet address: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<WalletAddress>;
}

/**
 * Request a grant from an authorization server.
 * POST {authServer}/ with access details
 */
async function requestGrant(
  authServer: string,
  accessType: 'incoming-payment' | 'outgoing-payment' | 'quote',
  walletAddress: string,
  limits?: { receiveAmount?: { value: string; assetCode: string; assetScale: number } },
): Promise<Grant> {
  const body = JSON.stringify({
    access_token: {
      access: [{
        type: accessType,
        actions: ['create', 'read'],
        identifier: walletAddress,
        ...(limits || {}),
      }],
    },
    client: WALLET_ADDRESS_URL,
  });

  const url = authServer;
  const sigHeaders = createSignatureHeaders('POST', url, body);

  const response = await fetch(url, {
    method: 'POST',
    headers: { ...sigHeaders },
    body,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Grant request failed: ${response.status} — ${errorBody}`);
  }

  return response.json() as Promise<Grant>;
}

/**
 * Create an incoming payment on the receiver's wallet.
 * POST {resourceServer}/incoming-payments
 */
async function createIncomingPayment(
  resourceServer: string,
  accessToken: string,
  walletAddress: string,
  amount: { value: string; assetCode: string; assetScale: number },
): Promise<IncomingPayment> {
  const body = JSON.stringify({
    walletAddress,
    incomingAmount: amount,
    expiresAt: new Date(Date.now() + 3600_000).toISOString(), // 1 hour
  });

  const url = `${resourceServer}/incoming-payments`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `GNAP ${accessToken}`,
    },
    body,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Create incoming payment failed: ${response.status} — ${errorBody}`);
  }

  return response.json() as Promise<IncomingPayment>;
}

/**
 * Create an outgoing payment from the sender's wallet.
 * POST {resourceServer}/outgoing-payments
 */
async function createOutgoingPayment(
  resourceServer: string,
  accessToken: string,
  walletAddress: string,
  incomingPaymentUrl: string,
  debitAmount: { value: string; assetCode: string; assetScale: number },
): Promise<OutgoingPayment> {
  const body = JSON.stringify({
    walletAddress,
    incomingPayment: incomingPaymentUrl,
    debitAmount,
  });

  const url = `${resourceServer}/outgoing-payments`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `GNAP ${accessToken}`,
    },
    body,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Create outgoing payment failed: ${response.status} — ${errorBody}`);
  }

  return response.json() as Promise<OutgoingPayment>;
}

// ─── API Routes ─────────────────────────────────────────────────────────────

/**
 * GET /api/ilp/health
 * Health check
 */
app.get('/api/ilp/health', (_req, res) => {
  res.json({
    status: 'ok',
    configured: !!(WALLET_ADDRESS_URL && PRIVATE_KEY_BASE64 && KEY_ID),
    walletAddress: WALLET_ADDRESS_URL || null,
  });
});

/**
 * POST /api/ilp/resolve-wallet
 * Resolve a wallet address to get its details (asset, auth server, etc.)
 * Body: { walletAddress: "https://ilp.rafiki.money/alice" }
 */
app.post('/api/ilp/resolve-wallet', async (req, res) => {
  try {
    const { walletAddress } = req.body;
    if (!walletAddress) {
      return res.status(400).json({ error: 'walletAddress is required' });
    }

    const info = await getWalletAddress(walletAddress);
    res.json({
      id: info.id,
      publicName: info.publicName,
      assetCode: info.assetCode,
      assetScale: info.assetScale,
      authServer: info.authServer,
      resourceServer: info.resourceServer,
    });
  } catch (error: any) {
    console.error('[resolve-wallet]', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ilp/quote
 * Get a quote for sending a tip via ILP.
 * Body: {
 *   receiverWalletAddress: "https://ilp.rafiki.money/bob",
 *   amount: "500",        // in smallest unit (e.g. cents)
 *   assetCode: "USD",
 *   assetScale: 2
 * }
 */
app.post('/api/ilp/quote', async (req, res) => {
  try {
    const { receiverWalletAddress, amount, assetCode, assetScale } = req.body;

    if (!receiverWalletAddress || !amount) {
      return res.status(400).json({ error: 'receiverWalletAddress and amount are required' });
    }

    // Resolve the receiver's wallet to confirm it's valid
    const receiverWallet = await getWalletAddress(receiverWalletAddress);

    // Calculate fees (ILP connectors typically charge ~0.01%)
    const amountNum = parseInt(amount, 10);
    const fee = Math.max(1, Math.ceil(amountNum * 0.001)); // min 1 unit
    const totalDebit = amountNum + fee;

    res.json({
      receiverWallet: {
        id: receiverWallet.id,
        publicName: receiverWallet.publicName,
        assetCode: receiverWallet.assetCode,
        assetScale: receiverWallet.assetScale,
      },
      receiveAmount: {
        value: amount,
        assetCode: assetCode || receiverWallet.assetCode,
        assetScale: assetScale ?? receiverWallet.assetScale,
      },
      debitAmount: {
        value: totalDebit.toString(),
        assetCode: assetCode || receiverWallet.assetCode,
        assetScale: assetScale ?? receiverWallet.assetScale,
      },
      fee: {
        value: fee.toString(),
        assetCode: assetCode || receiverWallet.assetCode,
        assetScale: assetScale ?? receiverWallet.assetScale,
      },
    });
  } catch (error: any) {
    console.error('[quote]', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ilp/pay
 * Execute a real ILP payment (tip) from Nalax platform wallet to a receiver.
 *
 * Flow:
 *   1. Resolve receiver's wallet address
 *   2. Request grant for incoming payment on receiver's wallet
 *   3. Create incoming payment on receiver
 *   4. Request grant for outgoing payment on sender's (Nalax) wallet
 *   5. Create outgoing payment → ILP routes the money
 *
 * Body: {
 *   receiverWalletAddress: "https://ilp.rafiki.money/bob",
 *   amount: "1000",       // smallest unit (e.g. 1000 = $10.00 for scale 2)
 *   assetCode: "USD",
 *   assetScale: 2,
 *   note: "Tip from Nalax reader"
 * }
 */
app.post('/api/ilp/pay', async (req, res) => {
  try {
    const { receiverWalletAddress, amount, assetCode, assetScale, note } = req.body;

    if (!receiverWalletAddress || !amount) {
      return res.status(400).json({ error: 'receiverWalletAddress and amount are required' });
    }

    if (!WALLET_ADDRESS_URL || !PRIVATE_KEY_BASE64 || !KEY_ID) {
      return res.status(503).json({
        error: 'ILP not configured. Set ILP_WALLET_ADDRESS_URL, ILP_PRIVATE_KEY_BASE64, and ILP_KEY_ID.',
      });
    }

    const receiveAmountObj = {
      value: amount,
      assetCode: assetCode || 'USD',
      assetScale: assetScale ?? 2,
    };

    // Step 1: Resolve receiver's wallet
    const receiverWallet = await getWalletAddress(receiverWalletAddress);
    console.log(`[ILP Pay] Receiver: ${receiverWallet.publicName || receiverWallet.id}`);

    // Step 2: Request grant for incoming payment on receiver's wallet
    const incomingGrant = await requestGrant(
      receiverWallet.authServer,
      'incoming-payment',
      receiverWalletAddress,
    );
    console.log('[ILP Pay] Incoming payment grant obtained');

    // Step 3: Create incoming payment on receiver's wallet
    const incomingPayment = await createIncomingPayment(
      receiverWallet.resourceServer,
      incomingGrant.access_token.value,
      receiverWalletAddress,
      receiveAmountObj,
    );
    console.log(`[ILP Pay] Incoming payment created: ${incomingPayment.id}`);

    // Step 4: Resolve sender's (Nalax) wallet
    const senderWallet = await getWalletAddress(WALLET_ADDRESS_URL);

    // Step 5: Request grant for outgoing payment on sender's wallet
    const outgoingGrant = await requestGrant(
      senderWallet.authServer,
      'outgoing-payment',
      WALLET_ADDRESS_URL,
      { receiveAmount: receiveAmountObj },
    );
    console.log('[ILP Pay] Outgoing payment grant obtained');

    // Step 6: Create outgoing payment → ILP delivers the money
    const feeAmount = Math.max(1, Math.ceil(parseInt(amount, 10) * 0.001));
    const totalDebit = parseInt(amount, 10) + feeAmount;

    const outgoingPayment = await createOutgoingPayment(
      senderWallet.resourceServer,
      outgoingGrant.access_token.value,
      WALLET_ADDRESS_URL,
      incomingPayment.id,
      {
        value: totalDebit.toString(),
        assetCode: receiveAmountObj.assetCode,
        assetScale: receiveAmountObj.assetScale,
      },
    );
    console.log(`[ILP Pay] Outgoing payment created: ${outgoingPayment.id}`);

    res.json({
      success: !outgoingPayment.failed,
      paymentId: outgoingPayment.id,
      incomingPaymentId: incomingPayment.id,
      sentAmount: outgoingPayment.sentAmount,
      receiveAmount: receiveAmountObj,
      receiver: {
        walletAddress: receiverWalletAddress,
        publicName: receiverWallet.publicName,
      },
      note: note || 'ILP Tip via Nalax',
    });
  } catch (error: any) {
    console.error('[ILP Pay] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/ilp/wallet-info
 * Get info about the Nalax platform's ILP wallet.
 */
app.get('/api/ilp/wallet-info', async (_req, res) => {
  try {
    if (!WALLET_ADDRESS_URL) {
      return res.status(503).json({ error: 'ILP wallet not configured' });
    }

    const wallet = await getWalletAddress(WALLET_ADDRESS_URL);
    res.json({
      id: wallet.id,
      publicName: wallet.publicName,
      assetCode: wallet.assetCode,
      assetScale: wallet.assetScale,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── CORS for frontend ──────────────────────────────────────────────────────

app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  next();
});

// ─── Start Server ───────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🌐 Nalax ILP Server running on http://localhost:${PORT}`);
  console.log(`   Open Payments API — InterLedger Protocol`);
  console.log(`   Wallet: ${WALLET_ADDRESS_URL || '⚠️  NOT CONFIGURED'}`);
  console.log(`   Key ID: ${KEY_ID || '⚠️  NOT CONFIGURED'}`);
  console.log(`\n   Endpoints:`);
  console.log(`   GET  /api/ilp/health`);
  console.log(`   POST /api/ilp/resolve-wallet`);
  console.log(`   POST /api/ilp/quote`);
  console.log(`   POST /api/ilp/pay`);
  console.log(`   GET  /api/ilp/wallet-info\n`);
});

export default app;
