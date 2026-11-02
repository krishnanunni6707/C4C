"use client";

import React from "react";
import QRCode from "react-qr-code";
import { ArrowRight, Play } from "lucide-react";

interface MobileLandingViewProps {
  onStartPrinting: () => void;
  onSeeHowItWorks?: () => void;
  className?: string;
}

export default function MobileLandingView({
  onStartPrinting,
  onSeeHowItWorks,
  className = "",
}: MobileLandingViewProps) {
  return (
    <div className={`flex-1 min-h-0 flex flex-col justify-between px-5 pt-2 pb-2 ${className}`}>
      {/* Top Heading */}
      <div className="space-y-1 pt-1 text-left">
        <h1 className="text-3xl sm:text-[34px] font-black tracking-tight leading-[1.1]">
          <span className="text-[#0F172A] block">Print on campus.</span>
          <span className="text-indigo-600 block">Skip the line.</span>
        </h1>
        <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-[320px]">
          Upload, configure and pay for your documents online.
        </p>
      </div>

      {/* Center: Tilted Phone Illustration with Token & QR */}
      <div className="my-auto py-2 flex items-center justify-center relative">
        {/* Soft background glow and faint decorative strokes */}
        <div className="absolute w-60 h-60 bg-indigo-100/70 rounded-full blur-3xl pointer-events-none" />
        <svg
          viewBox="0 0 320 320"
          className="absolute w-72 h-72 sm:w-80 sm:h-80 text-indigo-200/50 pointer-events-none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="160" cy="160" r="115" stroke="currentColor" strokeWidth="1.2" strokeDasharray="6 6" />
          <circle cx="160" cy="160" r="140" stroke="currentColor" strokeWidth="0.8" />
        </svg>

        {/* Tilted Smartphone Mockup */}
        <div className="relative w-44 sm:w-52 h-[260px] sm:h-[295px] bg-slate-900 rounded-[34px] sm:rounded-[38px] p-2 sm:p-2.5 shadow-2xl shadow-indigo-500/25 transform -rotate-6 hover:rotate-0 transition-transform duration-500 border-2 border-slate-800">
          {/* Dynamic Island Notch */}
          <div className="absolute top-2.5 sm:top-3 left-1/2 transform -translate-x-1/2 w-14 sm:w-16 h-3 bg-black rounded-full z-20 flex items-center justify-end pr-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-800" />
          </div>

          {/* Phone Screen Glass */}
          <div className="w-full h-full bg-white rounded-[26px] sm:rounded-[30px] overflow-hidden flex flex-col items-center justify-center p-2 relative text-center">
            {/* Screen Content: Mini Token Card */}
            <div className="w-full h-full bg-indigo-50/85 border border-indigo-100/90 rounded-[20px] p-2.5 flex flex-col items-center justify-center space-y-1 sm:space-y-1.5">
              <span className="text-[9px] sm:text-[10px] uppercase tracking-widest text-indigo-600 font-extrabold">
                Token Pass
              </span>
              <span className="text-base sm:text-lg font-black text-[#0F172A] font-mono tracking-wider">
                RP1042
              </span>
              <div className="p-2 bg-white rounded-xl border border-indigo-100/70 shadow-xs">
                <QRCode
                  value="token:RP1042"
                  size={68}
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                  viewBox={`0 0 68 68`}
                />
              </div>
              <span className="text-[8px] sm:text-[9px] text-slate-400 font-medium tracking-wide">
                Campus Print Hub
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Actions: Buttons & Pager Dots */}
      <div className="space-y-2 pb-2">
        <div className="space-y-2">
          {/* Start Printing CTA */}
          <button
            type="button"
            onClick={onStartPrinting}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <span>Start printing</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>

          {/* See How It Works CTA */}
          <button
            type="button"
            onClick={onSeeHowItWorks}
            className="w-full h-11 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-sm shadow-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <Play className="w-3.5 h-3.5 fill-current text-slate-700" />
            <span>See how it works</span>
          </button>
        </div>

        {/* 5 Pager Dots */}
        <div
          className="flex items-center justify-center gap-1.5 pt-0.5"
          aria-label="Carousel pagination"
        >
          <span className="w-4 h-1.5 rounded-full bg-indigo-600" />
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
        </div>
      </div>
    </div>
  );
}

