/**
 * useWallet — Unified Wallet Store
 * ──────────────────────────────────
 * يدعم مزودَّين:
 *   • 'freighter' — إضافة المتصفح Freighter (المستخدمون المتقدمون)
 *   • 'privy'     — تسجيل الدخول بالإيميل عبر Privy (المستخدمون الجدد)
 *
 * الباقي من الكود (Article, Dashboard, Write...) لا يحتاج أي تعديل —
 * يستخدم نفس الواجهة: isConnected, publicKey, balance, connect, disconnect.
 */

import { create } from 'zustand';
import { isAllowed, setAllowed, requestAccess, getAddress } from '@stellar/freighter-api';
import { useToast } from './useToast';
import { fetchXlmBalance } from '../lib/stellar';

export type WalletProvider = 'freighter' | 'privy' | null;

interface WalletState {
  isConnected: boolean;
  publicKey: string | null;
  isConnecting: boolean;
  connectError: string | null;
  balance: string;
  provider: WalletProvider;

  // Freighter
  connect: () => Promise<void>;

  // Privy — يُستدعى من usePrivy بعد اكتمال OTP
  connectWithPrivy: (publicKey: string) => Promise<void>;

  disconnect: () => void;
  refreshBalance: () => Promise<void>;
}

export const useWallet = create<WalletState>((set, get) => ({
  isConnected: false,
  publicKey: null,
  isConnecting: false,
  connectError: null,
  balance: '0',
  provider: null,

  // ── Freighter ───────────────────────────────────────────────────────────────
  connect: async () => {
    set({ isConnecting: true, connectError: null });
    const toast = useToast.getState();
    const loadingId = toast.addToast({
      type: 'loading',
      title: 'جاري الاتصال بالمحفظة',
      message: 'في انتظار موافقة Freighter...',
    });

    try {
      const allowedResult = await isAllowed().catch(() => ({ isAllowed: false }));
      const isAllowedFlag =
        typeof allowedResult === 'object' && allowedResult !== null
          ? (allowedResult as any).isAllowed
          : !!allowedResult;

      if (!isAllowedFlag) {
        const setResult = await setAllowed().catch(() => ({ isAllowed: false }));
        const wasAllowed =
          typeof setResult === 'object' && setResult !== null
            ? (setResult as any).isAllowed
            : !!setResult;
        if (!wasAllowed) throw new Error('محفظة Freighter غير مثبتة أو تم رفض الوصول.');
      }

      const extractAddress = (result: any): string | null => {
        if (!result) return null;
        if (typeof result === 'string' && result.length > 0) return result;
        if (typeof result === 'object' && result.address?.length > 0) return result.address;
        return null;
      };

      let pubKey = extractAddress(await getAddress().catch(() => null));
      if (!pubKey) pubKey = extractAddress(await requestAccess().catch(() => null));

      if (!pubKey) throw new Error('تعذّر الحصول على المفتاح العام من Freighter.');

      const realBalance = await fetchXlmBalance(pubKey);
      set({
        isConnected: true,
        publicKey: pubKey,
        isConnecting: false,
        balance: realBalance,
        provider: 'freighter',
      });
      toast.updateToast(loadingId, {
        type: 'success',
        title: 'تم ربط المحفظة',
        message: `${pubKey.slice(0, 4)}...${pubKey.slice(-4)} — ${realBalance} XLM`,
      });
    } catch (e: any) {
      console.error('Wallet connect error:', e);
      set({ isConnecting: false, connectError: e?.message, isConnected: false, publicKey: null });
      toast.updateToast(loadingId, {
        type: 'error',
        title: 'فشل الاتصال',
        message: e?.message || 'ثبّت إضافة Freighter أولاً.',
      });
    }
  },

  // ── Privy ───────────────────────────────────────────────────────────────────
  connectWithPrivy: async (publicKey: string) => {
    const toast = useToast.getState();
    try {
      const realBalance = await fetchXlmBalance(publicKey);
      set({
        isConnected: true,
        publicKey,
        isConnecting: false,
        balance: realBalance,
        provider: 'privy',
      });
      toast.addToast({
        type: 'success',
        title: '✅ تم تسجيل الدخول',
        message: `محفظتك: ${publicKey.slice(0, 6)}...${publicKey.slice(-4)} — ${realBalance} XLM`,
      });
    } catch (e: any) {
      console.error('connectWithPrivy error:', e);
    }
  },

  // ── Disconnect ──────────────────────────────────────────────────────────────
  disconnect: () => {
    set({ isConnected: false, publicKey: null, connectError: null, balance: '0', provider: null });
    useToast.getState().addToast({ type: 'info', title: 'تم قطع الاتصال' });
  },

  refreshBalance: async () => {
    const { publicKey, isConnected } = get();
    if (!isConnected || !publicKey) return;
    try {
      const realBalance = await fetchXlmBalance(publicKey);
      set({ balance: realBalance });
    } catch {
      // keep last known balance
    }
  },
}));
