"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Plus, MessageSquare } from "lucide-react";

interface FaqItem {
  question: string;
  answer: string;
}

const faqs: FaqItem[] = [
  {
    question: "What file types are supported?",
    answer:
      "We support PDF, DOCX, DOC, PPTX, PNG, and JPG files up to 20 MB in size. For best printing results and formatting fidelity, PDF format is recommended.",
  },
  {
    question: "How do I get my token?",
    answer:
      "Your unique alphanumeric token (e.g. RP1042) is generated automatically immediately after your payment is confirmed. You can view the token slip on screen and track it from your dashboard.",
  },
  {
    question: "Can I cancel a print job?",
    answer:
      "You can cancel your print job at any time before physical printing begins at the hub. Once the printing process has started, please contact your campus print center administrator directly.",
  },
  {
    question: "What are the payment options?",
    answer:
      "We support all major payment modes securely via Razorpay, including UPI (Google Pay, PhonePe, Paytm), credit/debit cards, and net banking.",
  },
  {
    question: "Where can I collect my prints?",
    answer:
      "You can collect your finished documents directly from the specific campus print center you selected during the upload configuration step. Simply show your token number or QR code.",
  },
];

export default function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const shouldReduceMotion = useReducedMotion();

  const toggleAccordion = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <section className="py-20 scroll-mt-12">
      <div className="max-w-[1140px] mx-auto px-6">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight">
            Frequently asked questions
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-500 font-normal">
            Find answers to common questions about QDoc Campus Print.
          </p>
        </div>

        {/* Two Columns Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mt-14">
          {/* Left Column: 5 Accordion Rows */}
          <div className="lg:col-span-7 space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openIndex === idx;
              return (
                <motion.div
                  key={faq.question}
                  initial={
                    shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }
                  }
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.35,
                    delay: shouldReduceMotion ? 0 : idx * 0.05,
                    ease: "easeOut",
                  }}
                  className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => toggleAccordion(idx)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-answer-${idx}`}
                    id={`faq-btn-${idx}`}
                    className="w-full px-5 py-4 sm:px-6 sm:py-4.5 flex items-center justify-between text-left text-sm sm:text-base font-semibold text-[#0F172A] hover:text-indigo-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-2xl"
                  >
                    <span>{faq.question}</span>
                    <motion.span
                      animate={{ rotate: isOpen ? 45 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="ml-4 flex-shrink-0 text-slate-400"
                    >
                      <Plus className="w-4 h-4" strokeWidth={2.2} />
                    </motion.span>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        id={`faq-answer-${idx}`}
                        role="region"
                        aria-labelledby={`faq-btn-${idx}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{
                          duration: shouldReduceMotion ? 0 : 0.25,
                          ease: "easeInOut",
                        }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 sm:px-6 sm:pb-5 pt-1 text-xs sm:text-sm text-slate-500 leading-relaxed border-t border-slate-100">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>

          {/* Right Column: Tinted Indigo Card */}
          <motion.div
            initial={
              shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }
            }
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
            className="lg:col-span-5 bg-[#EEF2FF]/70 border border-indigo-100/90 rounded-2xl p-7 sm:p-8 flex flex-col items-start text-left shadow-sm"
          >
            <div className="w-10 h-10 rounded-xl bg-white border border-indigo-100 shadow-sm flex items-center justify-center text-indigo-600 mb-5">
              <MessageSquare className="w-5 h-5" strokeWidth={2.2} />
            </div>

            <h3 className="text-lg font-bold text-[#0F172A] tracking-tight">
              Still have questions?
            </h3>

            <p className="mt-2.5 text-sm text-slate-500 leading-relaxed font-normal">
              Our team is here to help you. Reach out to your college admin or
              visit the help desk on campus.
            </p>

            <motion.div
              whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
              className="mt-6"
            >
              <a
                href="mailto:support@qdoc.campus.edu"
                className="inline-flex items-center justify-center bg-white hover:bg-indigo-50/70 border border-indigo-200 text-indigo-600 font-semibold text-sm px-5 py-2.5 rounded-xl transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              >
                Contact support
              </a>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
