# دليل إعداد Privy + Stellar Testnet

دمج Privy لتسجيل الدخول بالإيميل وإنشاء محافظ Stellar تلقائياً.

## نظرة عامة على البنية

```
المستخدم يضغط "سجّل بالإيميل"
        ↓
useLoginWithEmail.sendCode({ email })  → Privy يرسل OTP حقيقي
        ↓
useLoginWithEmail.loginWithCode({ code })  → تسجيل الدخول
        ↓
useCreateWallet.createWallet({ chainType: 'stellar' })  → محفظة في Privy TEE
        ↓
كل معاملة Soroban: tx.hash() → wallet.rawSign({ hash }) → DecoratedSignature → submit
```

## الإعداد لأول مرة

### 1. أنشئ تطبيق Privy

1. اذهب إلى [dashboard.privy.io](https://dashboard.privy.io) وأنشئ حساباً
2. انقر **+ New App** ثم اختر اسماً (مثل "Nalax")
3. انسخ **App ID** من صفحة الإعدادات

### 2. فعّل Stellar في Privy Dashboard

1. في تطبيقك، اذهب إلى **Wallet Configuration**
2. تحت **Chain Configuration**، فعّل **Stellar** (Tier 2)
3. اختر **Stellar Testnet** كبيئة افتراضية
4. احفظ الإعدادات

### 3. فعّل تسجيل الدخول بالإيميل

1. في **Login Methods**، فعّل **Email**
2. (اختياري) خصّص قالب الإيميل من **Branding**

### 4. أضِف الـ App ID إلى مشروعك

أنشئ ملف `.env.local` في جذر المشروع:

```bash
VITE_PRIVY_APP_ID=cm5xxxxxxxxxxxxxxxxx
VITE_PINATA_JWT=your_pinata_jwt
```

> **ملاحظة:** المتغير يبدأ بـ `VITE_` لأن Vite يحتاج ذلك لكشفه على الـ client.

### 5. ثبّت الحزم وشغّل

```bash
npm install
npm run dev
```

## كيف يعمل التوقيع على Stellar؟

Stellar في Privy تنتمي لـ **Tier 2** chains (Ed25519 curve). الدمج كالتالي:

### بناء معاملة Soroban

```typescript
import { invokeSorobanContract } from './lib/stellar';

// يبني المعاملة + يحاكيها + يطلب التوقيع تلقائياً
const result = await invokeSorobanContract(
  publicKey,
  CONTRACT_ID,
  'mint_content',
  args
);
```

داخلياً في `stellar.ts`:

```typescript
// الكود يكتشف المزود تلقائياً (Privy أو Freighter)
if (_privySignFn) {
  signedTxXdr = await _privySignFn(transaction.toXDR());  // ← Privy
} else {
  signedTxXdr = await signTransaction(...);                // ← Freighter
}
```

### دالة التوقيع في `privy-stellar.ts`

```typescript
const tx = TransactionBuilder.fromXDR(xdrString, Networks.TESTNET);
const txHash = tx.hash();                                       // SHA-256 hash
const { signature } = await wallet.rawSign({                    // Privy raw_sign
  hash: '0x' + txHash.toString('hex')
});
const hint = Keypair.fromPublicKey(wallet.address).signatureHint();
tx.signatures.push(new xdr.DecoratedSignature({ hint, signature }));
return tx.toXDR();
```

## الملفات المهمة

| الملف | الوظيفة |
|-------|---------|
| `src/lib/privy.tsx` | تكوين PrivyProvider + re-exports من SDK |
| `src/lib/privy-stellar.ts` | محوّل التوقيع: XDR → rawSign → DecoratedSignature |
| `src/lib/stellar.ts` | `registerPrivySigner` — يحقن دالة Privy في تدفق Stellar |
| `src/components/EmailAuthModal.tsx` | UI تسجيل الدخول بالإيميل |
| `src/main.tsx` | `PrivyWalletBridge` — يربط Privy ↔ useWallet ↔ stellar.ts |

## الإنتاج (Production)

عند الانتقال للـ mainnet:

1. في `dashboard.privy.io` → بدّل **Stellar Testnet** → **Stellar Mainnet**
2. في `src/lib/stellar.ts` بدّل:
   ```typescript
   const NETWORK_PASSPHRASE = Networks.PUBLIC;
   const SERVER_URL = 'https://soroban-rpc.stellar.org';
   ```
3. أعد نشر العقد على mainnet وحدّث `CONTRACT_ID`
4. أزل تمويل Friendbot التلقائي من `EmailAuthModal.tsx` (يعمل فقط على testnet)

## استكشاف الأخطاء

### "VITE_PRIVY_APP_ID غير مضبوط"
أضف `VITE_PRIVY_APP_ID=...` في `.env.local` ثم أعد تشغيل dev server.

### "محفظة Privy لا تدعم rawSign"
- تأكد من أن إصدار `@privy-io/react-auth` هو `^3.0.0` أو أحدث
- تأكد من تفعيل **Stellar** في Privy Dashboard

### المحفظة لا تظهر بعد تسجيل الدخول
- تحقق من `useWallets().wallets` في console
- قد تحتاج لتفعيل **Stellar** صراحة في Wallet Configuration بـ Privy Dashboard

## الموارد

- [Privy Docs — Tier 2 Chains](https://docs.privy.io/recipes/use-tier-2)
- [Privy Docs — Quickstart React](https://docs.privy.io/guide/quickstart)
- [Stellar SDK Docs](https://stellar.github.io/js-stellar-sdk/)
