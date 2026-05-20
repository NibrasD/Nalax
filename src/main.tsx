import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// ── Buffer polyfill (Stellar SDK يحتاجه في المتصفح) ─────────────────────────
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

import { useWallet } from './store/useWallet';
import { signXdrLocally, getActiveAddress } from './lib/quick-wallet';
import { registerPrivySigner } from './lib/stellar';

import './lib/i18n';
import './index.css';

/**
 * QuickWalletBridge
 * ───────────────────
 * عند تحميل الصفحة:
 *   1. حاول استرجاع المحفظة المحفوظة من localStorage
 *   2. إن وُجدت، سجّل الـ signer في stellar.ts
 */
function QuickWalletBridge() {
  const tryRestore = useWallet((s) => s.tryRestoreQuickWallet);
  const { provider, publicKey } = useWallet();

  useEffect(() => {
    (async () => {
      const restored = await tryRestore();
      if (restored) {
        const addr = getActiveAddress();
        if (addr) {
          registerPrivySigner(addr, async (xdrString: string) => {
            return signXdrLocally(xdrString);
          });
          console.info('[QuickWallet] استُعيدت المحفظة:', addr);
        }
      }
    })();
  }, [tryRestore]);

  // عند تغيير المحفظة (إنشاء/استيراد جديد)، حدّث الـ signer
  useEffect(() => {
    if (provider === 'quick-wallet' && publicKey) {
      const addr = getActiveAddress();
      if (addr === publicKey) {
        registerPrivySigner(addr, async (xdrString: string) => {
          return signXdrLocally(xdrString);
        });
      }
    }
  }, [provider, publicKey]);

  return null;
}

function AppRoot() {
  return (
    <BrowserRouter>
      <QuickWalletBridge />
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
    <AppRoot />
  </StrictMode>
);
