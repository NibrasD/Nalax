/**
 * useILP — InterLedger Protocol State Store
 * ──────────────────────────────────────────
 * يدير:
 *   • حالة Web Monetization (streaming)
 *   • Payment Pointer لكل كاتب
 *   • سجل المدفوعات عبر ILP
 *   • جلسات الدفع المتدفق
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  MonetizationPayment,
  StreamingSession,
  CrossChainTipResult,
  generatePaymentPointer,
  createStreamingSession,
  calculateStreamingTotal,
  endStreamingSession,
} from '../lib/ilp';

interface ILPState {
  // Payment Pointer
  paymentPointer: string | null;
  customPaymentPointer: string | null;
  
  // Web Monetization State
  isMonetizationActive: boolean;
  isStreaming: boolean;
  totalEarnedFromStreaming: number;
  sessionPayments: MonetizationPayment[];
  
  // Streaming Session
  currentSession: StreamingSession | null;
  
  // Cross-chain Tips History
  crossChainTips: CrossChainTipResult[];
  totalCrossChainReceived: number;
  
  // Stats
  totalStreamingSessions: number;
  lifetimeStreamingEarnings: number;
  
  // Actions
  setPaymentPointer: (pointer: string) => void;
  generatePointerFromAddress: (stellarAddress: string) => void;
  
  startMonetization: (paymentPointer: string) => void;
  stopMonetization: () => void;
  addPayment: (payment: MonetizationPayment) => void;
  
  startStreamingSession: (paymentPointer: string) => void;
  updateStreamingTotal: () => void;
  endCurrentSession: () => void;
  
  addCrossChainTip: (tip: CrossChainTipResult) => void;
  
  resetSession: () => void;
}

export const useILP = create<ILPState>()(
  persist(
    (set, get) => ({
      // Initial State
      paymentPointer: null,
      customPaymentPointer: null,
      isMonetizationActive: false,
      isStreaming: false,
      totalEarnedFromStreaming: 0,
      sessionPayments: [],
      currentSession: null,
      crossChainTips: [],
      totalCrossChainReceived: 0,
      totalStreamingSessions: 0,
      lifetimeStreamingEarnings: 0,

      // ── Payment Pointer Actions ──
      setPaymentPointer: (pointer) => set({ 
        paymentPointer: pointer, 
        customPaymentPointer: pointer 
      }),
      
      generatePointerFromAddress: (stellarAddress) => {
        const pointer = generatePaymentPointer(stellarAddress);
        set({ paymentPointer: pointer });
      },

      // ── Web Monetization Actions ──
      startMonetization: (paymentPointer) => set({
        isMonetizationActive: true,
        isStreaming: true,
        paymentPointer,
        sessionPayments: [],
        totalEarnedFromStreaming: 0,
      }),
      
      stopMonetization: () => {
        const { totalEarnedFromStreaming, lifetimeStreamingEarnings, totalStreamingSessions } = get();
        set({
          isStreaming: false,
          lifetimeStreamingEarnings: lifetimeStreamingEarnings + totalEarnedFromStreaming,
          totalStreamingSessions: totalStreamingSessions + 1,
        });
      },
      
      addPayment: (payment) => set((state) => ({
        sessionPayments: [...state.sessionPayments, payment],
        totalEarnedFromStreaming: state.totalEarnedFromStreaming + payment.amount,
      })),

      // ── Streaming Session Actions ──
      startStreamingSession: (paymentPointer) => {
        const session = createStreamingSession(paymentPointer);
        set({ currentSession: session, isStreaming: true });
      },
      
      updateStreamingTotal: () => {
        const { currentSession } = get();
        if (!currentSession || !currentSession.isActive) return;
        const total = calculateStreamingTotal(currentSession);
        set({ 
          totalEarnedFromStreaming: total,
          currentSession: { ...currentSession, totalSent: total },
        });
      },
      
      endCurrentSession: () => {
        const { currentSession, lifetimeStreamingEarnings, totalStreamingSessions } = get();
        if (!currentSession) return;
        const finalSession = endStreamingSession(currentSession);
        set({
          currentSession: null,
          isStreaming: false,
          lifetimeStreamingEarnings: lifetimeStreamingEarnings + finalSession.totalSent,
          totalStreamingSessions: totalStreamingSessions + 1,
        });
      },

      // ── Cross-chain Tips ──
      addCrossChainTip: (tip) => set((state) => ({
        crossChainTips: [tip, ...state.crossChainTips].slice(0, 50), // keep last 50
        totalCrossChainReceived: state.totalCrossChainReceived + tip.destinationAmount,
      })),

      // ── Reset ──
      resetSession: () => set({
        isStreaming: false,
        totalEarnedFromStreaming: 0,
        sessionPayments: [],
        currentSession: null,
      }),
    }),
    {
      name: 'nalax-ilp-storage',
      partialize: (state) => ({
        paymentPointer: state.paymentPointer,
        customPaymentPointer: state.customPaymentPointer,
        crossChainTips: state.crossChainTips,
        totalCrossChainReceived: state.totalCrossChainReceived,
        totalStreamingSessions: state.totalStreamingSessions,
        lifetimeStreamingEarnings: state.lifetimeStreamingEarnings,
      }),
    }
  )
);
