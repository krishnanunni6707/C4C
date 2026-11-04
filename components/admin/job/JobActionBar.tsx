"use client";

import React, { useState } from "react";
import {
  Printer,
  CheckCircle2,
  X,
  Loader2,
  ChevronUp,
  AlertCircle,
  Wifi,
  WifiOff,
  RefreshCw,
} from "lucide-react";
import type { ConnectionStatus, DuplexMode } from "@/lib/hooks/usePrinter";
import CancelDialog from "./CancelDialog";

interface JobActionBarProps {
  jobId: string;
  tokenNumber: string;
  status: string;
  paymentStatus: string;
  copies: number;
  printType: string;
  // Printer Daemon Props
  connectionStatus: ConnectionStatus;
  printers: string[];
  targetPrinter: string;
  setTargetPrinter: (printer: string) => void;
  reconnectDaemon: () => void;
  getBase64File: () => Promise<string>;
  printFile: (options: any) => Promise<any>;
  // Callbacks
  onActionSuccess: (action: string) => void;
  className?: string;
  isPrinterPopoverOpen?: boolean;
  setIsPrinterPopoverOpen?: (open: boolean) => void;
}

export default function JobActionBar({
  jobId,
  tokenNumber,
  status,
  paymentStatus,
  copies,
  printType,
  connectionStatus,
  printers,
  targetPrinter,
  setTargetPrinter,
  reconnectDaemon,
  getBase64File,
  printFile,
  onActionSuccess,
  className = "",
  isPrinterPopoverOpen,
  setIsPrinterPopoverOpen,
}: JobActionBarProps) {
  const [internalPopoverOpen, setInternalPopoverOpen] = useState(false);
  const popoverOpen = isPrinterPopoverOpen ?? internalPopoverOpen;
  const setPopoverOpen = setIsPrinterPopoverOpen ?? setInternalPopoverOpen;

  const [isPrintingSending, setIsPrintingSending] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage((cur) => (cur?.text === text ? null : cur));
    }, 4000);
  };

  const isPaid = paymentStatus?.toUpperCase() === "PAID";
  const s = status?.toUpperCase() || "WAITING";
  const isTerminal = s === "COLLECTED" || s === "CANCELLED";
  const isDaemonConnected = connectionStatus === "connected";

  // Transition validations
  const canPrint = !isTerminal && s === "WAITING" && isPaid;
  const canMarkReady = !isTerminal && s === "PRINTING";
  const canMarkCollected = !isTerminal && s === "READY";
  const canCancel = !isTerminal && (s === "WAITING" || s === "PRINTING" || s === "READY");

  // Disabled reasons for tooltips
  const getPrintDisabledReason = () => {
    if (isTerminal) return `Job is already ${s.toLowerCase()}`;
    if (!isPaid) return "Payment pending — verify payment first";
    if (s !== "WAITING") return `Job is currently ${s.toLowerCase()}`;
    if (!isDaemonConnected) return "Printer daemon offline";
    if (!targetPrinter) return "No printer selected";
    return "";
  };

  const getReadyDisabledReason = () => {
    if (isTerminal) return `Job is already ${s.toLowerCase()}`;
    if (s === "WAITING") return "Start printing first";
    if (s === "READY") return "Job is already ready";
    return "";
  };

  const getCollectedDisabledReason = () => {
    if (isTerminal) return `Job is already ${s.toLowerCase()}`;
    if (s !== "READY") return "Job must be marked ready first";
    return "";
  };

  const getCancelDisabledReason = () => {
    if (isTerminal) return `Job is already ${s.toLowerCase()}`;
    return "";
  };

  // ── Action Handlers ──────────────────────────────────────────────

  // 1. Print action
  const handlePrint = async () => {
    if (!canPrint || !isDaemonConnected || !targetPrinter) {
      if (!isDaemonConnected) {
        showToast("error", "Print daemon is offline. Start QDocClient first.");
        setPopoverOpen(true);
      } else if (!targetPrinter) {
        showToast("error", "Please select a target printer.");
        setPopoverOpen(true);
      }
      return;
    }

    setIsPrintingSending(true);

    try {
      // Step A: Fetch base64 file
      const base64Data = await getBase64File();
      if (!base64Data) {
        throw new Error("Could not read file data for printing.");
      }

      const duplex: DuplexMode =
        printType?.toUpperCase() === "DOUBLE" ||
        printType?.toLowerCase().includes("double")
          ? "duplex"
          : "single";

      // Step B: Send to physical daemon
      const result = await printFile({
        base64Data,
        targetPrinter,
        copies: copies || 1,
        duplex,
        jobId,
      });

      if (!result?.success) {
        throw new Error(result?.message || "Print spooler rejected job.");
      }

      // Step C: Call existing /start route
      const startRes = await fetch(`/api/admin/jobs/${jobId}/start`, {
        method: "POST",
      });

      if (!startRes.ok) {
        const body = await startRes.json().catch(() => ({}));
        throw new Error(body.error || "Failed to update job status to PRINTING");
      }

      showToast("success", `Job sent to printer ${targetPrinter} successfully!`);
      onActionSuccess("start");
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Print execution failed";
      showToast("error", errMsg);

      // Report fail back to server if needed
      await fetch(`/api/admin/jobs/${jobId}/fail`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: errMsg }),
      }).catch(() => {});
    } finally {
      setIsPrintingSending(false);
    }
  };

  // 2. Mark Ready
  const handleMarkReady = async () => {
    if (!canMarkReady) return;
    setActionLoading("ready");

    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/ready`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Failed to mark job as ready");
      }

      showToast("success", "Job marked ready for collection!");
      onActionSuccess("ready");
    } catch (err: unknown) {
      showToast("error", err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  // 3. Mark Collected
  const handleMarkCollected = async () => {
    if (!canMarkCollected) return;
    setActionLoading("collect");

    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/collect`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Failed to mark job as collected");
      }

      showToast("success", "Job marked collected by student!");
      onActionSuccess("collect");
    } catch (err: unknown) {
      showToast("error", err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <>
      <div
        className={`bg-white border border-slate-200/80 p-3 sm:p-3.5 shadow-sm rounded-2xl ${className}`}
      >
        {/* Terminal state banner */}
        {isTerminal && (
          <div className="mb-2.5 py-1.5 px-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-medium text-slate-500 text-center">
            This job is <span className="font-bold uppercase">{s}</span>. No further actions available.
          </div>
        )}

        {/* Action feedback toast */}
        {toastMessage && (
          <div
            role="status"
            className={`mb-2.5 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 shadow-xs animate-in slide-in-from-bottom-2 duration-150 ${
              toastMessage.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-rose-50 text-rose-800 border border-rose-200"
            }`}
          >
            <div className="flex items-center gap-2">
              {toastMessage.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              )}
              <span>{toastMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ── Four Equal Action Buttons ─────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* 1. Print Button */}
          <div className="relative">
            <button
              type="button"
              id="action-btn-print"
              onClick={handlePrint}
              disabled={!canPrint || isPrintingSending}
              title={getPrintDisabledReason()}
              aria-disabled={!canPrint || isPrintingSending}
              className={`w-full h-11 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs ${
                canPrint && !isPrintingSending
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20 active:scale-[0.99]"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200/60"
              }`}
            >
              {isPrintingSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Sending…</span>
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4" />
                  <span>Print</span>
                </>
              )}
            </button>

            {/* Caret to open printer popover */}
            <button
              type="button"
              onClick={() => setPopoverOpen(!popoverOpen)}
              title="Select printer & check daemon status"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
            >
              <ChevronUp
                className={`w-3.5 h-3.5 transition-transform ${
                  popoverOpen ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>

          {/* 2. Mark Ready Button */}
          <button
            type="button"
            id="action-btn-ready"
            onClick={handleMarkReady}
            disabled={!canMarkReady || actionLoading === "ready"}
            title={getReadyDisabledReason()}
            aria-disabled={!canMarkReady || actionLoading === "ready"}
            className={`w-full h-11 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs ${
              canMarkReady && actionLoading !== "ready"
                ? "bg-white border-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50/80 hover:border-indigo-300 active:scale-[0.99]"
                : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200/60"
            }`}
          >
            {actionLoading === "ready" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>Mark Ready</span>
          </button>

          {/* 3. Mark Collected Button */}
          <button
            type="button"
            id="action-btn-collect"
            onClick={handleMarkCollected}
            disabled={!canMarkCollected || actionLoading === "collect"}
            title={getCollectedDisabledReason()}
            aria-disabled={!canMarkCollected || actionLoading === "collect"}
            className={`w-full h-11 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs ${
              canMarkCollected && actionLoading !== "collect"
                ? "bg-white border-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50/80 hover:border-indigo-300 active:scale-[0.99]"
                : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200/60"
            }`}
          >
            {actionLoading === "collect" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>Mark Collected</span>
          </button>

          {/* 4. Cancel Button */}
          <button
            type="button"
            id="action-btn-cancel"
            onClick={() => setIsCancelDialogOpen(true)}
            disabled={!canCancel}
            title={getCancelDisabledReason()}
            aria-disabled={!canCancel}
            className={`w-full h-11 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs ${
              canCancel
                ? "bg-white border-2 border-rose-200 text-rose-600 hover:bg-rose-50/80 hover:border-rose-300 active:scale-[0.99]"
                : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200/60"
            }`}
          >
            <X className="w-4 h-4" />
            <span>Cancel</span>
          </button>
        </div>
      </div>

      {/* ── Compact Printer Picker Popover ──────────────────────── */}
      {popoverOpen && (
        <div
          role="region"
          aria-label="Printer selection popover"
          className="fixed bottom-20 left-4 sm:left-auto right-4 z-40 bg-white rounded-2xl p-4 shadow-2xl border border-slate-200 w-80 animate-in slide-in-from-bottom-2 duration-150"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-2">
              <Printer className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-bold text-slate-900">
                Print Service
              </span>
            </div>
            <button
              type="button"
              onClick={() => setPopoverOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Daemon connection pill */}
          <div className="flex items-center justify-between bg-slate-50 rounded-xl p-2.5 mb-3 border border-slate-100">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  isDaemonConnected
                    ? "bg-emerald-500 shadow-xs animate-pulse"
                    : "bg-rose-500"
                }`}
              />
              <span className="text-xs font-semibold text-slate-700">
                {isDaemonConnected ? "Daemon Online" : "Daemon Offline"}
              </span>
            </div>
            {!isDaemonConnected && (
              <button
                type="button"
                onClick={reconnectDaemon}
                title="Reconnect"
                className="p-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg flex items-center gap-1 font-semibold"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry</span>
              </button>
            )}
          </div>

          {/* Printer list dropdown */}
          <div className="space-y-1.5">
            <label
              htmlFor="target-printer-select"
              className="text-[11px] font-bold text-slate-500 uppercase tracking-wider"
            >
              Select Target Printer
            </label>
            {printers.length > 0 ? (
              <select
                id="target-printer-select"
                value={targetPrinter}
                onChange={(e) => setTargetPrinter(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {printers.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-xs text-slate-400 italic py-1">
                {isDaemonConnected
                  ? "No printers reported by daemon"
                  : "Start QDocClient on localhost:8765"}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Cancel Dialog ───────────────────────────────────────── */}
      <CancelDialog
        jobId={jobId}
        tokenNumber={tokenNumber}
        isOpen={isCancelDialogOpen}
        onClose={() => setIsCancelDialogOpen(false)}
        onSuccess={() => {
          showToast("success", "Job cancelled successfully.");
          onActionSuccess("cancel");
        }}
      />
    </>
  );
}
