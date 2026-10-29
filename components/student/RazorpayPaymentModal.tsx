"use client";

import React, { useState, useEffect, useCallback } from "react";

export interface JobDetails {
  fileName: string;
  pages: number;
  copies: number;
  locationName: string;
  colorMode: string;
  printType: string;
}

export interface UserSessionDetails {
  name?: string | null;
  email?: string | null;
  admissionNumber?: string | null;
}

export interface PaymentSuccessInfo {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
}

export interface RazorpayPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  orderId?: string;
  jobDetails: JobDetails;
  user?: UserSessionDetails;
  onSuccess: (paymentInfo: PaymentSuccessInfo) => Promise<void> | void;
  onFailure?: (errorMsg: string) => void;
  /** Optional draft creator if orderId was not pre-generated */
  createDraftOrder?: () => Promise<{ orderId: string; amountPaise: number }>;
}

declare global {
  interface Window {
    Razorpay?: any;
  }
}

export default function RazorpayPaymentModal({
  isOpen,
  onClose,
  amount,
  orderId: preloadedOrderId,
  jobDetails,
  user,
  onSuccess,
  onFailure,
  createDraftOrder,
}: RazorpayPaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<"upi" | "card" | "netbanking">("upi");
  const [upiId, setUpiId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [scriptStatus, setScriptStatus] = useState<"loading" | "ready" | "error">("loading");

  // Determine whether simulation is allowed: ONLY in non-production AND with explicit PAYMENT_TEST_MODE=1
  const isTestModeAllowed =
    process.env.NODE_ENV !== "production" &&
    process.env.NEXT_PUBLIC_PAYMENT_TEST_MODE === "1";

  // Explicit Razorpay checkout script loader with error handling
  const loadRazorpayScript = useCallback(() => {
    if (typeof window === "undefined") return;

    if (window.Razorpay) {
      setScriptStatus("ready");
      return;
    }

    setScriptStatus("loading");
    setErrorMessage("");

    const existingScript = document.querySelector('script[src*="checkout.razorpay.com"]');
    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setScriptStatus("ready");
    script.onerror = () => {
      setScriptStatus("error");
      setErrorMessage("Failed to load Razorpay payment gateway. Please check your internet or ad blocker and try again.");
    };
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadRazorpayScript();
    }
  }, [isOpen, loadRazorpayScript]);

  if (!isOpen) return null;

  // Real Razorpay Checkout trigger
  const handleLiveRazorpayPayment = async () => {
    const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!razorpayKey || !window.Razorpay) {
      // In production or when test mode is disabled: NO simulation fallback!
      setErrorMessage("Razorpay payment gateway is not loaded or configured. Please retry.");
      return;
    }

    setLoading(true);
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

      const options = {
        key: razorpayKey,
        amount: Math.round(amount * 100),
        currency: "INR",
        name: "Campus Print Hub",
        description: `Print Order: ${jobDetails.fileName}`,
        image: "/logo.png",
        order_id: finalOrderId,
        handler: async function (response: any) {
          setLoading(true);
          try {
            await onSuccess({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id || finalOrderId,
              razorpay_signature: response.razorpay_signature,
            });
          } catch (e: any) {
            setErrorMessage(e.message || "Payment verification failed.");
            onFailure?.(e.message || "Payment verification failed.");
          } finally {
            setLoading(false);
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
          ondismiss: function () {
            setLoading(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      const msg = err.message || "Could not launch Razorpay Gateway.";
      setErrorMessage(msg);
      onFailure?.(msg);
      setLoading(false);
    }
  };

  // Simulated Payment Success handler — only usable when isTestModeAllowed is TRUE
  const handleSimulatedPaymentSuccess = async () => {
    if (!isTestModeAllowed) {
      setErrorMessage("Simulated payments are strictly forbidden in production.");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    try {
      await new Promise((res) => setTimeout(res, 800));
      const mockPaymentId =
        "pay_rzp_mock_" + Math.random().toString(36).substring(2, 10).toUpperCase();
      await onSuccess({
        razorpay_payment_id: mockPaymentId,
        razorpay_order_id: preloadedOrderId || "order_mock_test",
        razorpay_signature: "mock_signature_test",
      });
    } catch (err: any) {
      setErrorMessage(err.message || "Payment completion failed.");
      onFailure?.(err.message || "Payment completion failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleSimulatedPaymentFailure = async () => {
    if (!isTestModeAllowed) return;
    setLoading(true);
    setErrorMessage("");
    await new Promise((res) => setTimeout(res, 500));
    setErrorMessage("Transaction declined by simulated test bank.");
    onFailure?.("Transaction declined by bank.");
    setLoading(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-950 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center font-black text-sm text-indigo-200">
              ₹
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm tracking-tight text-white">Razorpay Gateway</h3>
                <span className="bg-indigo-500/30 border border-indigo-400/30 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded text-indigo-200">
                  {isTestModeAllowed ? "Test Mode" : "Live Mode"}
                </span>
              </div>
              <p className="text-[10px] text-indigo-200/80 mt-0.5">256-Bit Encrypted Campus Spool Payment</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            aria-label="Close modal"
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Order Summary Strip */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Document</p>
            <p className="text-xs font-bold text-slate-800 truncate max-w-[200px] mt-0.5">
              {jobDetails.fileName}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {jobDetails.pages} pg • {jobDetails.copies} cop • {jobDetails.locationName}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Amount Due</p>
            <p className="text-2xl font-black text-indigo-600">₹{amount.toFixed(2)}</p>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {/* Payment Method Tabs */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Select Payment Instrument
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "upi", label: "UPI / GPay", icon: "⚡" },
                { id: "card", label: "Cards", icon: "💳" },
                { id: "netbanking", label: "NetBanking", icon: "🏛️" },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMethod(m.id as any)}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                    selectedMethod === m.id
                      ? "border-indigo-600 bg-indigo-50/60 text-indigo-600 shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <span className="text-base">{m.icon}</span>
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* UPI ID input view when UPI selected */}
          {selectedMethod === "upi" && (
            <div className="space-y-1.5 bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Virtual Payment Address (VPA)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="username@okaxis or GooglePay UPI"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-slate-800 font-mono"
                />
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl p-3 flex items-start gap-2 font-mono">
              <span className="text-sm">⚠️</span>
              <div className="flex-1">
                <span>{errorMessage}</span>
                {scriptStatus === "error" && (
                  <button
                    onClick={loadRazorpayScript}
                    className="block mt-2 text-indigo-600 underline font-sans text-xs font-semibold"
                  >
                    Retry loading gateway
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Security Notice */}
          <div className="flex items-center gap-2 bg-indigo-50/50 border border-indigo-100 rounded-xl p-2.5 text-[10px] text-indigo-700">
            <span className="text-sm">🛡️</span>
            <span>
              Your transaction is secured by Razorpay 256-bit encryption. Print job will be queued immediately upon success.
            </span>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            {/* Live Gateway Button */}
            <button
              onClick={handleLiveRazorpayPayment}
              disabled={loading || scriptStatus === "loading"}
              data-testid="pay-live-button"
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs py-3.5 rounded-xl shadow-md shadow-indigo-600/10 flex items-center justify-center gap-2 uppercase tracking-wider transition-all"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Connecting Razorpay...
                </>
              ) : scriptStatus === "loading" ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Loading Gateway...
                </>
              ) : (
                <>
                  <span>Pay ₹{amount.toFixed(2)} with Razorpay</span>
                </>
              )}
            </button>

            {/* In Production or when PAYMENT_TEST_MODE is not 1, NEVER render simulation buttons */}
            {isTestModeAllowed && (
              <div className="space-y-2 pt-1 border-t border-dashed border-amber-200" data-testid="simulate-section">
                <p className="text-[10px] text-amber-600 font-semibold text-center">
                  ⚠️ Test Mode Only: Gateway simulation available
                </p>
                <button
                  onClick={handleSimulatedPaymentSuccess}
                  disabled={loading}
                  data-testid="simulate-success-button"
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs py-2.5 rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all"
                >
                  ✓ Simulate Payment Success (Dev Only)
                </button>
                <button
                  onClick={handleSimulatedPaymentFailure}
                  disabled={loading}
                  data-testid="simulate-failure-button"
                  className="w-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 text-[11px] font-bold py-1.5 rounded-xl transition-all"
                >
                  ✕ Simulate Payment Failure
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
