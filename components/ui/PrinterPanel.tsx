"use client";

import React, {
  forwardRef,
  useImperativeHandle,
  useCallback,
} from "react";
import { usePrinter, DuplexMode, PrinterNotification } from "@/lib/hooks/usePrinter";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PrinterPanelProps {
 
  getBase64Pdf?: () => string | Promise<string>;
  /** Optional CSS classes for the outer wrapper */
  className?: string;
}

export interface PrinterPanelHandle {
  /** Imperatively trigger a print job */
  print: (base64Data: string) => void;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface StatusBadgeProps {
  status: "connecting" | "connected" | "disconnected" | "error";
}

function StatusBadge({ status }: StatusBadgeProps) {
  const config: Record<
    StatusBadgeProps["status"],
    { dot: string; pill: string; label: string }
  > = {
    connected: {
      dot: "bg-emerald-400 shadow-emerald-400/60",
      pill: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
      label: "Online",
    },
    connecting: {
      dot: "bg-amber-400 shadow-amber-400/60 animate-pulse",
      pill: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
      label: "Connecting…",
    },
    disconnected: {
      dot: "bg-rose-500 shadow-rose-500/60",
      pill: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
      label: "Offline",
    },
    error: {
      dot: "bg-rose-500 shadow-rose-500/60 animate-pulse",
      pill: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
      label: "Error",
    },
  };

  const { dot, pill, label } = config[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${pill}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full shadow-[0_0_6px_2px] ${dot}`} />
      {label}
    </span>
  );
}

interface NotificationBannerProps {
  notification: PrinterNotification;
  onDismiss: (id: string) => void;
}

function NotificationBanner({ notification, onDismiss }: NotificationBannerProps) {
  const isSuccess = notification.type === "success";

  return (
    <div
      role="alert"
      className={`
        flex items-start gap-3 rounded-xl px-4 py-3 text-sm
        ring-1 ring-inset backdrop-blur-sm
        animate-in slide-in-from-top-2 duration-300
        ${
          isSuccess
            ? "bg-emerald-500/10 text-emerald-200 ring-emerald-500/25"
            : "bg-rose-500/10 text-rose-200 ring-rose-500/25"
        }
      `}
    >
      {/* Icon */}
      <span className="mt-0.5 shrink-0 text-base">
        {isSuccess ? "✓" : "✕"}
      </span>

      {/* Message */}
      <p className="flex-1 leading-snug">{notification.message}</p>

      {/* Dismiss */}
      <button
        onClick={() => onDismiss(notification.id)}
        aria-label="Dismiss notification"
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
      >
        ×
      </button>
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

const DUPLEX_OPTIONS: { value: DuplexMode; label: string; description: string }[] = [
  { value: "single", label: "Single-sided", description: "Print on one side only" },
  { value: "duplex", label: "Double-sided (Long edge)", description: "Flip on long edge" },
  { value: "duplexshort", label: "Double-sided (Short edge)", description: "Flip on short edge" },
];

export const PrinterPanel = forwardRef<PrinterPanelHandle, PrinterPanelProps>(
  function PrinterPanel({ getBase64Pdf, className = "" }, ref) {
    const {
      connectionStatus,
      printers,
      targetPrinter,
      setTargetPrinter,
      copies,
      setCopies,
      duplex,
      setDuplex,
      isPrinting,
      notifications,
      dismissNotification,
      handlePrint,
      reconnect,
    } = usePrinter();

    // ── Imperative handle ──────────────────────────────────────────────────
    useImperativeHandle(ref, () => ({
      print: (base64Data: string) => handlePrint(base64Data),
    }));

    // ── Internal print trigger ─────────────────────────────────────────────
    const onClickPrint = useCallback(async () => {
      if (!getBase64Pdf) return;
      const data = await getBase64Pdf();
      handlePrint(data);
    }, [getBase64Pdf, handlePrint]);

    const isOffline = connectionStatus === "disconnected" || connectionStatus === "error";
    const isConnected = connectionStatus === "connected";

    return (
      <div
        className={`
          relative flex flex-col gap-5 rounded-xl
          bg-white border border-gray-200
          shadow-sm p-6
          w-full max-w-md
          ${className}
        `}
      >
        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* Printer icon */}
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/15 ring-1 ring-indigo-500/30">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4.5 w-4.5 text-indigo-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                style={{ height: "1.125rem", width: "1.125rem" }}
              >
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
                <line x1="9" y1="7" x2="15" y2="7" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white leading-none">
                Print Service
              </h2>
              <p className="mt-0.5 text-[11px] text-gray-400 leading-none">
                Local daemon — ws://127.0.0.1:8765
              </p>
            </div>
          </div>

          {/* Status badge + reconnect */}
          <div className="flex items-center gap-2">
            <StatusBadge status={connectionStatus} />
            {isOffline && (
              <button
                onClick={reconnect}
                title="Reconnect"
                className="
                  flex h-6 w-6 items-center justify-center rounded-lg
                  bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700
                  transition-all duration-150
                "
              >
                {/* Refresh icon */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  style={{ height: "0.75rem", width: "0.75rem" }}
                >
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* ── Divider ──────────────────────────────────────────────────────── */}
        <div className="h-px bg-gray-100" />

        {/* ── Notifications ─────────────────────────────────────────────────── */}
        {notifications.length > 0 && (
          <div className="flex flex-col gap-2">
            {notifications.map((n) => (
              <NotificationBanner
                key={n.id}
                notification={n}
                onDismiss={dismissNotification}
              />
            ))}
          </div>
        )}

        {/* ── Offline overlay hint ──────────────────────────────────────────── */}
        {isOffline && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-center text-xs text-amber-700">
            Cannot reach print daemon. Retrying automatically every 5 s…
          </div>
        )}

        {/* ── Printer selector ──────────────────────────────────────────────── */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="printer-select"
            className="text-xs font-medium text-gray-600 uppercase tracking-wider"
          >
            Printer
          </label>

          {isConnected && printers.length > 0 ? (
            <div className="relative">
              <select
                id="printer-select"
                value={targetPrinter}
                onChange={(e) => setTargetPrinter(e.target.value)}
                className="
                  w-full appearance-none rounded-xl
                  bg-white border border-gray-200
                  px-3.5 py-2.5 pr-9
                  text-sm text-gray-900
                  focus:outline-none focus:ring-2 focus:ring-indigo-500/60
                  transition-all duration-150
                  cursor-pointer
                "
              >
                {printers.map((p) => (
                  <option key={p} value={p} className="bg-white">
                    {p}
                  </option>
                ))}
              </select>
              {/* Chevron */}
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  style={{ height: "0.875rem", width: "0.875rem" }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
            </div>
          ) : (
            <div className="flex h-10 items-center rounded-xl bg-gray-50 border border-gray-200 px-3.5">
              <span className="text-sm text-gray-400 italic">
                {isConnected ? "No printers found" : "Waiting for connection…"}
              </span>
            </div>
          )}
        </div>

        {/* ── Copies + Duplex row ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          {/* Copies */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="copies-input"
              className="text-xs font-medium text-gray-600 uppercase tracking-wider"
            >
              Copies
            </label>
            <div className="flex items-center gap-2">
              <button
                id="copies-decrement"
                onClick={() => setCopies(Math.max(1, copies - 1))}
                aria-label="Decrease copies"
                className="
                  flex h-9 w-9 shrink-0 items-center justify-center rounded-lg
                  bg-white border border-gray-200 text-gray-500
                  hover:bg-gray-100 hover:text-gray-800
                  transition-all duration-150
                  disabled:opacity-30 disabled:cursor-not-allowed
                "
                disabled={copies <= 1}
              >
                −
              </button>
              <input
                id="copies-input"
                type="number"
                min={1}
                max={99}
                value={copies}
                onChange={(e) =>
                  setCopies(Math.max(1, Math.min(99, parseInt(e.target.value, 10) || 1)))
                }
                className="
                  w-full rounded-lg bg-white border border-gray-200
                  px-2 py-2 text-center text-sm text-gray-900
                  focus:outline-none focus:ring-2 focus:ring-indigo-500/60
                  transition-all duration-150
                  [appearance:textfield]
                  [&::-webkit-outer-spin-button]:appearance-none
                  [&::-webkit-inner-spin-button]:appearance-none
                "
              />
              <button
                id="copies-increment"
                onClick={() => setCopies(Math.min(99, copies + 1))}
                aria-label="Increase copies"
                className="
                  flex h-9 w-9 shrink-0 items-center justify-center rounded-lg
                  bg-white border border-gray-200 text-gray-500
                  hover:bg-gray-100 hover:text-gray-800
                  transition-all duration-150
                  disabled:opacity-30 disabled:cursor-not-allowed
                "
                disabled={copies >= 99}
              >
                +
              </button>
            </div>
          </div>

          {/* Duplex */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="duplex-select"
              className="text-xs font-medium text-gray-600 uppercase tracking-wider"
            >
              Layout
            </label>
            <div className="relative">
              <select
                id="duplex-select"
                value={duplex}
                onChange={(e) => setDuplex(e.target.value as DuplexMode)}
                className="
                  w-full appearance-none rounded-xl
                  bg-white border border-gray-200
                  px-3 py-2.5 pr-8
                  text-sm text-gray-900
                  focus:outline-none focus:ring-2 focus:ring-indigo-500/60
                  transition-all duration-150
                  cursor-pointer
                "
              >
                {DUPLEX_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value} className="bg-white">
                    {label}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  style={{ height: "0.75rem", width: "0.75rem" }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
            </div>
          </div>
        </div>

        {/* ── Duplex description hint ───────────────────────────────────────── */}
        <p className="text-[11px] text-gray-400 leading-snug -mt-3">
          {DUPLEX_OPTIONS.find((o) => o.value === duplex)?.description}
        </p>

        {/* ── Print button ──────────────────────────────────────────────────── */}
        {getBase64Pdf && (
          <button
            id="print-execute-btn"
            onClick={onClickPrint}
            disabled={!isConnected || isPrinting || !targetPrinter}
            className="
              relative flex items-center justify-center gap-2.5
              w-full rounded-xl px-4 py-3
              text-sm font-semibold text-white
              bg-indigo-600 hover:bg-indigo-500
              disabled:opacity-40 disabled:cursor-not-allowed
              shadow-lg shadow-indigo-600/30
              hover:shadow-indigo-500/40
              transition-all duration-200
              active:scale-[0.98]
              focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:ring-offset-2 focus:ring-offset-white
            "
          >
            {isPrinting ? (
              <>
                {/* Spinner */}
                <svg
                  className="h-4 w-4 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Sending to printer…
              </>
            ) : (
              <>
                {/* Print icon */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  style={{ height: "1rem", width: "1rem" }}
                >
                  <polyline points="6 9 6 2 18 2 18 9" />
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <rect x="6" y="14" width="12" height="8" />
                </svg>
                Print Document
              </>
            )}
          </button>
        )}

        {/* ── Footer: job summary ───────────────────────────────────────────── */}
        {isConnected && targetPrinter && (
          <p className="text-center text-[11px] text-gray-400 leading-snug">
            {copies} × {DUPLEX_OPTIONS.find((o) => o.value === duplex)?.label.toLowerCase()} →{" "}
            <span className="text-gray-700 font-medium">{targetPrinter}</span>
          </p>
        )}
      </div>
    );
  }
);

PrinterPanel.displayName = "PrinterPanel";

