import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// ── Buffer polyfill for browser (Privy + Stellar SDK يحتاجانه) ────────────────
import { Buffer } from 'buffer';
if (typeof window !== 'undefined' && !window.Buffer) {
  (window as any).Buffer = Buffer;
}

import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Explore } from './pages/Explore';
import { Write } from './pages/Write';
import { Article } from './pages/Article';
import { Dashboard } from './pages/Dashboard';
import { Feed } from './pages/Feed';
import { Channels } from './pages/Channels';
import { ChannelDetail } from './pages/ChannelDetail';
import { CreateChannel } from './pages/CreateChannel';

import { PrivyProvider, usePrivy, useWallets } from './lib/privy';
import {
  findStellarWallet,
  signStellarTransactionWithPrivy,
  isStellarAddress,
  debugWallets,
} from './lib/privy-stellar';
import { useWallet } from './store/useWallet';
import { registerPrivySigner, clearPrivySigner } from './lib/stellar';

import './lib/i18n';
import './index.css';

/**
 * PrivyWalletBridge
 * ───────────────────
 * يربط Privy ↔ useWallet ↔ stellar.ts.
 * **مهم**: نتصل فقط بمحفظة Stellar حقيقية (يبدأ عنوانها بـ G).
 * إن أنشأت Privy محفظة Ethereum (0x...)، نتجاهلها هنا.
 */
function PrivyWalletBridge() {
  const { authenticated, ready } = usePrivy();
  const { wallets } = useWallets();
  const { connectWithPrivy, disconnect, provider, publicKey } = useWallet();

  useEffect(() => {
    if (!ready) return;

    // طباعة المحافظ في كل تحديث (مفيد للـ debug)
    if (authenticated) debugWallets(wallets, 'Bridge');

    const stellar = findStellarWallet(wallets);

    if (
      authenticated &&
      stellar?.address &&
      isStellarAddress(stellar.address)
    ) {
      // ربط دالة التوقيع الحقيقية بـ stellar.ts
      registerPrivySigner(stellar.address, async (xdrString: string) => {
        return signStellarTransactionWithPrivy(xdrString, stellar);
      });

      // تحديث useWallet إن لم يكن متزامناً
      if (provider !== 'privy' || publicKey !== stellar.address) {
        connectWithPrivy(stellar.address);
      }
    } else if (!authenticated && provider === 'privy') {
      clearPrivySigner();
      disconnect();
    }
    // ⚠️ إن كان authenticated ولا توجد محفظة Stellar، لا نفعل شيئاً.
    // EmailAuthModal سيتولى إنشاءها أو إظهار خطأ.
  }, [authenticated, ready, wallets, provider, publicKey, connectWithPrivy, disconnect]);

  return null;
}

function AppRoot() {
  return (
    <BrowserRouter>
      <PrivyWalletBridge />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/"                element={<Home />} />
          <Route path="/feed"            element={<Feed />} />
          <Route path="/explore"         element={<Explore />} />
          <Route path="/write"           element={<Write />} />
          <Route path="/article/:id"     element={<Article />} />
          <Route path="/dashboard"       element={<Dashboard />} />
          <Route path="/channels"        element={<Channels />} />
          <Route path="/channels/create" element={<CreateChannel />} />
          <Route path="/channels/:id"    element={<ChannelDetail />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PrivyProvider>
      <AppRoot />
    </PrivyProvider>
  </StrictMode>
);
