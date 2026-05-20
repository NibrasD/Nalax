/**
 * useWallet — Unified Wallet Store
 * ──────────────────────────────────
 * يدعم مزودَّين:
 *   • 'freighter'    — إضافة المتصفح (للمستخدمين المتقدمين)
 *   • 'quick-wallet' — محفظة Stellar محلية بسيطة في localStorage
 */

import { create } from 'zustand';
import { isAllowed, setAllowed, requestAccess, getAddress } from '@stellar/freighter-api';
import { useToast } from './useToast';
import { fetchXlmBalance } from '../lib/stellar';
import {
  isStellarAddress,
  loadWalletFromStorage,
  clearWallet as clearQuickWallet,
  fundFromFriendbot,
} from '../lib/quick-wallet';

export type WalletProvider = 'freighter' | 'quick-wallet' | null;

interface WalletState {
  isConnected: boolean;
  publicKey: string | null;
  isConnecting: boolean;
  connectError: string | null;
  balance: string;
  provider: WalletProvider;
  isFunding: boolean;

  // Freighter
  connect: () => Promise<void>;

  // Quick Wallet (محلية) — يُستدعى من Modal بعد الإنشاء/الاستيراد
  connectQuickWallet: (publicKey: string) => Promise<void>;

  // محاولة استرجاع محفظة محفوظة في localStorage
  tryRestoreQuickWallet: () => Promise<boolean>;

  // تمويل يدوي من Friendbot (testnet)
  fundCurrentWallet: () => Promise<boolean>;

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
  isFunding: false,

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

  // ── Quick Wallet (محفظة محلية) ──────────────────────────────────────────────
  connectQuickWallet: async (publicKey: string) => {
    const toast = useToast.getState();
    if (!isStellarAddress(publicKey)) {
      console.warn('[useWallet] رفض connectQuickWallet لعنوان غير Stellar:', publicKey);
      return;
    }
    try {
      const realBalance = await fetchXlmBalance(publicKey);
      set({
        isConnected: true,
        publicKey,
        isConnecting: false,
        balance: realBalance,
        provider: 'quick-wallet',
      });
      toast.addToast({
        type: 'success',
        title: '✅ المحفظة جاهزة',
        message: `${publicKey.slice(0, 6)}...${publicKey.slice(-4)} — ${realBalance} XLM`,
      });
    } catch (e: any) {
      console.error('connectQuickWallet error:', e);
    }
  },

  // ── استرجاع المحفظة المحفوظة عند تحميل الصفحة ────────────────────────────────
  tryRestoreQuickWallet: async () => {
    const kp = loadWalletFromStorage();
    if (!kp) return false;
    const address = kp.publicKey();
    try {
      const realBalance = await fetchXlmBalance(address);
      set({
        isConnected: true,
        publicKey: address,
        balance: realBalance,
        provider: 'quick-wallet',
      });
      return true;
    } catch {
      // فشل جلب الرصيد — نُكمل التوصيل بدون رصيد
      set({
        isConnected: true,
        publicKey: address,
        balance: '0',
        provider: 'quick-wallet',
      });
      return true;
    }
  },

  // ── قطع الاتصال ─────────────────────────────────────────────────────────────
  disconnect: () => {
    const { provider } = get();
    if (provider === 'quick-wallet') {
      clearQuickWallet();
    }
    set({
      isConnected: false,
      publicKey: null,
      connectError: null,
      balance: '0',
      provider: null,
    });
    useToast.getState().addToast({ type: 'info', title: 'تم قطع الاتصال' });
  },

  // ── تمويل يدوي من Friendbot (testnet) ────────────────────────────────────────
  fundCurrentWallet: async () => {
    const { publicKey } = get();
    if (!publicKey) return false;

    const toast = useToast.getState();
    set({ isFunding: true });

    const loadingId = toast.addToast({
      type: 'loading',
      title: 'جاري ضخ XLM',
      message: 'Friendbot يُمول محفظتك...',
    });

    try {
      const result = await fundFromFriendbot(publicKey);
      set({ isFunding: false });

      if (result.funded) {
        set({
          balance: result.balance.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          }),
        });
        toast.updateToast(loadingId, {
          type: 'success',
          title: result.alreadyFunded
            ? 'الرصيد مُحدَّث'
            : '✅ تم الضخ بنجاح',
          message: `الرصيد الحالي: ${result.balance.toLocaleString()} XLM`,
        });
        return true;
      } else {
        toast.updateToast(loadingId, {
          type: 'error',
          title: 'فشل التمويل',
          message: result.error || 'حاول مرة أخرى بعد دقيقة',
        });
        return false;
      }
    } catch (e: any) {
      set({ isFunding: false });
      toast.updateToast(loadingId, {
        type: 'error',
        title: 'فشل التمويل',
        message: e?.message || 'خطأ غير متوقع',
      });
      return false;
    }
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
