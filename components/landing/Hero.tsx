"use client";

import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import PhoneMockup from "./PhoneMockup";

export default function Hero() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden pt-10 sm:pt-14 pb-16 sm:pb-24">
      {/* Background soft indigo-50 -> white vertical gradient & faint blurred blobs */}
      <div className="absolute inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 inset-x-0 h-[600px] bg-gradient-to-b from-indigo-50/70 via-indigo-50/20 to-transparent" />
        <div className="absolute top-10 left-1/4 w-96 h-96 bg-indigo-200/20 rounded-full blur-3xl" />
        <div className="absolute top-24 right-1/4 w-80 h-80 bg-indigo-300/15 rounded-full blur-3xl" />
      </div>

      <div className="max-w-[1140px] mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Copy & CTAs */}
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="lg:col-span-7 flex flex-col items-start text-left"
          >
            {/* Pill Tag */}
            <div className="inline-flex items-center gap-1.5 text-indigo-600 text-xs font-semibold tracking-wide mb-6">
              <span>Fast</span>
              <span className="text-indigo-300">·</span>
              <span>Easy</span>
              <span className="text-indigo-300">·</span>
              <span>On Campus</span>
            </div>

            {/* H1 Two Lines */}
            <h1 className="text-5xl sm:text-6xl lg:text-[70px] font-extrabold tracking-tight leading-[1.05] text-[#0F172A]">
              Print on campus.
              <br />
              <span className="text-indigo-600">Skip the line.</span>
            </h1>

            {/* Paragraph */}
            <p className="mt-6 text-base sm:text-lg text-slate-500 leading-relaxed max-w-xl font-normal">
              QDoc Campus Print lets you upload, configure and pay for your
              documents online. Get a token and collect your prints from campus
              print centers — no queues, no hassle.
            </p>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <motion.div whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm sm:text-base px-6 py-3.5 rounded-xl transition-all shadow-md shadow-indigo-600/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                >
                  <span>Start printing</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>

              <motion.div whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center gap-2.5 bg-white hover:bg-indigo-50/50 border border-indigo-200/90 text-indigo-600 font-semibold text-sm sm:text-base px-5 py-3.5 rounded-xl transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                >
                  <span className="w-5 h-5 rounded-full border border-indigo-200 flex items-center justify-center pl-0.5">
                    <Play className="w-2.5 h-2.5 fill-indigo-600 text-indigo-600" />
                  </span>
                  <span>See how it works</span>
                </a>
              </motion.div>
            </div>
          </motion.div>

          {/* Right Column: Phone Mockup */}
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
            className="lg:col-span-5 flex justify-center lg:justify-end"
          >
            <PhoneMockup />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
