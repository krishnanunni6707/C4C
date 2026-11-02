"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Script from "next/script";
import { FileText, Lock, ArrowRight, X } from "lucide-react";
import OrderBreakdown from "./OrderBreakdown";
import PaymentMethodsRow from "./PaymentMethodsRow";
import PaymentStatusView from "./PaymentStatusView";
import type {
  PaymentModalProps,
  PaymentModalState,
  PricingBreakdown,
  RazorpayOptions,
  RazorpayResponse,
} from "./types";

export default function PaymentModal({
  isOpen,
  onClose,
  amount,
  orderId: preloadedOrderId,
  jobDetails,
  user,
  onSuccess,
  onFailure,
  createDraftOrder,
  pricingBreakdown: customBreakdown,
  queueAheadCount = 2,
  estimatedWaitMinutes = 3,
  tokenNumber: initialTokenNumber,
  initialState = "idle",
}: PaymentModalProps) {
  const [modalState, setModalState] = useState<PaymentModalState>(initialState);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [scriptReady, setScriptReady] = useState(false);
  const [scriptError, setScriptError] = useState(false);
  const [tokenNumber, setTokenNumber] = useState<string | undefined>(initialTokenNumber);
  const [jobId, setJobId] = useState<string | undefined>();
  const [confirmCloseProcessing, setConfirmCloseProcessing] = useState(false);

  const payButtonRef = useRef<HTMLButtonElement | null>(null);
  const isSubmittingRef = useRef(false);

  // Derive pricing breakdown if not explicitly provided
  const breakdown: PricingBreakdown = useMemo(() => {
    if (customBreakdown) return customBreakdown;

    const pages = jobDetails.pages || 1;
    const copies = jobDetails.copies || 1;
    const isDuplex =
      jobDetails.printType === "DOUBLE" ||
      jobDetails.printType === "double-sided";
    const isColor = jobDetails.colorMode === "COLOR";

    const rateLabel = `Rate (${isColor ? "Color" : "B/W"}${
      isDuplex ? " · Double sided" : isColor ? " · Single sided" : ""
    })`;

    const tokenCharge = 1.0;
    const subtotal = Math.max(0, amount - tokenCharge);
    const sheets = isDuplex ? Math.ceil(pages / 2) : pages;
    const totalSheetsForJob = Math.max(1, sheets * copies);
    const ratePerSheet = Number((subtotal / totalSheetsForJob).toFixed(2));

    return {
      pages,
      copies,
      rateLabel,
      ratePerSheet,
      subtotal,
      tokenCharge,
      total: amount,
    };
  }, [customBreakdown, jobDetails, amount]);

  // Reset internal state when opened
  useEffect(() => {
    if (isOpen) {
      setModalState(initialState);
      setErrorMessage("");
      setConfirmCloseProcessing(false);
      isSubmittingRef.current = false;
    }
  }, [isOpen, initialState]);

  // Focus pay button on mount
  useEffect(() => {
    if (isOpen && modalState === "idle") {
      const timer = setTimeout(() => {
        payButtonRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, modalState]);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Handle Safe Close
  const handleSafeClose = useCallback(() => {
    if (modalState === "processing") {
      setConfirmCloseProcessing(true);
      return;
    }
    onClose();
  }, [modalState, onClose]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleSafeClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, handleSafeClose]);

  // Real Razorpay Payment Trigger
  const handlePay = async () => {
    // Prevent double submissions
    if (isSubmittingRef.current || modalState === "processing" || modalState === "opening_checkout") {
      return;
    }

    const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!key || scriptError || (!scriptReady && !window.Razorpay)) {
      setModalState("unavailable");
      return;
    }

    isSubmittingRef.current = true;
    setModalState("opening_checkout");
    setErrorMessage("");

    try {
      let finalOrderId = preloadedOrderId;

      if (!finalOrderId && createDraftOrder) {
        const draft = await createDraftOrder();
        finalOrderId = draft.orderId;
      }

      if (!finalOrderId) {
        throw new Error("No active order draft found. Please try again.");
      }

      const prefillEmail =
        user?.email ||
        (user?.admissionNumber ? `${user.admissionNumber}@campus.edu` : "student@campus.edu");
      const prefillName = user?.name || "Student";

      const options: RazorpayOptions = {
        key,
        amount: Math.round(amount * 100),
        currency: "INR",
        name: "Campus Print Hub",
        description: `Print Order: ${jobDetails.fileName}`,
        image: "/logo.png",
        order_id: finalOrderId,
        handler: async (response: RazorpayResponse) => {
          setModalState("processing");
          try {
            const result = await onSuccess({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id || finalOrderId,
              razorpay_signature: response.razorpay_signature,
            });

            if (result && typeof result === "object") {
              if (result.tokenNumber) setTokenNumber(result.tokenNumber);
              if (result.jobId) setJobId(result.jobId);
            }

            setModalState("success");
          } catch (err: unknown) {
            const msg =
              err instanceof Error ? err.message : "Payment verification failed.";
            setErrorMessage(msg);
            setModalState("failure");
            onFailure?.(msg);
          } finally {
            isSubmittingRef.current = false;
          }
        },
        prefill: {
          name: prefillName,
          email: prefillEmail,
        },
        theme: {
          color: "#4F46E5",
        },
        modal: {
          ondismiss: () => {
            isSubmittingRef.current = false;
            setModalState((prev) => (prev === "opening_checkout" ? "idle" : prev));
          },
        },
      };

      if (!window.Razorpay) {
        throw new Error("Razorpay SDK is not ready yet.");
      }

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: unknown) {
      isSubmittingRef.current = false;
      const msg =
        err instanceof Error ? err.message : "Could not launch payment gateway.";
      setErrorMessage(msg);
      setModalState("failure");
      onFailure?.(msg);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Load Razorpay script with next/script lazyOnload only once */}
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
        onLoad={() => setScriptReady(true)}
        onError={() => setScriptError(true)}
      />

      {/* Backdrop: slate/indigo-900 at ~40% with backdrop-blur-md */}
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-md p-0 sm:p-6 animate-in fade-in duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-modal-title"
      >
        {/* Modal Card / Responsive Bottom Sheet on mobile */}
        <div
          className="w-full sm:max-w-[520px] bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 sm:p-7 border border-slate-100/80 relative max-h-[92vh] overflow-y-auto animate-in sm:zoom-in-95 slide-in-from-bottom sm:slide-in-from-bottom-0 duration-180"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Mobile Drag Handle */}
          <div className="sm:hidden w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-3" aria-hidden="true" />

          {/* Confirm Close While Processing Warning */}
          {confirmCloseProcessing ? (
            <div className="py-6 px-2 text-center space-y-4">
              <h4 className="text-base font-bold text-[#0F172A]">
                Payment in progress
              </h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Closing this dialog may interrupt transaction confirmation. Are you sure you want to close anyway?
              </p>
              <div className="flex items-center gap-3 justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmCloseProcessing(false)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-500 transition-colors"
                >
                  Keep Waiting
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmCloseProcessing(false);
                    onClose();
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 transition-colors"
                >
                  Close Anyway
                </button>
              </div>
            </div>
          ) : modalState !== "idle" && modalState !== "opening_checkout" ? (
            /* Swappable Dedicated Status Views (Processing, Success, Failure, Unavailable) */
            <PaymentStatusView
              state={modalState}
              errorMessage={errorMessage}
              tokenNumber={tokenNumber}
              jobId={jobId}
              queueAheadCount={queueAheadCount}
              estimatedWaitMinutes={estimatedWaitMinutes}
              onRetry={() => {
                setModalState("idle");
                setErrorMessage("");
              }}
              onClose={onClose}
            />
          ) : (
            /* Idle & Opening Checkout Main Modal View */
            <div className="space-y-6">
              {/* 1. Header Row */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  {/* 48px indigo-50 circle with document icon */}
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100/50 flex items-center justify-center text-indigo-600 flex-shrink-0">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h2
                      id="payment-modal-title"
                      className="text-2xl font-bold text-[#0F172A] tracking-tight leading-snug"
                    >
                      Complete payment
                    </h2>
                    <p className="text-sm text-slate-500 mt-0.5">
                      Review your order details and proceed to pay securely.
                    </p>
                  </div>
                </div>

                {/* Close Button (40px hit area) */}
                <button
                  type="button"
                  onClick={handleSafeClose}
                  aria-label="Close"
                  className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors -mr-2 -mt-1 flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <X className="w-5 h-5 stroke-[2.5]" />
                </button>
              </div>

              {/* 2. Thin Divider */}
              <div className="h-px bg-slate-100" />

              {/* 3 & 4. Order Line Items Breakdown & Total Box */}
              <OrderBreakdown breakdown={breakdown} />

              {/* 5. Primary Action Button (52px height) */}
              <div className="space-y-3 pt-1">
                <button
                  ref={payButtonRef}
                  type="button"
                  onClick={handlePay}
                  disabled={modalState === "opening_checkout"}
                  className="w-full h-[52px] rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 active:from-indigo-700 active:to-indigo-800 disabled:opacity-50 text-white font-bold text-base shadow-sm shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 select-none"
                >
                  {modalState === "opening_checkout" ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Opening secure checkout…</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 stroke-[2.5]" />
                      <span>Pay securely</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* 6. Under button caption */}
                <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 font-medium">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Secured by Razorpay</span>
                </div>
              </div>

              {/* 7. Divider & Payment Methods Row */}
              <div className="h-px bg-slate-100" />
              <PaymentMethodsRow />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
