"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import TeamCard from "@/components/team/TeamCard";
import { teamMembers } from "@/lib/team";

export default function CreatorPage() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 antialiased selection:bg-indigo-500 selection:text-white flex flex-col">
      {/* 1. Global Navbar with Team link active */}
      <Navbar activePage="team" />

      <main className="flex-1 relative overflow-hidden">
        {/* Soft Indigo Top Gradient Wash */}
        <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-indigo-50/70 via-indigo-50/20 to-transparent pointer-events-none -z-10" />

        <div className="max-w-[1200px] mx-auto px-6 pt-8 pb-20">
          {/* 2. Back Link Pill */}
          <div className="flex items-center">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-indigo-50 hover:bg-indigo-100/80 text-indigo-600 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              aria-label="Back to home page"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to home</span>
            </Link>
          </div>

          {/* 3. Centered Header with Decorative Indigo Strokes */}
          <motion.div
            initial={
              shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }
            }
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="text-center mt-6 sm:mt-10 max-w-3xl mx-auto flex flex-col items-center"
          >
            {/* Title with flanking decorative strokes */}
            <div className="flex items-center justify-center gap-4 sm:gap-6 w-full">
              {/* Left Decorative Strokes (CSS/SVG) */}
              <svg
                className="hidden sm:block w-10 h-10 text-indigo-300 opacity-60 flex-shrink-0"
                viewBox="0 0 40 40"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <line x1="28" y1="8" x2="14" y2="22" />
                <line x1="34" y1="20" x2="20" y2="34" />
              </svg>

              <h1 className="text-4xl sm:text-5xl lg:text-[64px] font-extrabold text-[#0F172A] tracking-tight leading-[1.1] text-center">
                Meet the Team
              </h1>

              {/* Right Decorative Strokes (CSS/SVG) */}
              <svg
                className="hidden sm:block w-10 h-10 text-indigo-300 opacity-60 flex-shrink-0"
                viewBox="0 0 40 40"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <line x1="12" y1="8" x2="26" y2="22" />
                <line x1="6" y1="20" x2="20" y2="34" />
              </svg>
            </div>

            {/* Subtitle */}
            <p className="mt-4 text-base sm:text-lg lg:text-[19px] text-slate-500 leading-relaxed max-w-[560px] mx-auto font-normal">
              We’re a small team with a big vision — to make campus life simpler,
              faster and more connected.
            </p>
          </motion.div>

          {/* 4. Team Grid (4 cols >=1024, 2 cols >=640, 1 col below) */}
          <section
            aria-label="Team Members"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-14 sm:mt-16 items-stretch"
          >
            {teamMembers.map((member, index) => (
              <TeamCard key={member.name} member={member} index={index} />
            ))}
          </section>
        </div>
      </main>

      {/* 5. Footer */}
      <Footer />
    </div>
  );
}