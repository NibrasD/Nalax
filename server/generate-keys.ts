/**
 * Generate Ed25519 key pair for Open Payments HTTP Signatures.
 * 
 * Run this once to generate keys for your ILP integration:
 *   npx tsx server/generate-keys.ts
 * 
 * Then:
 *   1. Upload the PUBLIC key to your ILP Testnet wallet settings
 *   2. Put the PRIVATE key (base64) in .env as ILP_PRIVATE_KEY_BASE64
 *   3. Put the KEY_ID (from the testnet wallet) in .env as ILP_KEY_ID
 */

import crypto from 'crypto';

const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');

const publicKeyDer = publicKey.export({ type: 'spki', format: 'der' });
const privateKeyDer = privateKey.export({ type: 'pkcs8', format: 'der' });

const publicKeyBase64 = publicKeyDer.toString('base64');
const privateKeyBase64 = privateKeyDer.toString('base64');

// JWK format (needed for uploading to ILP testnet wallet)
const publicKeyJwk = publicKey.export({ format: 'jwk' });

console.log('═══════════════════════════════════════════════════════');
console.log('  Open Payments Ed25519 Key Pair Generator');
console.log('═══════════════════════════════════════════════════════');
console.log('');
console.log('📌 PUBLIC KEY (JWK — upload to ILP Testnet wallet):');
console.log(JSON.stringify(publicKeyJwk, null, 2));
console.log('');
console.log('📌 PUBLIC KEY (Base64 DER):');
console.log(publicKeyBase64);
console.log('');
console.log('🔑 PRIVATE KEY (Base64 — put in .env as ILP_PRIVATE_KEY_BASE64):');
console.log(privateKeyBase64);
console.log('');
console.log('═══════════════════════════════════════════════════════');
console.log('');
console.log('Next steps:');
console.log('  1. Go to https://rafiki.money and create a testnet account');
console.log('  2. In wallet settings, upload the PUBLIC KEY (JWK above)');
console.log('  3. Copy the Key ID assigned by the wallet');
console.log('  4. Add to your .env file:');
console.log('     ILP_WALLET_ADDRESS_URL=https://ilp.rafiki.money/YOUR_USERNAME');
console.log('     ILP_AUTH_SERVER=https://auth.rafiki.money');
console.log(`     ILP_PRIVATE_KEY_BASE64=${privateKeyBase64}`);
console.log('     ILP_KEY_ID=<key-id-from-wallet>');
console.log('');
