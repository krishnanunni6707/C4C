"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { Printer, FileText, MapPin, Clock, Send } from "lucide-react";

export default function TokenIllustration() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="relative w-full max-w-[380px] mx-auto py-4 flex items-center justify-center select-none">
      {/* Background soft blurred organic indigo blobs */}
      <div
        className="absolute w-64 h-64 bg-indigo-200/40 rounded-full blur-3xl pointer-events-none -z-10"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-6 -right-6 w-52 h-52 bg-indigo-300/30 rounded-full blur-2xl pointer-events-none -z-10"
        aria-hidden="true"
      />

      {/* Decorative Indigo Dashes / Slashes */}
      {/* Top-left double slash */}
      <div
        className="absolute -top-3 left-2 flex items-center gap-1.5 pointer-events-none opacity-80"
        aria-hidden="true"
      >
        <span className="w-1 h-4 bg-indigo-300 rounded-full transform -rotate-[28deg]" />
        <span className="w-1 h-5 bg-indigo-400 rounded-full transform -rotate-[28deg]" />
      </div>

      {/* Bottom-left single slash */}
      <div
        className="absolute bottom-6 -left-3 pointer-events-none opacity-80"
        aria-hidden="true"
      >
        <span className="block w-1 h-5 bg-indigo-300 rounded-full transform -rotate-[32deg]" />
      </div>

      {/* Bottom-right single slash */}
      <div
        className="absolute -bottom-2 right-12 pointer-events-none opacity-80"
        aria-hidden="true"
      >
        <span className="block w-1 h-5 bg-indigo-400 rounded-full transform rotate-[35deg]" />
      </div>

      {/* Small floating sparkles/dots */}
      <span
        className="absolute top-1/4 -right-2 text-indigo-400 text-sm font-bold pointer-events-none"
        aria-hidden="true"
      >
        ✦
      </span>
      <span
        className="absolute bottom-1/3 -left-4 text-indigo-400 text-xs font-bold pointer-events-none"
        aria-hidden="true"
      >
        ✦
      </span>

      {/* Main Tilted White Token Card with Gentle Float */}
      <motion.div
        animate={
          shouldReduceMotion
            ? { y: 0 }
            : {
                y: [0, -7, 0],
              }
        }
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="relative z-10 w-[290px] sm:w-[310px] bg-white rounded-2xl p-5 sm:p-6 shadow-[0_20px_45px_-10px_rgba(79,70,229,0.14),0_3px_12px_rgba(15,23,42,0.04)] border border-slate-100 transform -rotate-[7.5deg]"
      >
        {/* Card Header: Official QDoc Logo */}
        <div className="flex items-center">
          <Image
            src="/logo-new-updated-original.png"
            alt="QDoc"
            width={96}
            height={28}
            className="h-6 w-auto object-contain"
          />
        </div>

        {/* Label: Print Token */}
        <p className="text-xs font-bold text-slate-700 tracking-tight mt-3.5">
          Print Token
        </p>

        {/* Pale Indigo Rounded Box with Big Bold Token */}
        <div className="bg-[#EEF2FF] border border-indigo-100/90 rounded-xl py-2.5 px-3 my-2.5 text-center">
          <span className="text-2xl sm:text-[26px] font-black font-mono tracking-wider text-[#1E1B4B]">
            RP1042
          </span>
        </div>

        {/* Three Metadata Rows with Icons */}
        <div className="space-y-1.5 mt-3 text-xs text-slate-600 font-medium">
          <div className="flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
            <span>3 pages • 2 copies</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
            <span>Main Print Room</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
            <span>3 ahead • ~4 min</span>
          </div>
        </div>
      </motion.div>

      {/* Floating Glassy Tile 1 (Bottom-Left: Printer Icon) */}
      <motion.div
        animate={
          shouldReduceMotion
            ? { y: 0 }
            : {
                y: [0, -9, 0],
              }
        }
        transition={{
          duration: 5.5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.3,
        }}
        className="absolute -bottom-3 -left-5 sm:-bottom-4 sm:-left-6 z-20 w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-white/95 backdrop-blur-md border border-indigo-100/90 shadow-[0_12px_24px_-4px_rgba(79,70,229,0.15)] flex items-center justify-center text-indigo-600 transform -rotate-12"
      >
        <Printer className="w-6 h-6" strokeWidth={1.9} />
      </motion.div>

      {/* Floating Glassy Tile 2 (Top-Right: Document Icon) */}
      <motion.div
        animate={
          shouldReduceMotion
            ? { y: 0 }
            : {
                y: [0, 8, 0],
              }
        }
        transition={{
          duration: 6.2,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.7,
        }}
        className="absolute -top-3 -right-2 sm:-top-4 sm:-right-3 z-20 w-12 h-12 sm:w-13 sm:h-13 rounded-2xl bg-white/95 backdrop-blur-md border border-indigo-100/90 shadow-[0_12px_24px_-4px_rgba(79,70,229,0.15)] flex items-center justify-center text-indigo-600 transform rotate-12"
      >
        <FileText className="w-5 h-5" strokeWidth={1.9} />
      </motion.div>

      {/* Floating Glassy Tile 3 (Right-Middle: Send Icon) */}
      <motion.div
        animate={
          shouldReduceMotion
            ? { y: 0 }
            : {
                y: [0, -7, 0],
              }
        }
        transition={{
          duration: 5.8,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1.1,
        }}
        className="absolute top-1/2 -right-4 sm:-right-6 z-20 w-12 h-12 sm:w-13 sm:h-13 rounded-2xl bg-white/95 backdrop-blur-md border border-indigo-100/90 shadow-[0_12px_24px_-4px_rgba(79,70,229,0.15)] flex items-center justify-center text-indigo-600 transform -rotate-6"
      >
        <Send className="w-5 h-5" strokeWidth={1.9} />
      </motion.div>
    </div>
  );
}
