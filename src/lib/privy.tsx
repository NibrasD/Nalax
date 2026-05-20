/**
 * Privy Integration Layer — Real SDK
 * ────────────────────────────────────
 * يستخدم @privy-io/react-auth الحقيقي. لا mock.
 *
 * Stellar في Privy = Tier 2 chain (Ed25519). الدمج يتم عبر:
 *   1. تسجيل الدخول بالإيميل: useLoginWithEmail()
 *   2. إنشاء محفظة Stellar: useCreateWallet({ chainType: 'stellar' })
 *   3. التوقيع: wallet.rawSign({ hash }) → SHA-256 hash للمعاملة
 *   4. بناء التوقيع المُزخرَف وحقنه في XDR
 *
 * المرجع: https://docs.privy.io/recipes/use-tier-2
 */

import React from 'react';
import { PrivyProvider as RealPrivyProvider } from '@privy-io/react-auth';

// ─── Re-exports من Privy SDK ────────────────────────────────────────────────
// نُصدِّر الـ hooks الحقيقية كي تُستخدم في باقي التطبيق
export {
  usePrivy,
  useLoginWithEmail,
  useWallets,
  useCreateWallet,
  useLogout,
} from '@privy-io/react-auth';

// ─── Configured PrivyProvider ───────────────────────────────────────────────

interface NalaxPrivyProviderProps {
  children: React.ReactNode;
}

/**
 * Provider مُهيَّأ مسبقاً لـ Nalax مع Stellar Testnet.
 * يقرأ Privy App ID من VITE_PRIVY_APP_ID.
 */
export function PrivyProvider({ children }: NalaxPrivyProviderProps) {
  const appId = import.meta.env.VITE_PRIVY_APP_ID;

  if (!appId || appId === 'your_privy_app_id_here') {
    console.warn(
      '⚠️ VITE_PRIVY_APP_ID غير مضبوط. تسجيل الدخول بالإيميل لن يعمل.\n' +
      'احصل على App ID من https://dashboard.privy.io'
    );
  }

  return (
    <RealPrivyProvider
      appId={appId || 'missing-app-id'}
      config={{
        loginMethods: ['email'],
        appearance: {
          theme: 'dark',
          accentColor: '#5B5EFF',
          logo: 'https://nalax.com/logo.png',
          showWalletLoginFirst: false,
        },
        // Stellar (Tier 2) لا يدعم createOnLogin التلقائي.
        // نُنشئ المحفظة يدوياً بعد تسجيل الدخول عبر useCreateWallet.
        embeddedWallets: {
          createOnLogin: 'off',
        },
        // تعطيل MFA للبداية (يمكن تفعيلها لاحقاً للمعاملات الحساسة)
        mfa: {
          noPromptOnMfaRequired: false,
        },
      }}
    >
      {children}
    </RealPrivyProvider>
  );
}
