"use client";

import Image from "next/image";
import { useReducedMotion, motion } from "framer-motion";
import {
  Menu,
  MapPin,
  Home,
  Clock,
  History,
  Compass,
  Users,
} from "lucide-react";

export default function PhoneMockup() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="relative flex items-center justify-center py-6 select-none">
      {/* Decorative Faint Indigo Background Shapes */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-visible">
        {/* Diagonal Soft Panel 1 */}
        <div
          className="absolute w-72 h-80 bg-gradient-to-tr from-indigo-100/60 to-indigo-50/20 rounded-3xl -rotate-12 translate-x-12 -translate-y-8 blur-[1px]"
          aria-hidden="true"
        />

        {/* Diagonal Soft Panel 2 */}
        <div
          className="absolute w-60 h-72 bg-gradient-to-br from-indigo-100/50 to-transparent rounded-3xl rotate-45 -translate-x-16 translate-y-12 blur-[1px]"
          aria-hidden="true"
        />

        {/* Faint Chart Line SVG */}
        <svg
          className="absolute -top-4 -right-2 w-32 h-20 text-indigo-300/60"
          viewBox="0 0 120 60"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M10 50 L35 32 L55 42 L85 18 L110 24" />
          <circle cx="85" cy="18" r="3" fill="#4F46E5" />
        </svg>

        {/* Curly Stroke SVG */}
        <svg
          className="absolute top-20 -left-12 w-24 h-24 text-indigo-300/50"
          viewBox="0 0 80 80"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M 15,65 Q 10,25 35,30 Q 60,35 45,60 Q 30,85 55,75 Q 75,65 65,40" />
        </svg>

        {/* Short Slashes (Hatch marks) SVG */}
        <svg
          className="absolute bottom-12 -left-8 w-16 h-16 text-indigo-400/50"
          viewBox="0 0 50 50"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <line x1="10" y1="35" x2="25" y2="15" />
          <line x1="20" y1="35" x2="35" y2="15" />
          <line x1="30" y1="35" x2="45" y2="15" />
        </svg>

        {/* Sparkles / Crosses */}
        <div
          className="absolute top-1/4 -right-10 text-indigo-400/70 text-lg font-bold"
          aria-hidden="true"
        >
          ✦
        </div>
        <div
          className="absolute bottom-1/3 -left-6 text-indigo-400/60 text-sm font-bold"
          aria-hidden="true"
        >
          ✦
        </div>
      </div>

      {/* Floating Animated Phone Wrapper */}
      <motion.div
        animate={
          shouldReduceMotion
            ? { y: 0 }
            : {
                y: [0, -10, 0],
              }
        }
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="relative z-10"
      >
        {/* Floating Queue Status Chip (Right Edge of Phone) */}
        <div className="absolute top-[22%] -right-3 sm:-right-7 z-30 bg-white/95 backdrop-blur-sm border border-slate-100 rounded-xl px-3 py-2 shadow-[0_10px_25px_-5px_rgba(15,23,42,0.12),0_2px_6px_-1px_rgba(15,23,42,0.06)] flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0">
            <Users className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-semibold text-slate-800 tracking-tight whitespace-nowrap">
            3 ahead · ~4 min
          </span>
        </div>

        {/* Phone Frame */}
        <div className="w-[305px] sm:w-[325px] bg-[#0F172A] p-[10px] sm:p-[11px] rounded-[48px] shadow-[0_25px_60px_-15px_rgba(15,23,42,0.35),0_0_0_1px_rgba(255,255,255,0.12)_inset] ring-1 ring-slate-800/80">
          {/* Inner Phone Screen */}
          <div className="bg-[#F8FAFC] rounded-[38px] overflow-hidden flex flex-col justify-between border border-slate-200/40 relative">
            {/* Top Status Bar & Notch */}
            <div className="pt-2.5 px-6 pb-1 flex items-center justify-between text-slate-900">
              <span className="text-[11px] font-semibold tracking-tight">
                9:41
              </span>

              {/* Dynamic Island Notch */}
              <div className="w-20 h-4.5 bg-black rounded-full flex items-center justify-end pr-2">
                <div className="w-2 h-2 rounded-full bg-slate-900 border border-slate-800" />
              </div>

              {/* Status Icons: Cellular, Wifi, Battery */}
              <div className="flex items-center gap-1.5 text-slate-800">
                <svg className="w-3.5 h-3" viewBox="0 0 16 12" fill="currentColor">
                  <rect x="0" y="8" width="2.5" height="4" rx="0.5" />
                  <rect x="4" y="6" width="2.5" height="6" rx="0.5" />
                  <rect x="8" y="3" width="2.5" height="9" rx="0.5" />
                  <rect x="12" y="0" width="2.5" height="12" rx="0.5" />
                </svg>
                <svg className="w-3.5 h-3" viewBox="0 0 16 12" fill="currentColor">
                  <path d="M8 2.5C5.2 2.5 2.7 3.6 0.9 5.4L8 12.5L15.1 5.4C13.3 3.6 10.8 2.5 8 2.5Z" />
                </svg>
                <div className="w-4 h-2.5 border border-slate-800 rounded-[2px] p-[1px] flex items-center">
                  <div className="w-full h-full bg-slate-800 rounded-[1px]" />
                </div>
              </div>
            </div>

            {/* App In-Screen Header */}
            <div className="px-4 py-2 flex items-center justify-between">
              <div className="flex items-center">
                <Image
                  src="/logo-new-updated.png"
                  alt="QDoc"
                  width={68}
                  height={20}
                  className="h-4.5 w-auto object-contain"
                />
              </div>
              <button
                type="button"
                className="text-slate-700 hover:text-slate-900"
                aria-label="Phone menu"
                tabIndex={-1}
              >
                <Menu className="w-4 h-4" />
              </button>
            </div>

            {/* White Token Card */}
            <div className="mx-3.5 my-1.5 bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.06)] text-center flex flex-col items-center">
              <span className="text-[11px] font-medium text-slate-400 tracking-wide">
                Your Token
              </span>
              <span className="text-2xl font-black font-mono text-indigo-700 tracking-wider mt-0.5">
                RP1042
              </span>

              {/* High-Fidelity Inline SVG QR Code Placeholder */}
              <div className="my-2.5 p-2 bg-white rounded-xl border border-slate-100 shadow-inner">
                <svg
                  className="w-24 h-24"
                  viewBox="0 0 100 100"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-label="QR Code for Token RP1042"
                  role="img"
                >
                  {/* Top-Left Finder Pattern */}
                  <rect x="6" y="6" width="26" height="26" rx="4" fill="#0F172A" />
                  <rect x="10" y="10" width="18" height="18" rx="2" fill="white" />
                  <rect x="14" y="14" width="10" height="10" rx="1" fill="#0F172A" />

                  {/* Top-Right Finder Pattern */}
                  <rect x="68" y="6" width="26" height="26" rx="4" fill="#0F172A" />
                  <rect x="72" y="10" width="18" height="18" rx="2" fill="white" />
                  <rect x="76" y="14" width="10" height="10" rx="1" fill="#0F172A" />

                  {/* Bottom-Left Finder Pattern */}
                  <rect x="6" y="68" width="26" height="26" rx="4" fill="#0F172A" />
                  <rect x="10" y="72" width="18" height="18" rx="2" fill="white" />
                  <rect x="14" y="76" width="10" height="10" rx="1" fill="#0F172A" />

                  {/* QR Data Modules Matrix */}
                  {/* Row 1-2 & Top Data */}
                  <rect x="36" y="6" width="4" height="4" fill="#0F172A" />
                  <rect x="44" y="6" width="8" height="4" fill="#0F172A" />
                  <rect x="56" y="6" width="4" height="4" fill="#0F172A" />

                  <rect x="36" y="14" width="4" height="4" fill="#0F172A" />
                  <rect x="44" y="14" width="4" height="4" fill="#0F172A" />
                  <rect x="52" y="14" width="8" height="4" fill="#0F172A" />

                  <rect x="36" y="22" width="8" height="4" fill="#0F172A" />
                  <rect x="48" y="22" width="4" height="4" fill="#0F172A" />
                  <rect x="60" y="22" width="4" height="4" fill="#0F172A" />

                  {/* Horizontal Timing Pattern */}
                  <rect x="6" y="36" width="4" height="4" fill="#0F172A" />
                  <rect x="14" y="36" width="4" height="4" fill="#0F172A" />
                  <rect x="22" y="36" width="4" height="4" fill="#0F172A" />
                  <rect x="30" y="36" width="4" height="4" fill="#0F172A" />
                  <rect x="38" y="36" width="4" height="4" fill="#0F172A" />
                  <rect x="46" y="36" width="4" height="4" fill="#0F172A" />
                  <rect x="54" y="36" width="4" height="4" fill="#0F172A" />
                  <rect x="62" y="36" width="4" height="4" fill="#0F172A" />
                  <rect x="70" y="36" width="4" height="4" fill="#0F172A" />
                  <rect x="78" y="36" width="4" height="4" fill="#0F172A" />
                  <rect x="86" y="36" width="8" height="4" fill="#0F172A" />

                  {/* Vertical Timing Pattern */}
                  <rect x="36" y="44" width="4" height="4" fill="#0F172A" />
                  <rect x="36" y="52" width="4" height="4" fill="#0F172A" />
                  <rect x="36" y="60" width="4" height="4" fill="#0F172A" />
                  <rect x="36" y="68" width="4" height="4" fill="#0F172A" />
                  <rect x="36" y="76" width="4" height="4" fill="#0F172A" />
                  <rect x="36" y="84" width="4" height="4" fill="#0F172A" />

                  {/* Middle Center Block */}
                  <rect x="44" y="44" width="12" height="4" fill="#0F172A" />
                  <rect x="44" y="52" width="4" height="8" fill="#0F172A" />
                  <rect x="52" y="56" width="8" height="4" fill="#0F172A" />
                  <rect x="48" y="64" width="8" height="4" fill="#0F172A" />

                  {/* Alignment Pattern Bottom Right */}
                  <rect x="66" y="66" width="18" height="18" rx="2" fill="#0F172A" />
                  <rect x="70" y="70" width="10" height="10" rx="1" fill="white" />
                  <rect x="73" y="73" width="4" height="4" fill="#0F172A" />

                  {/* Right Edge Data Blocks */}
                  <rect x="70" y="44" width="8" height="4" fill="#0F172A" />
                  <rect x="82" y="44" width="12" height="4" fill="#0F172A" />
                  <rect x="74" y="52" width="4" height="4" fill="#0F172A" />
                  <rect x="86" y="52" width="8" height="4" fill="#0F172A" />
                  <rect x="88" y="60" width="6" height="4" fill="#0F172A" />
                  <rect x="70" y="60" width="8" height="4" fill="#0F172A" />

                  {/* Bottom Strip Data */}
                  <rect x="44" y="76" width="4" height="8" fill="#0F172A" />
                  <rect x="52" y="76" width="8" height="4" fill="#0F172A" />
                  <rect x="56" y="84" width="4" height="8" fill="#0F172A" />
                  <rect x="68" y="88" width="8" height="4" fill="#0F172A" />
                  <rect x="82" y="88" width="12" height="4" fill="#0F172A" />
                </svg>
              </div>

              {/* Document Info */}
              <p className="text-xs font-bold text-slate-800 tracking-tight max-w-[210px] truncate">
                Operating_Systems_Notes.pdf
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                24 pages · 2 copies
              </p>
              <p className="text-[10px] text-slate-400 font-medium">
                Color · Double sided
              </p>

              {/* Location Pin */}
              <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-700 mt-1.5">
                <MapPin className="w-3 h-3 text-indigo-600" />
                <span>Main Print Room</span>
              </div>

              {/* Printing Status Badge */}
              <div className="mt-2 inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200/80 text-emerald-700 px-3 py-0.5 rounded-full text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Printing</span>
              </div>
            </div>

            {/* Bottom Tab Bar */}
            <div className="bg-white/95 border-t border-slate-100 px-4 py-2 flex items-center justify-between text-slate-400">
              {/* Tab 1: Home (Active) */}
              <div className="flex flex-col items-center gap-0.5 text-indigo-600">
                <Home className="w-4 h-4" />
                <span className="text-[9px] font-bold">Home</span>
              </div>

              {/* Tab 2: Active */}
              <div className="flex flex-col items-center gap-0.5 hover:text-slate-600 transition-colors">
                <Clock className="w-4 h-4" />
                <span className="text-[9px] font-medium">Active</span>
              </div>

              {/* Tab 3: History */}
              <div className="flex flex-col items-center gap-0.5 hover:text-slate-600 transition-colors">
                <History className="w-4 h-4" />
                <span className="text-[9px] font-medium">History</span>
              </div>

              {/* Tab 4: Locations */}
              <div className="flex flex-col items-center gap-0.5 hover:text-slate-600 transition-colors">
                <Compass className="w-4 h-4" />
                <span className="text-[9px] font-medium">Locations</span>
              </div>
            </div>

            {/* iOS Home Indicator Bar */}
            <div className="py-1 bg-white flex justify-center">
              <div className="w-24 h-1 bg-slate-900/80 rounded-full" />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
