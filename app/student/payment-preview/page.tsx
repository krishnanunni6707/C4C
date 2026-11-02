"use client";

import React, { useState, useEffect } from "react";
import PaymentModal from "@/components/payment/PaymentModal";
import type { PaymentModalState } from "@/components/payment/types";

export default function PaymentPreviewPage() {
  const [modalOpen, setModalOpen] = useState(true);
  const [modalState, setModalState] = useState<PaymentModalState>("idle");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get("state") as PaymentModalState;
    if (s) setModalState(s);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-8">
      {/* State Switcher Bar for Visual Verification */}
      <div className="fixed top-3 left-3 z-[100] bg-white/95 backdrop-blur-md border border-slate-200 shadow-lg rounded-xl p-2 flex items-center gap-2 text-xs">
        <span className="font-bold text-slate-700 px-2">State:</span>
        {(["idle", "opening_checkout", "processing", "success", "failure", "unavailable"] as PaymentModalState[]).map(
          (s) => (
            <button
              key={s}
              onClick={() => {
                setModalState(s);
                setModalOpen(true);
              }}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                modalState === s
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              {s}
            </button>
          )
        )}
        <button
          onClick={() => setModalOpen(!modalOpen)}
          className="ml-2 px-2.5 py-1 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100"
        >
          {modalOpen ? "Hide Modal" : "Show Modal"}
        </button>
      </div>

      {/* Simulated Background: Step 4 Review & Pay */}
      <div className="max-w-4xl mx-auto pt-16 space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Review &amp; Pay
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Check your print preferences and proceed with Campus Spool payment.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div className="p-4 bg-slate-50 rounded-xl">
              <span className="text-xs text-slate-400 font-bold uppercase">Document</span>
              <p className="font-semibold text-slate-800 mt-1">Thesis.pdf</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl">
              <span className="text-xs text-slate-400 font-bold uppercase">Location</span>
              <p className="font-semibold text-slate-800 mt-1">Library Print Hub</p>
            </div>
          </div>
        </div>
      </div>

      {/* Redesigned Payment Modal */}
      <PaymentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        amount={68.0}
        orderId="order_preview_123"
        jobDetails={{
          fileName: "Thesis.pdf",
          pages: 24,
          copies: 2,
          locationName: "Library Print Hub",
          colorMode: "BW",
          printType: "SINGLE",
        }}
        pricingBreakdown={{
          pages: 24,
          copies: 2,
          rateLabel: "Rate (B/W)",
          ratePerSheet: 2.0,
          subtotal: 48.0,
          tokenCharge: 1.0,
          total: 68.0,
        }}
        user={{
          name: "John Doe",
          email: "john@campus.edu",
          admissionNumber: "ADM100",
        }}
        queueAheadCount={2}
        estimatedWaitMinutes={3}
        tokenNumber="RP1042"
        initialState={modalState}
        onSuccess={() => {}}
      />
    </div>
  );
}
