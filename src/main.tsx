import { StrictMode, useEffect, useRef } from 'react';
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
  findEthereumWallet,
  signStellarTransactionWithPrivy,
  isStellarAddress,
  debugWallets,
  deriveStellarKeypairFromPrivy,
  setActiveStellarKeypair,
  getActiveStellarAddress,
} from './lib/privy-stellar';
import { useWallet } from './store/useWallet';
import { registerPrivySigner, clearPrivySigner } from './lib/stellar';

import './lib/i18n';
import './index.css';

/**
 * PrivyWalletBridge
 * ───────────────────
 * يربط Privy ↔ useWallet ↔ stellar.ts.
 *
 * عند العودة لجلسة موجودة (refresh للصفحة):
 *   - Privy يستعيد ETH wallet تلقائياً
 *   - نُعيد استخراج Stellar keypair من توقيعها (silent إن أمكن)
 *   - نسجّل الـ signer في stellar.ts
 */
function PrivyWalletBridge() {
  const { authenticated, ready } = usePrivy();
  const { wallets } = useWallets();
  const { connectWithPrivy, disconnect, provider, publicKey } = useWallet();
  const isReDeriving = useRef(false);

  useEffect(() => {
    if (!ready) return;

    if (authenticated) debugWallets(wallets, 'Bridge');

    const ethWallet = findEthereumWallet(wallets);

    // الحالة 1: مستخدم مُسجّل ولديه ETH wallet
    if (authenticated && ethWallet?.address) {
      const cachedAddr = getActiveStellarAddress();

      // إذا الـ keypair موجود في الذاكرة بالفعل، فقط نسجّل الـ signer
      if (cachedAddr && isStellarAddress(cachedAddr)) {
        registerPrivySigner(cachedAddr, async (xdrString: string) => {
          return signStellarTransactionWithPrivy(xdrString, null);
        });
        if (provider !== 'privy' || publicKey !== cachedAddr) {
          connectWithPrivy(cachedAddr);
        }
        return;
      }

      // أول تسجيل دخول — أُنشئ stellar keypair وقم بالربط
      // (EmailAuthModal يفعل هذا أيضاً، لكن نحتاج fallback عند refresh)
      if (!isReDeriving.current) {
        isReDeriving.current = true;
        (async () => {
          try {
            const { keypair, address } = await deriveStellarKeypairFromPrivy(
              ethWallet
            );
            setActiveStellarKeypair(keypair);
            registerPrivySigner(address, async (xdrString: string) => {
              return signStellarTransactionWithPrivy(xdrString, null);
            });
            connectWithPrivy(address);
            console.info('[Bridge] Stellar address re-derived:', address);
          } catch (e) {
            console.error('[Bridge] فشل إعادة استخراج Stellar:', e);
          } finally {
            isReDeriving.current = false;
          }
        })();
      }
    }
    // الحالة 2: المستخدم سجّل خروجه
    else if (!authenticated && provider === 'privy') {
      clearPrivySigner();
      setActiveStellarKeypair(null);
      disconnect();
    }
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
