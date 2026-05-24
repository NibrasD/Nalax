/**
 * useILP — InterLedger Protocol State Store
 * ──────────────────────────────────────────
 * يدير:
 *   • حالة Web Monetization (real streaming payments)
 *   • سجل المدفوعات المستلَمة
 *   • Payment Pointer لكل كاتب
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  MonetizationPayment,
  StreamingSession,
  createStreamingSession,
  addPaymentToSession,
  endStreamingSession,
} from '../lib/ilp';

interface ILPState {
  // Payment Pointer
  paymentPointer: string | null;

  // Web Monetization
  isStreaming: boolean;
  currentSession: StreamingSession | null;
  totalEarnedFromStreaming: number;

  // History
  totalStreamingSessions: number;
  lifetimeEarnings: number;
  recentPayments: MonetizationPayment[];

  // Actions
  setPaymentPointer: (pointer: string) => void;

  startStreamingSession: (paymentPointer: string) => void;
  addPayment: (payment: MonetizationPayment) => void;
  endCurrentSession: () => void;
  updateStreamingTotal: () => void;

  resetSession: () => void;
}

export const useILP = create<ILPState>()(
  persist(
    (set, get) => ({
      // Initial State
      paymentPointer: null,
      isStreaming: false,
      currentSession: null,
      totalEarnedFromStreaming: 0,
      totalStreamingSessions: 0,
      lifetimeEarnings: 0,
      recentPayments: [],

      // ── Actions ──
      setPaymentPointer: (pointer) => set({ paymentPointer: pointer }),

      startStreamingSession: (paymentPointer) => {
        const session = createStreamingSession(paymentPointer);
        set({ currentSession: session, isStreaming: true, totalEarnedFromStreaming: 0 });
      },

      addPayment: (payment) => {
        const { currentSession, recentPayments } = get();
        if (!currentSession) return;

        const updated = addPaymentToSession(currentSession, payment);
        set({
          currentSession: updated,
          totalEarnedFromStreaming: updated.totalReceived,
          recentPayments: [payment, ...recentPayments].slice(0, 100),
        });
      },

      updateStreamingTotal: () => {
        // No-op for real implementation (totals update via addPayment)
      },

      endCurrentSession: () => {
        const { currentSession, lifetimeEarnings, totalStreamingSessions } = get();
        if (!currentSession) return;

        const finalSession = endStreamingSession(currentSession);
        set({
          currentSession: null,
          isStreaming: false,
          lifetimeEarnings: lifetimeEarnings + finalSession.totalReceived,
          totalStreamingSessions: totalStreamingSessions + 1,
        });
      },

      resetSession: () => set({
        isStreaming: false,
        totalEarnedFromStreaming: 0,
        currentSession: null,
      }),
    }),
    {
      name: 'nalax-ilp-storage',
      partialize: (state) => ({
        paymentPointer: state.paymentPointer,
        totalStreamingSessions: state.totalStreamingSessions,
        lifetimeEarnings: state.lifetimeEarnings,
      }),
    }
  )
);
