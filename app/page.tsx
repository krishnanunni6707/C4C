"use client";

import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4 py-16 animate-gradient-bg"
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

      {/* Grid overlay */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(#4f46e5 1px, transparent 1px), linear-gradient(to right, #4f46e5 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative z-10 w-full max-w-3xl mx-auto flex flex-col items-center text-center gap-8">
        
        {/* Wordmark */}
        <div className="flex items-center justify-center gap-1" role="img" aria-label="QDoc">
          <span className="text-7xl sm:text-8xl font-semibold text-slate-900 tracking-tight leading-none" style={{ letterSpacing: "-0.04em" }}>QD</span>
          <div className="animate-[bounce_3s_infinite_ease-in-out]">
            <Image src="/logo.png" alt="" aria-hidden="true" width={72} height={72} className="object-contain hover:rotate-[360deg] transition-transform duration-700 ease-in-out cursor-pointer" style={{ marginTop: "12px" }} />
          </div>
          <span className="text-7xl sm:text-8xl font-semibold text-slate-900 tracking-tight leading-none" style={{ letterSpacing: "-0.04em" }}>C</span>
        </div>

        <p className="text-lg font-medium text-slate-500 -mt-4">Campus Printing System</p>

        <Link href="/login" className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm px-8 py-4 rounded-xl transition-all shadow-lg shadow-indigo-600/20 hover:-translate-y-0.5">
          Sign in to print
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </Link>

        {/* Left-aligned Description Section */}
        <div className="w-full max-w-lg mt-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 shadow-lg">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-3 text-center">
            About the Platform
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed text-left">
            QDoc streamlines the campus printing experience by providing a centralized digital queue. 
            Upload your documents, manage your print jobs, and track your history all in one secure, 
            student focused interface designed to eliminate waiting and minimize waste.
          </p>
        </div>

        <div className="pt-2">
          <Link 
            href="/creator" 
            className="text-xs font-bold text-indigo-600 hover:text-indigo-500 uppercase tracking-widest transition-colors"
          >
            Meet the Developers →
          </Link>
        </div>

        <p className="mt-4 text-[11px] text-slate-400 font-mono">
          Contact the admin if you don&apos;t have an account.
        </p>
      </div>
    </main>
  );
}