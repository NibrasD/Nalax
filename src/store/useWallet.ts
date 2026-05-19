import { create } from 'zustand';
import { isAllowed, setAllowed, requestAccess, getAddress } from '@stellar/freighter-api';
import { useToast } from './useToast';
import { fetchXlmBalance } from '../lib/stellar';

interface WalletState {
  isConnected: boolean;
  publicKey: string | null;
  isConnecting: boolean;
  connectError: string | null;
  balance: string;
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
}

export const useWallet = create<WalletState>((set, get) => ({
  isConnected: false,
  publicKey: null,
  isConnecting: false,
  connectError: null,
  balance: '0',
  
  connect: async () => {
    set({ isConnecting: true, connectError: null });
    const toast = useToast.getState();
    const loadingId = toast.addToast({ type: 'loading', title: 'Connecting Wallet', message: 'Waiting for Freighter approval...' });

    try {
      // Freighter v6+ returns objects: { isAllowed: boolean, error?: string }
      const allowedResult = await isAllowed().catch(() => ({ isAllowed: false }));
      const isAllowedFlag = typeof allowedResult === 'object' && allowedResult !== null
        ? (allowedResult as any).isAllowed
        : !!allowedResult;

      if (!isAllowedFlag) {
        const setResult = await setAllowed().catch(() => ({ isAllowed: false }));
        const wasAllowed = typeof setResult === 'object' && setResult !== null
          ? (setResult as any).isAllowed
          : !!setResult;
        if (!wasAllowed) {
          throw new Error("Freighter wallet is not installed or access denied.");
        }
      }

      // Freighter v6+ returns { address: string, error?: string }
      const extractAddress = (result: any): string | null => {
        if (!result) return null;
        if (typeof result === 'string' && result.length > 0) return result;
        if (typeof result === 'object' && result.address && result.address.length > 0) return result.address;
        return null;
      };

      let pubKey = extractAddress(await getAddress().catch(() => null));
      if (!pubKey) {
        pubKey = extractAddress(await requestAccess().catch(() => null));
      }

      if (pubKey) {
        // ── FIX: Fetch real balance from Horizon instead of hardcoded '1,000' ──
        const realBalance = await fetchXlmBalance(pubKey);
        set({ isConnected: true, publicKey: pubKey, isConnecting: false, balance: realBalance });
        toast.updateToast(loadingId, { 
          type: 'success', 
          title: 'Wallet Connected', 
          message: `${pubKey.slice(0,4)}...${pubKey.slice(-4)} — ${realBalance} XLM` 
        });
      } else {
        throw new Error("Could not retrieve public key from Freighter.");
      }
    } catch (e: any) {
      console.error("Wallet connect error:", e);
      set({ 
        isConnecting: false, 
        connectError: e?.message || "Failed to connect wallet.",
        isConnected: false,
        publicKey: null
      });
      toast.updateToast(loadingId, { 
        type: 'error', 
        title: 'Connection Failed', 
        message: e?.message || 'Please install the Freighter browser extension.' 
      });
    }
  },
  
  disconnect: () => {
    set({ isConnected: false, publicKey: null, connectError: null, balance: '0' });
    useToast.getState().addToast({ type: 'info', title: 'Wallet Disconnected' });
  },

  /**
   * Refresh the wallet balance from the Horizon API.
   * Call this after any on-chain transaction to keep the UI in sync.
   */
  refreshBalance: async () => {
    const { publicKey, isConnected } = get();
    if (!isConnected || !publicKey) return;
    try {
      const realBalance = await fetchXlmBalance(publicKey);
      set({ balance: realBalance });
    } catch {
      // Silently fail — keep the last known balance
    }
  },
}));

