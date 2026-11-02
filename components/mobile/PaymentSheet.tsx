"use client";

import React from "react";
import { X, Lock, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import PaymentMethodsRow from "@/components/payment/PaymentMethodsRow";

interface PaymentSheetProps {
  isOpen: boolean;
  onClose: () => void;
  subtotal: number;
  tokenCharge?: number;
  total: number;
  onPay: () => Promise<void> | void;
  isProcessing?: boolean;
  errorMessage?: string | null;
  isUnavailable?: boolean;
  isReady?: boolean;
  isCheckoutOpen?: boolean;
  onRetryScript?: () => void;
}

export default function PaymentSheet({
  isOpen,
  onClose,
  subtotal,
  tokenCharge = 1.0,
  total,
  onPay,
  isProcessing = false,
  errorMessage,
  isUnavailable = false,
  isReady = true,
  isCheckoutOpen = false,
  onRetryScript,
}: PaymentSheetProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal={!isCheckoutOpen}
      aria-labelledby="payment-sheet-title"
      className={`absolute inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-md p-0 animate-in fade-in duration-200 ${
        isCheckoutOpen ? "invisible pointer-events-none opacity-0" : ""
      }`}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[440px] bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-100 p-6 space-y-5 animate-in slide-in-from-bottom duration-200 relative"
      >
        {/* Top Handle / Close Button */}
        <div className="flex items-center justify-between pb-1">
          <h2
            id="payment-sheet-title"
            className="text-lg sm:text-xl font-bold text-[#0F172A] tracking-tight"
          >
            Complete payment
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label="Close payment sheet"
          >
            <X className="w-5 h-5 stroke-[2]" />
          </button>
        </div>

        {/* Cost Breakdown */}
        <div className="space-y-2.5 text-sm">
          <div className="flex items-center justify-between text-slate-600">
            <span>Subtotal</span>
            <span className="font-mono font-medium">₹{subtotal.toFixed(2)}</span>
          </div>

          <div className="flex items-center justify-between text-slate-600">
            <span>Token charge</span>
            <span className="font-mono font-medium">₹{tokenCharge.toFixed(2)}</span>
          </div>

          <div className="border-t border-slate-200 my-2 pt-2.5 flex items-center justify-between">
            <span className="font-bold text-[#0F172A] text-base">Total</span>
            <span className="text-2xl font-black text-[#0F172A] font-mono tracking-tight">
              ₹{total.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200/60 text-xs text-rose-700 font-medium">
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
              <span className="break-words">{errorMessage}</span>
            </div>
            {onRetryScript && (
              <button
                type="button"
                onClick={onRetryScript}
                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] transition-colors flex-shrink-0"
              >
                Retry
              </button>
            )}
          </div>
        )}

        {/* Action Button: Pay securely */}
        <div className="space-y-3 pt-1">
          <button
            type="button"
            disabled={isProcessing || isUnavailable || !isReady}
            onClick={onPay}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing payment...</span>
              </>
            ) : isUnavailable ? (
              <span>Payment is not configured</span>
            ) : !isReady ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading payment…</span>
              </>
            ) : (
              <>
                <span>Pay securely</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </>
            )}
          </button>

          {/* Secured by Razorpay & Icons */}
          <div className="space-y-2 pt-1 text-center">
            <div className="inline-flex items-center justify-center gap-1.5 text-xs text-slate-400 font-medium">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Secured by Razorpay</span>
            </div>

            <PaymentMethodsRow />
          </div>
        </div>
      </div>
    </div>
  );
}
