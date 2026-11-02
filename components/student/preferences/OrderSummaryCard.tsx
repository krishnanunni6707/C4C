"use client";

import React, { useState, useEffect, useRef } from "react";
import { FileText, ArrowRight, CheckCircle2 } from "lucide-react";

export interface OrderSummaryCardProps {
  pagesCount: number;
  copies: number;
  colorMode: "BW" | "COLOR";
  printType: "single-sided" | "double-sided";
  pricePerSheet: number;
  subtotal: number;
  tokenCharge: number;
  totalAmount: number;
  onProceed: () => void;
  disabled?: boolean;
  draftSavedTime?: string | null;
}

/**
 * Hook to animate a numeric count over 200ms with prefers-reduced-motion support.
 */
function useTweenNumber(targetValue: number, duration = 200) {
  const [displayValue, setDisplayValue] = useState(targetValue);
  const startValueRef = useRef(targetValue);
  const startTimeRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    // Respect prefers-reduced-motion
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setDisplayValue(targetValue);
      return;
    }

    const startVal = displayValue;
    const diff = targetValue - startVal;
    if (Math.abs(diff) < 0.01) {
      setDisplayValue(targetValue);
      return;
    }

    startTimeRef.current = performance.now();
    startValueRef.current = startVal;

    const tick = (now: number) => {
      const elapsed = now - (startTimeRef.current ?? now);
      const progress = Math.min(1, elapsed / duration);
      // Ease out quad
      const eased = 1 - (1 - progress) * (1 - progress);
      const current = startValueRef.current + diff * eased;

      setDisplayValue(current);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(tick);
      } else {
        setDisplayValue(targetValue);
      }
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [targetValue, duration]); // eslint-disable-line react-hooks/exhaustive-deps

  return displayValue;
}

export default function OrderSummaryCard({
  pagesCount,
  copies,
  colorMode,
  printType,
  pricePerSheet,
  subtotal,
  tokenCharge,
  totalAmount,
  onProceed,
  disabled = false,
  draftSavedTime,
}: OrderSummaryCardProps) {
  const animatedTotal = useTweenNumber(totalAmount, 200);

  const rateLabel = `Rate (${
    colorMode === "COLOR" ? "Color" : "B/W"
  } · ${printType === "double-sided" ? "Double sided" : "Single sided"})`;

  const isProceedDisabled = disabled || pagesCount === 0;

  return (
    <aside
      aria-label="Order summary"
      className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-sm space-y-5"
    >
      {/* Header: indigo-50 circle with doc icon + title & sub */}
      <div className="flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100/50 flex items-center justify-center text-indigo-600 flex-shrink-0">
          <FileText className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base sm:text-lg font-bold text-[#0F172A] tracking-tight leading-snug">
            Order summary
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Here&apos;s a preview of your print job.
          </p>
        </div>
      </div>

      <div className="h-px bg-slate-100" />

      {/* Rows: Pages & Copies */}
      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-slate-500 font-medium">Pages</span>
          <span className="font-bold text-[#0F172A] font-mono tabular-nums">
            {pagesCount}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500 font-medium">Copies</span>
          <span className="font-bold text-[#0F172A] font-mono tabular-nums">
            {copies}
          </span>
        </div>
      </div>

      <div className="h-px bg-slate-100" />

      {/* Financial rows */}
      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-slate-500 font-medium">{rateLabel}</span>
          <span className="font-bold text-[#0F172A] font-mono tabular-nums">
            ₹{pricePerSheet.toFixed(2)} / sheet
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500 font-medium">Subtotal</span>
          <span className="font-bold text-[#0F172A] font-mono tabular-nums">
            ₹{subtotal.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500 font-medium">Token charge</span>
          <span className="font-bold text-[#0F172A] font-mono tabular-nums">
            ₹{tokenCharge.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Total Box */}
      <div
        className="bg-slate-50 border border-slate-100 rounded-xl p-4 sm:p-5"
        aria-live="polite"
      >
        <span className="text-xs font-semibold text-slate-500 block">
          Total amount
        </span>
        <div className="text-3xl sm:text-[34px] font-extrabold text-[#0F172A] font-mono tabular-nums tracking-tight mt-1">
          ₹{animatedTotal.toFixed(2)}
        </div>
        <p className="text-[11px] text-slate-400 mt-1">
          Estimated. Final price is confirmed at checkout.
        </p>
      </div>

      {/* Primary Action Button (52px height) */}
      <div className="pt-1">
        <button
          type="button"
          onClick={onProceed}
          disabled={isProceedDisabled}
          title={isProceedDisabled ? "Please add pages to continue" : undefined}
          className="w-full h-[52px] rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm sm:text-base shadow-sm shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        >
          <span>Proceed to payment</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Draft saved indicator */}
      <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 font-medium pt-1">
        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
        <span>Draft saved {draftSavedTime || "just now"}</span>
      </div>
    </aside>
  );
}
