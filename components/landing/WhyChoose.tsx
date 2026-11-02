"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Zap, ShieldCheck, Building2 } from "lucide-react";

const features = [
  {
    title: "Fast & Convenient",
    description:
      "Skip the queues and save time with our online printing system.",
    icon: Zap,
  },
  {
    title: "Secure Payments",
    description:
      "Multiple payment options with Razorpay. Safe and reliable.",
    icon: ShieldCheck,
  },
  {
    title: "Multiple Print Centers",
    description:
      "Print from the nearest center across your campus.",
    icon: Building2,
  },
];

export default function WhyChoose() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section id="features" className="py-20 scroll-mt-12">
      <div className="max-w-[1140px] mx-auto px-6">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight">
            Why choose QDoc?
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-500 font-normal">
            Built for students. Designed for campus life.
          </p>
        </div>

        {/* 3 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-14">
          {features.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
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
                className="bg-white border border-slate-200/90 rounded-2xl p-7 shadow-sm hover:shadow-md transition-shadow duration-200 text-left flex flex-col justify-between"
              >
                <div>
                  {/* Icon in Indigo-50 Circle */}
                  <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 mb-6">
                    <Icon className="w-5 h-5" strokeWidth={2.2} />
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-bold text-[#0F172A] tracking-tight">
                    {item.title}
                  </h3>

                  {/* Description */}
                  <p className="text-sm text-slate-500 leading-relaxed mt-2.5 font-normal">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
