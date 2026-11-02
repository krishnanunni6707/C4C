"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CloudUpload, SquarePen, Settings, QrCode, ArrowRight } from "lucide-react";

const steps = [
  {
    step: "1",
    title: "Upload Documents",
    description:
      "Select and upload your files ( PDF, DOCX, etc. ) from your device.",
    icon: CloudUpload,
  },
  {
    step: "2",
    title: "Edit & Reorder",
    description:
      "Arrange pages, remove unwanted pages and set your preferences.",
    icon: SquarePen,
  },
  {
    step: "3",
    title: "Configure & Submit",
    description:
      "Choose location, print settings, set copies and submit your job for printing.",
    icon: Settings,
  },
  {
    step: "4",
    title: "Track & Collect",
    description:
      "Get your token, track progress in real-time and collect your prints from the campus center.",
    icon: QrCode,
  },
];

export default function HowItWorks() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section id="how-it-works" className="py-20 scroll-mt-12">
      <div className="max-w-[1140px] mx-auto px-6">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight">
            How it works
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-500 font-normal">
            Get your documents printed in 4 simple steps.
          </p>
        </div>

        {/* 4 Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mt-14 relative items-stretch">
          {steps.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={item.step} className="relative flex flex-col">
                <motion.div
                  initial={
                    shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }
                  }
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.4,
                    delay: shouldReduceMotion ? 0 : idx * 0.06,
                    ease: "easeOut",
                  }}
                  className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200 flex-1 flex flex-col justify-between"
                >
                  <div>
                    {/* Top Row: Number circle & Icon rounded-square */}
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-sm">
                        {item.step}
                      </div>
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <Icon className="w-4 h-4" strokeWidth={2.2} />
                      </div>
                    </div>

                    {/* Card Title */}
                    <h3 className="text-base font-bold text-[#0F172A] mt-5 tracking-tight">
                      {item.title}
                    </h3>

                    {/* Card Description */}
                    <p className="text-xs sm:text-[13px] text-slate-500 leading-relaxed mt-2.5 font-normal">
                      {item.description}
                    </p>
                  </div>
                </motion.div>

                {/* Arrow between cards (hidden on mobile / tablet, visible on desktop) */}
                {idx < steps.length - 1 && (
                  <div
                    className="hidden lg:flex absolute -right-3.5 top-1/2 -translate-y-1/2 z-10 text-slate-400 pointer-events-none"
                    aria-hidden="true"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
