"use client";

import React, { useState, useEffect } from "react";

interface JobDetails {
  fileName: string;
  pages: number;
  copies: number;
  locationName: string;
  colorMode: string;
  printType: string;
}

interface RazorpayPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  jobDetails: JobDetails;
  onSuccess: (paymentInfo: { razorpay_payment_id: string; razorpay_order_id?: string }) => Promise<void> | void;
  onFailure?: (errorMsg: string) => void;
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
  jobDetails,
  onSuccess,
  onFailure,
}: RazorpayPaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<"upi" | "card" | "netbanking">("upi");
  const [upiId, setUpiId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isRazorpayLoaded, setIsRazorpayLoaded] = useState(false);

  // Check or inject Razorpay SDK script if key exists
  useEffect(() => {
    const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (razorpayKey && typeof window !== "undefined") {
      if (window.Razorpay) {
        setIsRazorpayLoaded(true);
      } else {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        script.onload = () => setIsRazorpayLoaded(true);
        script.onerror = () => setIsRazorpayLoaded(false);
        document.body.appendChild(script);
      }
    }
  }, []);

  if (!isOpen) return null;

  // Real Razorpay Checkout trigger if SDK & key are available
  const handleLiveRazorpayPayment = async () => {
    const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!razorpayKey || !window.Razorpay) {
      handleSimulatedPaymentSuccess();
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      // 1. Call backend API to create Razorpay Order ID
      const orderRes = await fetch("/api/payment/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, notes: { fileName: jobDetails.fileName } }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.orderId) {
        throw new Error(orderData.error || "Failed to initiate Razorpay order.");
      }

      const options = {
        key: razorpayKey,
        amount: Math.round(amount * 100),
        currency: "INR",
        name: "QDoc Campus Print",
        description: `Print Order: ${jobDetails.fileName}`,
        image: "/logo.png",
        order_id: orderData.orderId,
        handler: async function (response: any) {
          setLoading(true);
          try {
            await onSuccess({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
            });
          } catch (e: any) {
            setErrorMessage(e.message || "Payment verification failed.");
            onFailure?.(e.message || "Payment verification failed.");
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          name: "Student",
          email: "student@campus.edu",
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
      setErrorMessage(err.message || "Could not launch Razorpay Gateway.");
      onFailure?.(err.message || "Gateway launch failed.");
      setLoading(false);
    }
  };

  // Simulated Payment Success handler for test mode
  const handleSimulatedPaymentSuccess = async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      // Simulate network latency for payment gateway verification
      await new Promise((res) => setTimeout(res, 1200));
      const mockPaymentId = "pay_rzp_mock_" + Math.random().toString(36).substring(2, 10).toUpperCase();
      await onSuccess({ razorpay_payment_id: mockPaymentId });
    } catch (err: any) {
      setErrorMessage(err.message || "Payment completion failed.");
      onFailure?.(err.message || "Payment completion failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleSimulatedPaymentFailure = async () => {
    setLoading(true);
    setErrorMessage("");
    await new Promise((res) => setTimeout(res, 800));
    setErrorMessage("Transaction declined by bank or user cancelled on Razorpay.");
    onFailure?.("Transaction declined by bank.");
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
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
                  {process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ? "Live Mode" : "Test Mode"}
                </span>
              </div>
              <p className="text-[10px] text-indigo-200/80 mt-0.5">256-Bit Encrypted Campus Spool Payment</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
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
              <span>{errorMessage}</span>
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
            {process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID && isRazorpayLoaded ? (
              <button
                onClick={handleLiveRazorpayPayment}
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs py-3.5 rounded-xl shadow-md shadow-indigo-600/10 flex items-center justify-center gap-2 uppercase tracking-wider transition-all"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Connecting Razorpay...
                  </>
                ) : (
                  <>
                    <span>Pay ₹{amount.toFixed(2)} with Razorpay</span>
                  </>
                )}
              </button>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={handleSimulatedPaymentSuccess}
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs py-3.5 rounded-xl shadow-md shadow-indigo-600/10 flex items-center justify-center gap-2 uppercase tracking-wider transition-all"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing Razorpay Payment...
                    </>
                  ) : (
                    <>
                      <span>✓ Pay ₹{amount.toFixed(2)} (Simulate Success)</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleSimulatedPaymentFailure}
                  disabled={loading}
                  className="w-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 text-[11px] font-bold py-2 rounded-xl transition-all"
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
