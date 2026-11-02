"use client";

import React from "react";
import { FileText, CheckCircle2, ArrowRight } from "lucide-react";

interface OrderSummaryCardProps {
  totalPages: number;
  sheetsCount: number;
  copies: number;
  colorMode: "BW" | "COLOR";
  pricePerSheet: number;
  tokenCharge?: number;
  hasFiles: boolean;
  hasLocation: boolean;
  draftSavedTime?: string | null;
  onPay?: () => void;
  actionLabel?: string;
  onAction?: () => void;
}

export default function OrderSummaryCard({
  totalPages,
  sheetsCount,
  copies,
  colorMode,
  pricePerSheet,
  tokenCharge = 1.0,
  hasFiles,
  hasLocation,
  draftSavedTime,
  onPay,
  actionLabel,
  onAction,
}: OrderSummaryCardProps) {
  const hasPages = hasFiles && totalPages > 0;
  // Subtotal = physical sheets × copies × rate per sheet
  const subtotal = hasPages ? sheetsCount * copies * pricePerSheet : 0;

  // With no files the total is the token charge only
  const totalAmount = hasPages ? subtotal + tokenCharge : tokenCharge;

  const isButtonDisabled = actionLabel
    ? !hasLocation
    : !hasFiles || !hasLocation || totalPages === 0;

  const handleButtonClick = () => {
    if (actionLabel && onAction) {
      onAction();
    } else if (onPay) {
      onPay();
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)] sticky top-24">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0">
          <FileText className="w-7 h-7" strokeWidth={1.8} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[#0F172A] tracking-tight leading-tight">
            Order summary
          </h2>
          <p className="text-[13px] text-slate-500 font-normal mt-1 leading-snug">
            Your print job details.
          </p>
        </div>
      </div>

      <div className="h-px bg-slate-100 my-5" aria-hidden="true" />

      {/* Pages and Copies Rows */}
      <div className="space-y-3.5 text-[15px]">
        <div className="flex items-center justify-between">
          <span className="text-slate-500 font-normal">Pages</span>
          <span className="text-[#0F172A] font-semibold">{totalPages}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500 font-normal">Copies</span>
          <span className="text-[#0F172A] font-semibold">{copies}</span>
        </div>
      </div>

      <div className="h-px bg-slate-100 my-5" aria-hidden="true" />

      {/* Rate and Charges */}
      <div className="space-y-3.5 text-[15px]">
        <div className="flex items-center justify-between">
          <span className="text-slate-500 font-normal">
            {colorMode === "COLOR" ? "Rate (Colour)" : "Rate (B/W)"}
          </span>
          <span className="text-slate-700 font-medium">
            ₹{pricePerSheet.toFixed(2)} / sheet
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500 font-normal">Subtotal</span>
          <span className="text-[#0F172A] font-semibold">
            ₹{subtotal.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500 font-normal">Token charge</span>
          <span className="text-[#0F172A] font-semibold">
            ₹{tokenCharge.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Total Amount Box */}
      <div className="bg-indigo-50/60 border border-indigo-100/60 rounded-2xl p-5 mt-6 mb-6">
        <p className="text-[15px] font-semibold text-slate-700">Total amount</p>
        <p className="text-4xl font-extrabold text-[#0F172A] tracking-tight mt-1">
          ₹{totalAmount.toFixed(2)}
        </p>
      </div>

      {/* Action Button */}
      <button
        type="button"
        onClick={handleButtonClick}
        disabled={isButtonDisabled}
        className="w-full h-[52px] rounded-xl font-semibold text-base transition-all flex items-center justify-center gap-2 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20"
      >
        <span>{actionLabel || `Pay ₹${totalAmount.toFixed(2)}`}</span>
        <ArrowRight className="w-4.5 h-4.5" />
      </button>

      {/* Draft Saved Status Indicator */}
      {draftSavedTime && (
        <div className="flex items-center justify-center gap-1.5 mt-4 text-[12px] font-medium text-green-600">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
          <span>Draft saved {draftSavedTime}</span>
        </div>
      )}
    </div>
  );
}
