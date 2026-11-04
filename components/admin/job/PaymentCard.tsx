"use client";

import React, { useState } from "react";
import { Receipt, CheckCircle2, Clock, AlertCircle, Loader2 } from "lucide-react";
import { formatKolkataShort } from "@/lib/admin/job-date";

interface PaymentCardProps {
  jobId: string;
  amount: number;
  paymentStatus: string;
  paymentMethod?: string;
  paidAt?: any;
  createdAt?: any;
  isSuperAdmin?: boolean;
  onPaymentChanged?: () => void;
  className?: string;
}

export default function PaymentCard({
  jobId,
  amount,
  paymentStatus,
  paymentMethod,
  paidAt,
  createdAt,
  isSuperAdmin = false,
  onPaymentChanged,
  className = "",
}: PaymentCardProps) {
  const isPaid = paymentStatus?.toUpperCase() === "PAID";

  const [dialogAction, setDialogAction] = useState<"verify" | "unpay" | null>(null);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Compute "via <method> • <timestamp>" line
  const method = paymentMethod || "UPI";
  const timestampSource = paidAt || (isPaid ? createdAt : null);
  const formattedTime = timestampSource ? formatKolkataShort(timestampSource) : null;

  const paymentMetaLine = isPaid
    ? formattedTime
      ? `via ${method} • ${formattedTime}`
      : `via ${method}`
    : "Payment awaiting student completion";

  const handleOpenDialog = (action: "verify" | "unpay") => {
    setDialogAction(action);
    setReason("");
    setActionError(null);
  };

  const handleConfirmAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dialogAction) return;

    if (reason.trim().length < 5) {
      setActionError("Reason must be at least 5 characters.");
      return;
    }

    setIsSubmitting(true);
    setActionError(null);

    const endpoint = dialogAction === "verify" ? "payment" : "unpay";

    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || `Failed to update payment status (${res.status})`);
      }

      setDialogAction(null);
      if (onPaymentChanged) onPaymentChanged();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div
        className={`bg-white rounded-[16px] border border-slate-200/80 p-5 shadow-sm ${className}`}
      >
        {/* ── Header ────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Payment & Amount
            </h2>
          </div>

          {/* Small links for Verify payment / Mark unpaid */}
          <div>
            {!isPaid ? (
              <button
                type="button"
                onClick={() => handleOpenDialog("verify")}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline transition-colors"
              >
                Verify payment
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleOpenDialog("unpay")}
                className="text-xs font-semibold text-slate-500 hover:text-rose-600 hover:underline transition-colors"
              >
                Mark unpaid
              </button>
            )}
          </div>
        </div>

        {/* ── Amount & Status Pill Row ──────────────────────────── */}
        <div className="flex items-center gap-3 mb-1.5">
          <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-mono tracking-tight tabular-nums">
            {`₹${Number(amount || 0).toFixed(2)}`}
          </span>

          {isPaid ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Paid</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/60 shadow-xs">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>Pending</span>
            </span>
          )}
        </div>

        {/* ── Subtitle Line (via UPI • timestamp) ───────────────── */}
        <p className="text-xs text-slate-500 font-medium">
          {paymentMetaLine}
        </p>
      </div>

      {/* ── Action Dialog (Verify / Unpay) ─────────────────────── */}
      {dialogAction && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={dialogAction === "verify" ? "Verify Payment" : "Mark Unpaid"}
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900">
              {dialogAction === "verify"
                ? "Verify Payment Manually"
                : "Mark Payment as Unpaid"}
            </h3>
            <p className="text-xs text-slate-500 mt-1.5">
              {dialogAction === "verify"
                ? "This will manually mark the print job as PAID and notify the student. Please provide a mandatory reason for audit logging."
                : "This will revert the job's payment status back to PENDING. Please provide a mandatory reason for audit logging."}
            </p>

            <form onSubmit={handleConfirmAction} className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="payment-reason"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Reason (min 5 characters) *
                </label>
                <textarea
                  id="payment-reason"
                  rows={3}
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    setActionError(null);
                  }}
                  placeholder={
                    dialogAction === "verify"
                      ? "e.g., Verified via cash counter / direct UPI transfer receipt."
                      : "e.g., Student cancelled payment before print."
                  }
                  required
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                />
              </div>

              {actionError && (
                <div className="flex items-center gap-1.5 text-xs text-rose-600 font-medium">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDialogAction(null)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || reason.trim().length < 5}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    dialogAction === "verify"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>
                    {dialogAction === "verify" ? "Confirm Payment" : "Confirm Revert"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
