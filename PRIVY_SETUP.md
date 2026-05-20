# دليل إعداد Privy + Stellar Testnet (Deterministic Derivation)

دمج Privy لتسجيل الدخول بالإيميل وإنشاء محافظ Stellar تلقائياً.

## نظرة عامة على البنية

```
المستخدم يضغط "سجّل بالإيميل"
        ↓
useLoginWithEmail.sendCode({ email })  → Privy يرسل OTP حقيقي
        ↓
useLoginWithEmail.loginWithCode({ code })  → تسجيل الدخول
        ↓
Privy ينشئ ETH wallet افتراضياً (لا يدعم Stellar مباشرة في React SDK)
        ↓
نطلب من ETH wallet توقيع رسالة ثابتة عبر signMessage
        ↓
نأخذ التوقيع → SHA-256 → 32 bytes → Ed25519 seed → Stellar Keypair (G...)
        ↓
نوقّع كل معاملات Soroban محلياً بـ stellar-sdk
```

## لماذا هذه الطريقة؟

Privy v3 React SDK **لا يدعم خلق محفظة Stellar** كـ wallet ثانٍ بجانب الـ Ethereum
(يرفض بـ `Error: User already has an embedded wallet`). هذا قيد فعلي.

### الحل العملي
- نستخدم Privy كـ **مزوّد هوية** (إيميل + OTP)
- نستخرج Stellar Keypair بشكل **deterministic** من توقيع ETH للـ embedded wallet
- التوقيع الـ deterministic ECDSA يضمن نفس النتيجة في كل تسجيل دخول
- النتيجة: **نفس الإيميل = نفس عنوان Stellar دائماً**، حتى من جهاز آخر

### مزايا هذه الطريقة

✅ تعمل على أي خطة Privy (مجانية أو مدفوعة)  
✅ لا تحتاج تفعيل Stellar في Privy Dashboard  
✅ deterministic — المستخدم لا يفقد محفظته بين الجلسات  
✅ سريع — لا API calls إضافية  
✅ آمن — المفتاح الخاص لا يُكشف للسيرفر

### تحديات

⚠️ المفتاح الخاص يعيش مؤقتاً في ذاكرة المتصفح أثناء الجلسة (لا في localStorage)  
⚠️ يحتاج المستخدم signMessage مرة واحدة في كل جلسة جديدة  
⚠️ تغيير `STELLAR_DERIVATION_MESSAGE` سيُغيّر كل عناوين المستخدمين الحاليين  
⚠️ للإنتاج بأموال حقيقية، يُنصح بـ Privy TEE أو backend مع Stellar SDK  

## الإعداد لأول مرة

### 1. أنشئ تطبيق Privy

1. اذهب إلى [dashboard.privy.io](https://dashboard.privy.io)
2. انقر **+ New App** ثم اختر اسماً (مثل "Nalax")
3. انسخ **App ID**

### 2. فعّل تسجيل الدخول بالإيميل

في **Login Methods** → فعّل **Email**.

> **ملاحظة مهمة:** لا تحتاج تفعيل Stellar أو أي إعدادات خاصة. الـ Ethereum embedded wallet
> الافتراضي يكفي — نحن نستخدمه فقط لتوقيع رسالة استخراج Stellar.

### 3. أضِف الـ App ID إلى مشروعك

```bash
# .env.local
VITE_PRIVY_APP_ID=cm5xxxxxxxxxxxxxxxxx
VITE_PINATA_JWT=your_pinata_jwt
```

### 4. ثبّت الحزم وشغّل

```bash
npm install
npm run dev
```

## كيف يعمل التوقيع على Stellar؟

```typescript
// src/lib/privy-stellar.ts
const sigHex = await ethWallet.signMessage({ 
  message: STELLAR_DERIVATION_MESSAGE 
});
const seed32 = stellarHash(hexToBuffer(sigHex)); // SHA-256
const stellarKp = Keypair.fromRawEd25519Seed(seed32);
// stellarKp.publicKey() = G... address
```

عند توقيع معاملات Soroban:

```typescript
// src/lib/stellar.ts (داخلياً)
if (_privySignFn) {
  signedTxXdr = await _privySignFn(transaction.toXDR());
  // ↓ يستدعي signStellarTransactionWithPrivy
  // ↓ يوقّع محلياً بـ tx.sign(stellarKeypair)
}
```

## التشخيص في Console

افتح DevTools → Console بعد تسجيل الدخول:

```
[privy:Bridge] 1 wallet(s):
  #0: chainType=ethereum, walletClientType=privy, address=0xE57A..., hasSignMessage=true
[privy] Stellar address derived: GABCXYZ...
✅ محفظة جديدة مُموَّلة: GABCXYZ...
```

## الإنتاج (Production)

عند الانتقال للـ mainnet:

1. غيّر `STELLAR_DERIVATION_MESSAGE` إلى نسخة v2 مع `Network: Stellar Mainnet`
2. في `src/lib/stellar.ts`:
   ```typescript
   const NETWORK_PASSPHRASE = Networks.PUBLIC;
   const SERVER_URL = 'https://soroban-rpc.stellar.org';
   ```
3. أعد نشر العقد على mainnet وحدّث `CONTRACT_ID`
4. أزل تمويل Friendbot التلقائي من `EmailAuthModal.tsx`

## استكشاف الأخطاء

### المستخدم يرى عنوان `0x...` بدلاً من `G...`
- هذا يعني أن العنوان الـ ETH يُعرض بدلاً من Stellar.
- تحقق من Console لرسالة `[privy] Stellar address derived: G...`
- إن لم تظهر، فالـ derivation فشل — راجع رسائل الخطأ

### "محفظة Privy لا تدعم signMessage"
- إصدار قديم من `@privy-io/react-auth`. تأكد من `^3.0.0`
- في `package.json`: `"@privy-io/react-auth": "^3.0.0"`

### "VITE_PRIVY_APP_ID غير مضبوط"
أضف `VITE_PRIVY_APP_ID=...` في `.env.local` وأعد تشغيل dev server.

### المستخدم يحصل على عنوان مختلف بين الجلسات
- ECDSA لازم أن تكون deterministic. Privy تستخدم RFC 6979 لذلك deterministic.
- لو حصل هذا، أَبلغ عبر issue — يُمكن إضافة caching في localStorage كحلّ بديل.

## الموارد

- [Privy Docs — React Quickstart](https://docs.privy.io/guide/quickstart)
- [Privy Docs — useLoginWithEmail](https://docs.privy.io/basics/react/setup)
- [Stellar SDK Keypair](https://stellar.github.io/js-stellar-sdk/Keypair.html)
- [RFC 6979 — Deterministic ECDSA](https://datatracker.ietf.org/doc/html/rfc6979)
