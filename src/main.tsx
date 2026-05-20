import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
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
import { PrivyProvider, usePrivy } from './lib/privy';
import { useWallet } from './store/useWallet';
import { registerPrivySigner, clearPrivySigner } from './lib/stellar';
import './lib/i18n';
import './index.css';

// ── Privy ↔ useWallet Bridge ──────────────────────────────────────────────────
// هذا المكوّن يربط حالة Privy بـ useWallet تلقائياً
// عند تسجيل الدخول بالإيميل → يُنشئ محفظة في useWallet
// عند تسجيل الخروج → ينظف كل شيء
function PrivyWalletBridge() {
  const { authenticated, user, signStellarTransaction } = usePrivy();
  const { connectWithPrivy, disconnect, provider } = useWallet();

  useEffect(() => {
    if (authenticated && user?.wallet?.address) {
      // ربط signer بـ stellar.ts
      registerPrivySigner(user.wallet.address, signStellarTransaction);
      // تحديث useWallet
      connectWithPrivy(user.wallet.address);
    } else if (!authenticated && provider === 'privy') {
      clearPrivySigner();
      disconnect();
    }
  }, [authenticated, user]);

  return null;
}

// ── App Root ──────────────────────────────────────────────────────────────────
function AppRoot() {
  return (
    <BrowserRouter>
      <PrivyWalletBridge />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/"               element={<Home />} />
          <Route path="/feed"           element={<Feed />} />
          <Route path="/explore"        element={<Explore />} />
          <Route path="/write"          element={<Write />} />
          <Route path="/article/:id"    element={<Article />} />
          <Route path="/dashboard"      element={<Dashboard />} />
          <Route path="/channels"       element={<Channels />} />
          <Route path="/channels/create" element={<CreateChannel />} />
          <Route path="/channels/:id"   element={<ChannelDetail />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

// ── Entry Point ───────────────────────────────────────────────────────────────
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PrivyProvider
      appId="nalax-dev-testnet"
      // عند دمج @privy-io/react-auth الحقيقي:
      // appId={import.meta.env.VITE_PRIVY_APP_ID}
    >
      <AppRoot />
    </PrivyProvider>
  </StrictMode>
);
