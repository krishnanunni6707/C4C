import React from "react";
import type { PricingBreakdown } from "./types";

export interface OrderBreakdownProps {
  breakdown: PricingBreakdown;
}

export default function OrderBreakdown({ breakdown }: OrderBreakdownProps) {
  const { pages, copies, rateLabel, ratePerSheet, subtotal, tokenCharge, total } =
    breakdown;

  return (
    <div className="space-y-4">
      {/* Parameters & Financial breakdown rows */}
      <div className="space-y-3.5 text-sm">
        {/* Pages */}
        <div className="flex items-center justify-between">
          <span className="text-slate-500 font-medium">Pages</span>
          <span className="font-semibold text-[#0F172A] font-mono tabular-nums">
            {pages}
          </span>
        </div>

        {/* Copies */}
        <div className="flex items-center justify-between">
          <span className="text-slate-500 font-medium">Copies</span>
          <span className="font-semibold text-[#0F172A] font-mono tabular-nums">
            {copies}
          </span>
        </div>

        {/* Rate line dynamically labelled */}
        <div className="flex items-center justify-between">
          <span className="text-slate-500 font-medium">{rateLabel}</span>
          <span className="font-semibold text-[#0F172A] font-mono tabular-nums">
            ₹{ratePerSheet.toFixed(2)} / sheet
          </span>
        </div>

        {/* Subtotal */}
        <div className="flex items-center justify-between">
          <span className="text-slate-500 font-medium">Subtotal</span>
          <span className="font-semibold text-[#0F172A] font-mono tabular-nums">
            ₹{subtotal.toFixed(2)}
          </span>
        </div>

        {/* Token charge */}
        <div className="flex items-center justify-between">
          <span className="text-slate-500 font-medium">Token charge</span>
          <span className="font-semibold text-[#0F172A] font-mono tabular-nums">
            ₹{tokenCharge.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Total Box */}
      <div className="bg-slate-50/90 border border-slate-100 rounded-xl p-4 sm:p-5 mt-5">
        <span className="text-xs font-semibold text-indigo-700 block tracking-wide">
          Total amount
        </span>
        <div className="text-3xl sm:text-[38px] font-extrabold text-[#0F172A] font-mono tabular-nums tracking-tight mt-1 leading-none">
          ₹{total.toFixed(2)}
        </div>
      </div>
    </div>
  );
}
