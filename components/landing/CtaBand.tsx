"use client";

import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

export default function CtaBand() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="py-8 my-8">
      <div className="max-w-[1140px] mx-auto px-6">
        <motion.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative bg-[#EEF2FF] border border-indigo-100 rounded-2xl p-8 sm:p-12 overflow-hidden shadow-sm"
        >
          {/* Subtle background glow */}
          <div
            className="absolute -top-12 -right-12 w-64 h-64 bg-indigo-200/30 rounded-full blur-3xl pointer-events-none"
            aria-hidden="true"
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            {/* Left Column: Heading and Subtitle */}
            <div className="lg:col-span-5 text-left">
              <span className="text-xs font-semibold text-indigo-600 tracking-wide block mb-2">
                Ready to get started?
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight leading-tight">
                Join thousands of students who print smarter.
              </h2>
              <p className="mt-2 text-sm text-slate-500 font-medium">
                Simple. Fast. Reliable.
              </p>
            </div>

            {/* Middle Column: Floating Document Illustration */}
            <div className="lg:col-span-3 flex justify-center items-center py-4 lg:py-0">
              <div className="relative">
                {/* Floating sparkles */}
                <span
                  className="absolute -top-3 -right-3 text-indigo-400 text-xs font-bold"
                  aria-hidden="true"
                >
                  ✦
                </span>
                <span
                  className="absolute bottom-1 -left-4 text-indigo-400 text-sm font-bold"
                  aria-hidden="true"
                >
                  ✦
                </span>
                <span
                  className="absolute -bottom-2 right-4 text-indigo-300 text-xs"
                  aria-hidden="true"
                >
                  •
                </span>

                {/* Angled Underlay Card (Shadow base) */}
                <div className="w-24 h-32 bg-indigo-200/60 rounded-xl transform rotate-6 translate-x-2 translate-y-1 shadow-sm" />

                {/* Front Angled Document */}
                <div className="absolute inset-0 w-24 h-32 bg-white rounded-xl shadow-md border border-slate-100/90 transform -rotate-6 p-3 flex flex-col justify-between">
                  {/* Folded Top-Right Corner */}
                  <div className="absolute top-0 right-0 w-5 h-5 bg-indigo-50 rounded-bl-lg border-b border-l border-indigo-100" />

                  {/* Document Simulated Lines */}
                  <div className="space-y-1.5 mt-2">
                    <div className="w-12 h-1.5 bg-indigo-500 rounded-full" />
                    <div className="w-14 h-1.5 bg-indigo-200 rounded-full" />
                    <div className="w-10 h-1.5 bg-indigo-200 rounded-full" />
                    <div className="w-12 h-1.5 bg-indigo-100 rounded-full" />
                  </div>

                  {/* Bottom Accent */}
                  <div className="w-6 h-1.5 bg-indigo-400 rounded-full" />
                </div>
              </div>
            </div>

            {/* Right Column: CTA Button & Microcopy */}
            <div className="lg:col-span-4 flex flex-col items-start lg:items-end justify-center">
              <motion.div
                whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
              >
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm sm:text-base px-6 py-3.5 rounded-xl transition-all shadow-md shadow-indigo-600/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                >
                  <span>Start printing</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>

              <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 font-normal">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>It only takes a minute to get started.</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
