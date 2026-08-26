"use client";

import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div
      className="min-h-screen flex flex-col bg-slate-50 text-slate-800 antialiased selection:bg-indigo-500 selection:text-white animate-gradient-bg relative overflow-x-hidden"
      style={{
        background: "linear-gradient(-45deg, #f8fafc, #f1f5f9, #e2e8f0, #f8fafc)",
        backgroundSize: "400% 400%",
      }}
    >
      <style jsx global>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient-bg {
          animation: gradient 15s ease infinite;
        }
      `}</style>

      {/* Crisp background grid pattern */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.04] z-0"
        style={{
          backgroundImage:
            "linear-gradient(#4f46e5 1px, transparent 1px), linear-gradient(to right, #4f46e5 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* ── 1. Top Navigation Bar (Full Width Container) ── */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/85 border-b border-slate-200/80 px-6 sm:px-10 py-4 shadow-sm transition-all">
        <div className="w-full max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo & Wordmark */}
          <Link href="/" className="flex items-center gap-2 group cursor-pointer" aria-label="QDoc Home">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">QD</span>
            <Image
              src="/logo.png"
              alt="QDoc Logo"
              width={34}
              height={34}
              className="object-contain group-hover:rotate-[360deg] transition-transform duration-700 ease-in-out"
            />
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">C</span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-6 sm:gap-8">
            <a
              href="#about"
              className="hidden sm:inline-block text-xs font-bold text-slate-600 hover:text-indigo-600 uppercase tracking-widest transition-colors"
            >
              About
            </a>
            <Link
              href="/creator"
              className="text-xs font-bold text-slate-600 hover:text-indigo-600 uppercase tracking-widest transition-colors"
            >
              Developers
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/20 hover:shadow-indigo-600/30"
            >
              Sign in to print
            </Link>
          </div>
        </div>
      </header>

      {/* ── 2. Main Hero Container ── */}
      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-6 sm:px-10 pt-12 sm:pt-16 pb-20 flex flex-col items-center text-center">

        {/* 3. Oversized Confident Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold text-slate-900 tracking-tight leading-[1.05] max-w-5xl">
          Print from anywhere <br className="hidden sm:block" />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-700">
            on campus.
          </span>
        </h1>

        {/* Sub-copy */}
        <p className="mt-6 text-base sm:text-xl text-slate-600 max-w-3xl font-normal leading-relaxed">
          QDoc provides a seamless digital queue for campus printing. Upload your files, customize settings, and track live status without standing in line.
        </p>

        {/* 4. Dual CTA Pattern */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base px-9 py-4 rounded-xl transition-all shadow-xl shadow-indigo-600/25 hover:-translate-y-0.5 active:translate-y-0"
          >
            Sign in to print
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </Link>
          <Link
            href="/creator"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 font-bold text-base px-8 py-4 rounded-xl transition-all shadow-sm hover:border-slate-300"
          >
            Meet the Developers →
          </Link>
        </div>

        {/* 5. Feature & Trust Badge Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-5xl mt-12">
          {[
            {
              label: "Instant Digital Queue",
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-indigo-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
              ),
            },
            {
              label: "4 Campus Print Hubs",
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-indigo-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0z" />
                </svg>
              ),
            },
            {
              label: "Live Queue Tracking",
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-indigo-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125z" />
                </svg>
              ),
            },
            {
              label: "Secure Student Auth",
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-indigo-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751A11.959 11.959 0 0 1 12 2.714z" />
                </svg>
              ),
            },
          ].map((b, i) => (
            <div
              key={i}
              className="flex items-center justify-center gap-2.5 px-4 py-3 bg-white/80 backdrop-blur-sm border border-slate-200/80 rounded-xl shadow-sm hover:shadow transition-all"
            >
              {b.icon}
              <span className="text-xs sm:text-sm font-bold text-slate-700 font-mono tracking-tight">{b.label}</span>
            </div>
          ))}
        </div>

        {/* 6. Decorative SaaS Visual Centerpiece */}
        <div className="relative w-full max-w-6xl my-14 group">
          {/* Ambient Glow */}
          <div className="absolute -inset-2 bg-gradient-to-r from-indigo-500/25 to-indigo-600/25 rounded-3xl blur-3xl opacity-60 group-hover:opacity-85 transition duration-700" />

          {/* Main Mockup Card Window */}
          <div className="relative bg-white border border-slate-200/90 rounded-2xl shadow-2xl overflow-hidden text-left">
            {/* Mockup Title Bar */}
            <div className="px-5 py-3.5 bg-slate-50/90 border-b border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400/80" />
                <div className="w-3 h-3 rounded-full bg-amber-400/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-400/80" />
                <span className="ml-2 text-xs font-mono font-medium text-slate-400">qdoc.campus.edu/student</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 text-slate-200 text-[11px] font-mono border border-slate-800 shadow-md">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span className="font-bold text-slate-100 tracking-tight">Hub Online</span>
                  <span className="text-slate-600 font-extrabold">&bull;</span>
                  <span className="text-indigo-400 font-bold">4 Nodes Active</span>
                </div>
              </div>
            </div>

            {/* Mockup Content Layout Grid */}
            <div className="p-6 sm:p-10 grid grid-cols-1 md:grid-cols-12 gap-8 bg-gradient-to-b from-white to-slate-50/60">

              {/* Left Side: Staged File Card */}
              <div className="md:col-span-5 flex flex-col justify-between gap-4">
                <div className="border-2 border-dashed border-indigo-200 bg-indigo-50/30 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                  <div className="w-14 h-14 rounded-2xl bg-white border border-indigo-100 shadow-sm flex items-center justify-center text-indigo-600 mb-3">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-7 h-7">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9z" />
                    </svg>
                  </div>
                  <p className="text-sm font-bold text-slate-800 truncate w-full">Lecture_Notes_Week4.pdf</p>
                  <p className="text-xs font-mono text-slate-400 mt-1">12 pages &bull; 2.4 MB &bull; Staged</p>
                  <div className="mt-4 inline-flex items-center gap-1.5 bg-indigo-600 text-white text-xs font-bold px-4 py-1.5 rounded-xl shadow-sm">
                    <span>Document Staged</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="w-3.5 h-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-mono">Selected Hub</span>
                    <span className="font-bold text-slate-800">Library Hub - Ground Floor</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-mono">Print Settings</span>
                    <span className="font-bold text-slate-800">B&W &bull; Duplex &bull; 2 Copies</span>
                  </div>
                </div>
              </div>

              {/* Right Side: Digital Queue Token & Live Status */}
              <div className="md:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 flex flex-col justify-between shadow-sm">
                <div>
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <span className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-black font-mono tracking-wider rounded-lg shadow-sm">
                        TOKEN #A-104
                      </span>
                      <span className="text-sm font-bold text-slate-800">Live Print Job</span>
                    </div>
                    <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-mono font-bold animate-pulse">
                      PRINTING (Page 8/12)
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-6 space-y-2">
                    <div className="flex justify-between text-xs font-mono font-semibold text-slate-500">
                      <span>Queue Progress</span>
                      <span>66%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-indigo-600 h-full w-[66%] rounded-full transition-all duration-500" />
                    </div>
                  </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-3 gap-3 mt-6 pt-4 border-t border-slate-100 text-center">
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Wait Time</p>
                    <p className="text-sm font-bold text-slate-800 font-mono mt-0.5">~1 min</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Total Cost</p>
                    <p className="text-sm font-bold text-slate-800 font-mono mt-0.5">₹ 18.00</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Payment</p>
                    <p className="text-sm font-bold text-emerald-600 font-mono mt-0.5 flex items-center justify-center gap-1">
                      <span>PAID</span>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="w-3.5 h-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* 7. Comprehensive About & How-It-Works Section */}
        <section id="about" className="w-full max-w-6xl mt-6 space-y-10 text-left">
          
          {/* Main About Banner */}
          <div className="bg-white/80 backdrop-blur-md border border-slate-200/90 rounded-3xl p-8 sm:p-12 shadow-xl">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              <div className="md:col-span-4 space-y-3">
                <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-3.5 py-1 rounded-full text-indigo-600 text-xs font-mono font-bold">
                  <span className="w-2 h-2 rounded-full bg-indigo-600" />
                  ABOUT THE PLATFORM
                </div>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                  Designed for speed & zero waiting.
                </h2>
              </div>
              <div className="md:col-span-8 border-t md:border-t-0 md:border-l border-slate-200/80 pt-6 md:pt-0 md:pl-8">
                <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                  QDoc streamlines the campus printing experience by providing a centralized digital queue. 
                  Upload your documents, manage your print jobs, and track your history all in one secure, 
                  student-focused interface designed to eliminate waiting and minimize waste.
                </p>
              </div>
            </div>
          </div>

          {/* How to Print: 4-Step Workflow */}
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-slate-200/80 pb-4">
              <div>
                <span className="text-xs font-mono font-bold text-indigo-600 uppercase tracking-widest">HOW TO PRINT</span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
                  Submit & print in 4 simple steps
                </h3>
              </div>
              <p className="text-xs font-mono text-slate-400">Complete workflow in under 2 minutes</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                {
                  step: "01",
                  title: "Upload Documents",
                  desc: "Select PDF, Word (.doc, .docx), PowerPoint (.pptx), or image files (.png, .jpg) directly from your device.",
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6 text-indigo-600">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                  ),
                },
                {
                  step: "02",
                  title: "Edit & Reorder",
                  desc: "Preview pages, trim unwanted sheets, reorder pages dynamically, or merge multiple files into one PDF.",
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6 text-indigo-600">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                    </svg>
                  ),
                },
                {
                  step: "03",
                  title: "Configure & Submit",
                  desc: "Select your preferred Campus Hub, print mode (B&W or Color), single/double-sided, and copies.",
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6 text-indigo-600">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 18H7.5M3.75 12h16.5" />
                    </svg>
                  ),
                },
                {
                  step: "04",
                  title: "Track & Collect",
                  desc: "Receive your unique Token Number, monitor live queue status, and collect your physical prints seamlessly.",
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6 text-indigo-600">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                    </svg>
                  ),
                },
              ].map((s, idx) => (
                <div key={idx} className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                        {s.icon}
                      </div>
                      <span className="text-2xl font-black font-mono text-slate-300">{s.step}</span>
                    </div>
                    <h4 className="text-base font-bold text-slate-900 tracking-tight">{s.title}</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Key Platform Features Grid */}
          <div className="space-y-6 pt-4">
            <div className="border-b border-slate-200/80 pb-4">
              <span className="text-xs font-mono font-bold text-indigo-600 uppercase tracking-widest">BUILT-IN FEATURES</span>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
                Everything you need for seamless campus printing
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  title: "Draft Auto-Save Persistence",
                  desc: "Never lose your staged files or custom print settings. Built-in IndexedDB persistence auto-saves your progress as you work.",
                  tag: "IndexedDB Powered",
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5 text-indigo-600">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 5.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                    </svg>
                  ),
                },
                {
                  title: "Multi-Format File Support",
                  desc: "Stage PDF, Word (.doc, .docx), PowerPoint (.pptx), and Images (.png, .jpg) seamlessly with client-side image-to-PDF conversion.",
                  tag: "Expanded Formats",
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5 text-indigo-600">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9z" />
                    </svg>
                  ),
                },
                {
                  title: "Multi-Hub Routing & Tracking",
                  desc: "Select from 4 active printer hubs across campus. Monitor live progress, queue position, estimated wait times, and status tokens.",
                  tag: "Real-time Queue",
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5 text-indigo-600">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                    </svg>
                  ),
                },
              ].map((f, idx) => (
                <div key={idx} className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                      {f.icon}
                    </div>
                    <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100">
                      {f.tag}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-slate-900 tracking-tight">{f.title}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

        </section>

        {/* Footer Container (Full Width) */}
        <footer className="w-full max-w-6xl mt-20 pt-8 border-t border-slate-200/70 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="text-base font-black text-slate-900">QDoc</span>
            <span className="text-xs text-slate-400">&bull; Campus Printing System</span>
          </div>
          <Link
            href="/creator"
            className="text-xs font-bold text-indigo-600 hover:text-indigo-500 uppercase tracking-widest transition-colors"
          >
            Meet the Developers →
          </Link>
          <p className="text-xs text-slate-400 font-mono">
            Contact the admin if you don&apos;t have an account.
          </p>
        </footer>

      </main>
    </div>
  );
}