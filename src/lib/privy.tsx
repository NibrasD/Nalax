/**
 * Privy Integration Layer — Real SDK (v3)
 * ─────────────────────────────────────────
 * المرجع: https://docs.privy.io/recipes/use-tier-2
 *
 * ملاحظات Stellar في Privy:
 *  - Stellar = Tier 2 chain (لا تظهر في Wallet Configuration بـ Dashboard)
 *  - يتم إنشاء المحفظة عبر useCreateWallet({ chainType: 'stellar' })
 *  - يجب تعطيل auto-creation لـ Ethereum في الإعدادات حتى لا يظهر 0x...
 */

import React from 'react';
import { PrivyProvider as RealPrivyProvider } from '@privy-io/react-auth';

// ─── Re-exports من Privy SDK ────────────────────────────────────────────────
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
          showWalletLoginFirst: false,
        },
        // ⚠️ مهم: في v3 الإعداد لكل سلسلة على حدة (وليس createOnLogin مفرد)
        // نُعطّل إنشاء Ethereum/Solana التلقائي حتى لا يظهر عنوان 0x...
        // ثم ننشئ محفظة Stellar يدوياً عبر useCreateWallet({chainType:'stellar'})
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'off',
          },
          solana: {
            createOnLogin: 'off',
          },
        },
      } as any}
    >
      {children}
    </RealPrivyProvider>
  );
}
