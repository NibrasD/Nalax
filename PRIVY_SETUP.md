# دليل إعداد Privy + Stellar Testnet

دمج Privy لتسجيل الدخول بالإيميل وإنشاء محافظ Stellar تلقائياً.

## نظرة عامة

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

### 2. ⚠️ تفعيل Stellar (Tier 2) — الأهم

Stellar في Privy تنتمي لـ **Tier 2** chains، وهذا يعني:
- **لا تظهر** في "Wallet Configuration" الافتراضية بـ Dashboard (هذا طبيعي!)
- تحتاج لتفعيلها بأحد الطرق التالية:

#### الخيار أ: أحدث Dashboard (إن وُجد)
1. اذهب إلى **Wallets** أو **Chain Configuration**
2. ابحث عن قسم **Other chains** أو **Tier 2 Chains**
3. فعّل **Stellar** + اختر **Testnet**

#### الخيار ب: تواصل مع دعم Privy
- في Privy Dashboard، استخدم زر **Help / Support** (أيقونة ?)
- أرسل: *"Please enable Stellar (Tier 2) for my app ID: xxxxxxx (testnet)"*
- عادةً يفعّلونها خلال ساعات

#### الخيار ج: عبر API مباشرة (للمطوّرين المتقدمين)
يمكن استدعاء `POST /v1/wallets` بـ `chain_type: 'stellar'` على REST API
([وثائق Privy](https://docs.privy.io/api-reference/wallets/create))، يتطلب server-side مع app secret.

### 3. فعّل تسجيل الدخول بالإيميل

في **Login Methods** → فعّل **Email**.

### 4. أضِف الـ App ID إلى مشروعك

```bash
# .env.local
VITE_PRIVY_APP_ID=cm5xxxxxxxxxxxxxxxxx
VITE_PINATA_JWT=your_pinata_jwt
```

### 5. ثبّت الحزم وشغّل

```bash
npm install
npm run dev
```

## كيف يعمل التوقيع على Stellar؟

Stellar في Privy تنتمي لـ **Tier 2** (Ed25519 curve):

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

## استكشاف الأخطاء

### المشكلة: ظهور عنوان `0x...` بدلاً من `G...`

**السبب:** Privy ينشئ محفظة Ethereum افتراضياً ولم يُنشئ Stellar.

**الحل:**
1. **تأكد أن Stellar مفعّلة** في تطبيقك على Privy Dashboard (راجع الخطوة 2 أعلاه)
2. افتح Console وابحث عن سجلات `[privy:Bridge]` و `[privy:EmailAuthModal]` — تعرض قائمة المحافظ التي رجعت من Privy
3. إذا رأيت Ethereum فقط ولم تظهر Stellar → الميزة معطّلة في حسابك على Privy
4. الكود الحالي يرفض الاتصال بمحافظ ETH ويُظهر شاشة خطأ واضحة

### "VITE_PRIVY_APP_ID غير مضبوط"
أضف `VITE_PRIVY_APP_ID=...` في `.env.local` ثم أعد تشغيل dev server.

### "محفظة Privy لا تدعم rawSign"
- تأكد من أن إصدار `@privy-io/react-auth` هو `^3.0.0`+
- تأكد من تفعيل **Stellar** في Privy Dashboard (Tier 2)

### "تعذّر إنشاء محفظة Stellar — انتهت المهلة"
بعد 10 ثوانٍ من المحاولة، الكود يُظهر شاشة خطأ تطلب تفعيل Stellar في Privy.

### Console Debug

افتح browser console بعد تسجيل الدخول. سترى:

```
[privy:Bridge] 1 wallet(s):
  #0: chainType=stellar, walletClientType=privy, address=GABC..., hasRawSign=true
```

إذا رأيت `chainType=ethereum` بدلاً من `stellar` → Stellar غير مفعّلة في Privy.

## الإنتاج (Production)

عند الانتقال للـ mainnet:

1. في Privy Dashboard → بدّل **Stellar Testnet** → **Stellar Mainnet**
2. في `src/lib/stellar.ts` بدّل:
   ```typescript
   const NETWORK_PASSPHRASE = Networks.PUBLIC;
   const SERVER_URL = 'https://soroban-rpc.stellar.org';
   ```
3. أعد نشر العقد على mainnet وحدّث `CONTRACT_ID`
4. أزل تمويل Friendbot التلقائي من `EmailAuthModal.tsx` (testnet فقط)

## الملفات المهمة

| الملف | الوظيفة |
|-------|---------|
| `src/lib/privy.tsx` | تكوين PrivyProvider بـ v3 syntax |
| `src/lib/privy-stellar.ts` | محوّل التوقيع: XDR → rawSign → DecoratedSignature |
| `src/lib/stellar.ts` | `registerPrivySigner` يحقن دالة Privy |
| `src/components/EmailAuthModal.tsx` | UI تسجيل + إنشاء + معالجة الأخطاء |
| `src/main.tsx` | `PrivyWalletBridge` يربط Privy ↔ useWallet |

## الموارد

- [Privy Docs — Tier 2 Chains](https://docs.privy.io/recipes/use-tier-2)
- [Privy Docs — Quickstart React](https://docs.privy.io/guide/quickstart)
- [Privy Docs — Chain Support](https://docs.privy.io/wallets/overview/chains)
- [Stellar SDK Docs](https://stellar.github.io/js-stellar-sdk/)
