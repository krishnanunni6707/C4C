"use client";

import Link from "next/link";
import Image from "next/image";
import { Zap, ShieldCheck, Leaf } from "lucide-react";
import TokenIllustration from "./TokenIllustration";

export default function AuthBrandPanel() {
  return (
    <aside
      className="relative w-full h-full lg:min-h-screen bg-gradient-to-br from-white via-indigo-50/30 to-indigo-50/70 p-6 sm:p-8 lg:p-10 xl:p-12 flex flex-col justify-between overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-200/80"
      aria-label="Brand Information"
    >
      {/* Background Soft Indigo Glow Blobs */}
      <div
        className="absolute -top-24 -left-24 w-80 h-80 bg-indigo-200/30 rounded-full blur-3xl pointer-events-none -z-10"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-24 -right-24 w-80 h-80 bg-indigo-300/20 rounded-full blur-3xl pointer-events-none -z-10"
        aria-hidden="true"
      />

      {/* Top Brand & Headline Section */}
      <div className="relative z-10">
        {/* Brand Logo */}
        <Link
          href="/"
          className="inline-flex items-center group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg"
          aria-label="QDoc Home"
        >
          <Image
            src="/logo-new-updated-original.png"
            alt="QDoc"
            width={140}
            height={42}
            className="h-9 sm:h-10 w-auto object-contain"
            priority
          />
        </Link>

        {/* Headline */}
        <h2 className="text-3xl sm:text-4xl lg:text-[44px] xl:text-[50px] font-extrabold tracking-tight text-[#0F172A] leading-[1.08] mt-6 lg:mt-8">
          <span className="block xl:whitespace-nowrap">Your campus print room,</span>
          <span className="block text-indigo-600">online</span>
        </h2>

        {/* Subtitle (Hidden on mobile <1024 for compact header requirement) */}
        <p className="hidden lg:block mt-3 text-base lg:text-[18px] text-slate-500 leading-relaxed max-w-md font-normal">
          Print, pay, and collect – all from your phone
          <br />
          or laptop. Fast. Simple. Reliable.
        </p>
      </div>

      {/* Center Illustration (Desktop only, hidden on small screens) */}
      <div className="hidden lg:flex flex-1 items-center justify-center py-2 xl:py-4">
        <TokenIllustration />
      </div>

      {/* Bottom Feature Items Row (Desktop only) */}
      <div className="hidden lg:flex items-center justify-between gap-3 pt-5 border-t border-slate-200/70">
        {/* Item 1: Fast & Easy */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0">
            <Zap className="w-4 h-4" strokeWidth={2.2} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#0F172A] leading-tight">
              Fast & Easy
            </h3>
            <p className="text-[10px] text-slate-400 font-normal leading-tight mt-0.5">
              Get your prints in
              <br />
              minutes, not hours.
            </p>
          </div>
        </div>

        {/* Thin Divider */}
        <div className="w-[1px] h-7 bg-slate-200/80 flex-shrink-0" aria-hidden="true" />

        {/* Item 2: Secure Payments */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0">
            <ShieldCheck className="w-4 h-4" strokeWidth={2.2} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#0F172A] leading-tight">
              Secure Payments
            </h3>
            <p className="text-[10px] text-slate-400 font-normal leading-tight mt-0.5">
              UPI, cards and more.
            </p>
          </div>
        </div>

        {/* Thin Divider */}
        <div className="w-[1px] h-7 bg-slate-200/80 flex-shrink-0" aria-hidden="true" />

        {/* Item 3: Eco Friendly */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0">
            <Leaf className="w-4 h-4" strokeWidth={2.2} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#0F172A] leading-tight">
              Eco Friendly
            </h3>
            <p className="text-[10px] text-slate-400 font-normal leading-tight mt-0.5">
              Less paper waste,
              <br />
              greener campus.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
