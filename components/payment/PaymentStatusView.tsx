"use client";

import React from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, Check, XCircle } from "lucide-react";
import PaymentSuccessView from "./PaymentSuccessView";
import type { PaymentModalState } from "./types";

export interface PaymentStatusViewProps {
  state: PaymentModalState;
  errorMessage?: string;
  tokenNumber?: string;
  jobId?: string;
  queueAheadCount?: number;
  estimatedWaitMinutes?: number;
  onRetry: () => void;
  onClose: () => void;
}

export default function PaymentStatusView({
  state,
  errorMessage,
  tokenNumber,
  jobId,
  queueAheadCount = 2,
  estimatedWaitMinutes = 3,
  onRetry,
  onClose,
}: PaymentStatusViewProps) {
  if (state === "processing") {
    return (
      <div
        className="py-10 px-4 flex flex-col items-center justify-center text-center animate-in fade-in duration-150"
        aria-live="polite"
      >
        {/* Animated Dual-Ring Spinner */}
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-indigo-100" />
          <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
        </div>

        <h3 className="text-xl font-bold text-[#0F172A] mt-6 tracking-tight">
          Confirming your payment…
        </h3>
        <p className="text-sm text-slate-500 max-w-xs mt-2 leading-relaxed">
          Please don&apos;t close this window. We&apos;re verifying your transaction with the bank and preparing your print token.
        </p>

        <div className="mt-6 px-3.5 py-1.5 rounded-full bg-slate-100 text-slate-500 text-xs font-mono">
          Secured with 256-bit encryption
        </div>
      </div>
    );
  }

  if (state === "success") {
    return (
      <PaymentSuccessView
        tokenNumber={tokenNumber}
        jobId={jobId}
        queueAheadCount={queueAheadCount}
        estimatedWaitMinutes={estimatedWaitMinutes}
        onClose={onClose}
        onBackToHome={onClose}
      />
    );
  }

  if (state === "failure") {
    return (
      <div
        className="py-8 px-4 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-150"
        aria-live="polite"
      >
        <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mb-2">
          <XCircle className="w-9 h-9" />
        </div>

        <h3 className="text-xl font-bold text-[#0F172A] mt-3 tracking-tight">
          Payment failed
        </h3>
        <p className="text-sm text-slate-500 max-w-sm mt-1.5 leading-relaxed">
          {errorMessage || "The transaction could not be completed. No amount was deducted from your account."}
        </p>

        <div className="w-full space-y-2.5 mt-6 pt-2">
          <button
            type="button"
            onClick={onRetry}
            className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-sm transition-colors"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full h-11 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (state === "unavailable") {
    return (
      <div
        className="py-8 px-4 flex flex-col items-center justify-center text-center animate-in fade-in duration-150"
        aria-live="polite"
      >
        <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 mb-2">
          <AlertCircle className="w-8 h-8" />
        </div>

        <h3 className="text-lg font-bold text-[#0F172A] mt-3 tracking-tight">
          Payment unavailable
        </h3>
        <p className="text-sm text-slate-500 max-w-sm mt-1.5 leading-relaxed">
          Payment is unavailable right now. Please try again later.
        </p>

        <div className="mt-6 pt-2 w-full">
          <button
            type="button"
            onClick={onClose}
            className="w-full h-11 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return null;
}
