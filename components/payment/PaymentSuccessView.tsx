"use client";

import React from "react";
import Link from "next/link";
import { Check, Clock, FileText, Home, X } from "lucide-react";

export interface PaymentSuccessViewProps {
  tokenNumber?: string;
  jobId?: string;
  queueAheadCount?: number;
  estimatedWaitMinutes?: number;
  onClose?: () => void;
  onBackToHome?: () => void;
  containerClassName?: string;
  showSubtitle?: boolean;
}

export default function PaymentSuccessView({
  tokenNumber = "RP1042",
  jobId,
  queueAheadCount = 2,
  estimatedWaitMinutes = 3,
  onClose,
  onBackToHome,
  containerClassName = "fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-in fade-in duration-200",
  showSubtitle = true,
}: PaymentSuccessViewProps) {
  const handleHomeClick = () => {
    if (onBackToHome) {
      onBackToHome();
    } else if (onClose) {
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="success-modal-title"
      className={containerClassName}
    >
      <div
        className="w-full max-w-[460px] bg-white rounded-2xl shadow-2xl p-7 border border-slate-100 relative animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top-Right Close Button */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <X className="w-5 h-5 stroke-[2]" />
          </button>
        )}

        {/* Content Container */}
        <div className="flex flex-col items-center text-center pt-2">
          {/* Animated Green Check Circle with 6 Burst Strokes */}
          <div className="relative w-20 h-20 flex items-center justify-center mb-3">
            {/* 6 Radial burst strokes around circle */}
            <svg
              viewBox="0 0 60 60"
              className="absolute inset-0 w-full h-full text-emerald-400/90 motion-safe:animate-[spin_24s_linear_infinite]"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              {/* Top & Bottom */}
              <line x1="30" y1="2" x2="30" y2="8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="30" y1="52" x2="30" y2="58" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              {/* Top-Left & Bottom-Right */}
              <line x1="11" y1="13" x2="16" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="44" y1="42" x2="49" y2="47" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              {/* Top-Right & Bottom-Left */}
              <line x1="49" y1="13" x2="44" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="16" y1="42" x2="11" y2="47" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>

            {/* Solid Emerald Gradient Circle */}
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-500 to-emerald-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25">
              <Check className="w-9 h-9 stroke-[3]" />
            </div>
          </div>

          {/* Heading & Subtitle */}
          <h2
            id="success-modal-title"
            className="text-2xl font-bold text-[#0F172A] tracking-tight"
          >
            Payment successful!
          </h2>
          {showSubtitle && (
            <p className="text-sm text-slate-500 mt-1 max-w-sm">
              Your print job has been submitted successfully.
            </p>
          )}

          {/* Token Box */}
          <div className="w-full mt-5 mb-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl py-4 px-6 text-center">
            <span className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] font-mono tracking-wider block">
              {tokenNumber}
            </span>
          </div>

          {/* Queue Position and Time Estimate Row */}
          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 font-medium">
            <Clock className="w-4 h-4 text-slate-400 stroke-[2]" />
            <span>
              {queueAheadCount} ahead • ~{estimatedWaitMinutes} min
            </span>
          </div>

          {/* Action Buttons: Side by Side on Desktop, Stacked on <480px */}
          <div className="w-full flex flex-col sm:flex-row gap-3 mt-6 pt-1">
            {jobId ? (
              <Link
                href={`/student/token-slip/${jobId}`}
                className="flex-1 h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-sm shadow-indigo-600/20 flex items-center justify-center gap-2 transition-colors order-1 sm:order-1"
              >
                <FileText className="w-4 h-4" />
                <span>View token slip</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-sm shadow-indigo-600/20 flex items-center justify-center gap-2 transition-colors order-1 sm:order-1"
              >
                <FileText className="w-4 h-4" />
                <span>View token slip</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleHomeClick}
              className="flex-1 h-11 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm flex items-center justify-center gap-2 transition-colors order-2 sm:order-2"
            >
              <Home className="w-4 h-4 text-slate-500" />
              <span>Back to home</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
