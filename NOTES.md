# Nalax — ملاحظات المشروع

## حلول تسجيل المستخدم + محفظة Stellar

### المشكلة
نريد أن يسجل المستخدم بالإيميل ويحصل تلقائياً على محفظة Stellar **بدون أن نتملك مفاتيحه السرية**.

---

### الحل الموصى به: passkey-kit + Launchtube

```
المستخدم يسجل بالإيميل (Supabase Auth)
        ↓
passkey-kit ينشئ Smart Wallet تلقائياً (OpenZeppelin on Soroban)
        ↓
Launchtube يدفع رسوم إنشاء الحساب (أنت لا تتحكم بالمفاتيح)
        ↓
create_account يشحن المحفظة بـ 1.5 XLM من محفظة المنصة
        ↓
المستخدم جاهز فوراً 🚀
```

**التكلفة الإجمالية لكل مستخدم جديد: ~$0.30**

---

### الخيارات المتاحة

#### 1. passkey-kit (الأفضل — Non-Custodial)
- المكتبة: https://github.com/kalepail/passkey-kit
- المستخدم يوقّع بالبصمة / Face ID / PIN الجهاز
- أنت لا ترى أي مفتاح سري أبداً
- Fallback تلقائي: إذا لا يوجد بصمة → PIN الجهاز أو QR من الموبايل

#### 2. SEP-30 RecoverySigner (استرداد الحساب)
- معيار رسمي من Stellar
- المستخدم يسترد محفظته بالإيميل أو رقم الهاتف
- مناسب كـ Fallback للـ passkey-kit
- مرجع: https://stellar.org/blog/developers/sep-30-recoverysigner-user-friendly-key-management

#### 3. Custodial (خطير — لا يُنصح به)
- أنت تحتفظ بالمفاتيح السرية المشفّرة في Supabase
- مسؤولية قانونية وأمنية ضخمة
- ❌ غير موصى به

---

### شحن المحافظ تلقائياً

#### Launchtube
- خدمة رسمية من Stellar تدفع رسوم المعاملات نيابةً عن المستخدمين
- Testnet: مجاني — https://testnet.launchtube.xyz
- Mainnet: رسوم رمزية جداً

#### Sponsored Reserves
- أنت تضمن الحد الأدنى (1 XLM) للمحفظة
- إذا غادر المستخدم → تسترد الـ 1 XLM
- مرجع: https://developers.stellar.org/docs/encyclopedia/sponsored-reserves

#### create_account Operation
```ts
Operation.createAccount({
  destination: newUserPublicKey,
  startingBalance: '1.5' // XLM
})
```

---

### OpenZeppelin Smart Account على Stellar
- مكتبة Rust لبناء Smart Accounts على Soroban
- الحساب عقد برمجي وليس مجرد keypair
- يدعم WebAuthn / secp256r1 للتوقيع
- مرجع: https://docs.openzeppelin.com/stellar-contracts/accounts/smart-account
- مقال: https://jamesbachini.com/smart-accounts-on-stellar/

---

### Meridian Pay (مثال حي من Stellar Foundation)
- أطلقته SDF في مؤتمر Meridian 2025
- 1000+ مستخدم بدون seed phrases أو مفاتيح سرية
- مبني على passkey-kit + Smart Contracts
- مرجع: https://stellar.org/blog/ecosystem/building-meridian-pay-smart-wallet-on-stellar

---

### مشكلة Render — الحل النهائي
المشكلة: الخدمة في Render هي **Web Service** وليس **Static Site**
لذلك تشغّل `npm install` مرة ثانية في مرحلة Deploy كـ Start Command.

**الحل من الـ Dashboard:**
1. Settings → Deploy
2. غيّر **Start Command** من `npm install` إلى `npx serve -s dist`
3. أو احذف الخدمة وأنشئ **Static Site** جديدة:
   - Build Command: `npm install --no-audit --no-fund && npm run build`
   - Publish Directory: `dist`

---

### Environment Variables المطلوبة
```
VITE_PINATA_JWT=           # لرفع المحتوى على IPFS
VITE_SUPABASE_URL=         # لـ Supabase Auth
VITE_SUPABASE_PUBLISHABLE_KEY=  # مفتاح Supabase العام
SESSION_SECRET=            # للجلسات (إذا استخدمنا backend)
```
