"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PDFDocument } from "pdf-lib";
import dynamic from "next/dynamic";
import type { ManagedPdfFile } from "./PdfEditor";
import type { PrintLocation } from "@/app/student/page";
import NotificationBell from "@/components/ui/NotificationBell";

// Load PdfEditor client-side only (uses browser canvas APIs)
const PdfEditor = dynamic(() => import("./PdfEditor"), { ssr: false });

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PrintJob {
  id: string;
  fileName: string;
  tokenNumber: string;
  status: "WAITING" | "PRINTING" | "READY" | "COLLECTED" | "CANCELLED";
  paymentStatus?: "PENDING" | "PAID";
  currentPage?: number;
  totalPrintPages?: number;
  amount: number;
  colorMode: string;
  totalPages: number;
  copies: number;
  createdAt: unknown;
  printerNode?: string;
}

interface DesktopStudentViewProps {
  activeJobs?: PrintJob[];
  allJobs?: PrintJob[];
  locations?: PrintLocation[];
  onJobCreated?: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, string> = {
  WAITING:   "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  PRINTING:  "bg-[#54b4eb]/10 text-[#54b4eb] border-[#54b4eb]/20",
  READY:     "bg-green-500/10 text-green-400 border-green-500/20",
  COLLECTED: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  CANCELLED: "bg-red-500/10 text-red-400 border-red-500/20",
};

function formatDate(ts: unknown): string {
  if (!ts) return "—";
  let date: Date;
  if (typeof ts === "object" && ts !== null && "_seconds" in ts) {
    date = new Date((ts as { _seconds: number })._seconds * 1000);
  } else if (typeof ts === "string" || typeof ts === "number") {
    date = new Date(ts as string | number);
  } else {
    return "—";
  }
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const ChevronDownIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
  </svg>
);

const CheckedStepIcon = () => (
  <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0 z-10 border border-indigo-400">
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} className="w-3 h-3">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  </div>
);

const ActiveStepIcon = () => (
  <div className="w-5 h-5 rounded-full border-2 border-indigo-500 bg-[#0d0f1c] flex items-center justify-center flex-shrink-0 z-10">
    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
  </div>
);

const UpcomingStepIcon = () => (
  <div className="w-5 h-5 rounded-full border-2 border-[#1e2235] bg-[#0d0f1c] flex-shrink-0 z-10" />
);

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DesktopStudentView({
  activeJobs = [],
  allJobs = [],
  locations = [],
  onJobCreated,
}: DesktopStudentViewProps) {
  const router = useRouter();

  // ── Print settings ─────────────────────────────────────────────────────────
  const [selectedLocationId, setSelectedLocationId] = useState(() => locations[0]?.id ?? "");
  const [copies, setCopies] = useState(1);
  const [colorMode, setColorMode] = useState<"BW" | "COLOR">("BW");
  const [printType, setPrintType] = useState<"single-sided" | "double-sided">("single-sided");
  const [paperSize, setPaperSize] = useState<"A4" | "Letter">("A4");
  const [paymentMethod, setPaymentMethod] = useState<"wallet" | "cash">("wallet");

  // ── Pricing from DB ────────────────────────────────────────────────────────
  const [pricing, setPricing] = useState({
    bwSingleSidedPrice: 2,
    bwDoubleSidedPrice: 3,
    colorSingleSidedPrice: 5,
    colorDoubleSidedPrice: 8,
  });

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.pricing) setPricing(d.pricing); })
      .catch(() => {/* use defaults */});
  }, []);

  // ── Pipeline state (driven by PdfEditor) ──────────────────────────────────
  const [stagedFiles, setStagedFiles] = useState<ManagedPdfFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [compiling, setCompiling] = useState(false);
  const [sessionPhase, setSessionPhase] = useState<"IDLE" | "UPLOADED" | "SUBMITTED">("IDLE");
  const [error, setError] = useState("");
  const [dispatchedTokens, setDispatchedTokens] = useState<string[]>([]);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  // ── Derived metrics ─────────────────────────────────────────────────────────
  const totalAggregatedPages = stagedFiles.reduce((a, f) => a + f.keptPageIndices.length, 0);

  const pricePerSheet =
    colorMode === "COLOR"
      ? printType === "double-sided" ? pricing.colorDoubleSidedPrice : pricing.colorSingleSidedPrice
      : printType === "double-sided" ? pricing.bwDoubleSidedPrice    : pricing.bwSingleSidedPrice;

  const estimatedCost = totalAggregatedPages * copies * pricePerSheet;

  // ── Receive file changes from PdfEditor ────────────────────────────────────
  const handleFilesChange = useCallback((files: ManagedPdfFile[]) => {
    setStagedFiles(files);
    if (files.length > 0) setSessionPhase("UPLOADED");
    else setSessionPhase("IDLE");
    setError("");
  }, []);

  // ── Compile all staged files into a single PDF ─────────────────────────────
  const compileAndBakePdf = async (): Promise<Uint8Array<ArrayBuffer> | null> => {
    if (stagedFiles.length === 0) return null;
    try {
      setCompiling(true);
      const master = await PDFDocument.create();
      for (const file of stagedFiles) {
        const src = await PDFDocument.load(file.rawBytes);
        const copied = await master.copyPages(src, file.keptPageIndices);
        copied.forEach((p) => master.addPage(p));
      }
      const saved = await master.save();
      // pdf-lib returns Uint8Array with ArrayBufferLike; cast to satisfy Blob constructor
      return new Uint8Array(saved.buffer as ArrayBuffer) as Uint8Array<ArrayBuffer>;
    } catch (err) {
      console.error("[compile]", err);
      setError("Failed to compile PDF. Please try again.");
      return null;
    } finally {
      setCompiling(false);
    }
  };

  // ── Download locally ───────────────────────────────────────────────────────
  const handleDownload = async () => {
    const bytes = await compileAndBakePdf();
    if (!bytes) return;
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `QDoc_${Date.now()}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ── Submit print job ───────────────────────────────────────────────────────
  const handleSubmitPrintJob = async () => {
    if (stagedFiles.length === 0 || totalAggregatedPages === 0) {
      setError("Please load at least one PDF page before submitting.");
      return;
    }
    setSubmitting(true);
    setError("");

    try {
      const bytes = await compileAndBakePdf();
      if (!bytes) throw new Error("PDF compilation failed.");

      const fileName =
        stagedFiles.length === 1
          ? stagedFiles[0]!.fileName
          : `Merged_${stagedFiles.length}_docs.pdf`;

      const blob = new Blob([bytes], { type: "application/pdf" });
      const formData = new FormData();
      formData.append("file", blob, fileName);

      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      if (!uploadRes.ok) {
        const d = await uploadRes.json().catch(() => ({}));
        throw new Error(d.error || d.details || "Upload failed.");
      }
      const uploadData = await uploadRes.json();

      const selectedLocation = locations.find((l) => l.id === selectedLocationId);
      const payload = {
        fileName,
        fileUrl: String(uploadData.fileUrl),
        totalPages: totalAggregatedPages,
        copies,
        colorMode,
        printType,
        paperSize,
        amount: estimatedCost,
        paymentMethod,
        locationId: selectedLocationId,
        locationName: selectedLocation?.name ?? selectedLocationId,
      };

      const jobRes = await fetch("/api/print-jobs/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!jobRes.ok) {
        const d = await jobRes.json().catch(() => ({}));
        const missing = d.missingFields ? ` Missing: ${d.missingFields.join(", ")}` : "";
        throw new Error((d.error || "Submission failed.") + missing);
      }

      const jobData = await jobRes.json();
      const newToken: string | undefined = jobData.printJob?.tokenNumber;
      if (newToken) setDispatchedTokens((prev) => [...prev, newToken]);
      setSessionPhase("SUBMITTED");
      onJobCreated?.();
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Timeline ───────────────────────────────────────────────────────────────
  const getTimelineSteps = (status: PrintJob["status"]) => [
    {
      label: "Document Uploaded",
      desc: "PDF verified and staged",
      isDone: sessionPhase !== "IDLE" || ["WAITING", "PRINTING", "READY", "COLLECTED"].includes(status),
      isActive: false,
    },
    {
      label: "Queued for Printing",
      desc: "Spool priority assigned",
      isDone: ["PRINTING", "READY", "COLLECTED"].includes(status),
      isActive: status === "WAITING",
    },
    {
      label: "Printing",
      desc: "Laser engine rendering sheets",
      isDone: ["READY", "COLLECTED"].includes(status),
      isActive: status === "PRINTING",
    },
    {
      label: "Ready for Pickup",
      desc: "Collect at printer node",
      isDone: status === "COLLECTED",
      isActive: status === "READY",
    },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      className="bg-[#0d0f1c] min-h-screen text-slate-200 antialiased p-6 w-full"
    >
      <div className="flex gap-6 w-full items-start">

        {/* ── LEFT + CENTER ── */}
        <div className="flex-1 flex flex-col gap-5 min-w-0">

          {/* Header row */}
          <div className="w-full border-b border-[#1e2235] pb-4 flex items-center gap-6 flex-wrap">
            <h1 className="text-2xl font-bold text-white tracking-tight font-mono flex-shrink-0">QDoc V1</h1>
            <div className="flex items-center gap-3 flex-wrap">
              {[
                { label: "Active Jobs",  value: activeJobs.length },
                { label: "Locations",    value: locations.length },
                { label: "Files Staged", value: stagedFiles.length },
                { label: "Pages",        value: totalAggregatedPages },
              ].map((s) => (
                <div key={s.label} className="bg-[#111322] border border-[#1e2235] rounded-xl px-4 py-2 text-center min-w-[100px]">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{s.label}</p>
                  <p className="text-sm font-bold text-white mt-0.5">{s.value}</p>
                </div>
              ))}
            </div>
            <div className="ml-auto flex-shrink-0">
              <NotificationBell variant="dark" />
            </div>
          </div>

          {/* Settings + Editor side by side */}
          <div className="flex gap-5 items-start w-full">

            {/* ── Settings panel ── */}
            <div className="w-72 flex-shrink-0 bg-[#111322] border border-[#1e2235] rounded-2xl p-5 space-y-4">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider border-b border-[#1e2235] pb-2.5">
                Print Settings
              </h2>

              {/* Printer node */}
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Printer Node</label>
                <div className="relative">
                  <select
                    value={selectedLocationId}
                    onChange={(e) => setSelectedLocationId(e.target.value)}
                    className="w-full bg-[#0d0f1c] border border-[#1e2235] text-white rounded-xl px-3 py-1.5 text-xs appearance-none focus:outline-none"
                  >
                    {locations.length === 0 ? (
                      <option value="">No locations available</option>
                    ) : (
                      locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name}{loc.building ? ` — ${loc.building}` : ""}{loc.floor ? `, ${loc.floor}` : ""}
                        </option>
                      ))
                    )}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"><ChevronDownIcon /></div>
                </div>
              </div>

              {/* Copies + Color */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Copies</label>
                  <div className="flex bg-[#0d0f1c] border border-[#1e2235] rounded-xl p-0.5 justify-between items-center h-[30px]">
                    <button onClick={() => setCopies((c) => Math.max(1, c - 1))} className="w-5 h-5 bg-[#1a1d33] rounded-lg text-white text-xs font-bold">−</button>
                    <span className="text-xs font-bold text-white font-mono">{copies}</span>
                    <button onClick={() => setCopies((c) => c + 1)} className="w-5 h-5 bg-[#1a1d33] rounded-lg text-white text-xs font-bold">+</button>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Color</label>
                  <div className="flex bg-[#0d0f1c] border border-[#1e2235] rounded-xl p-0.5 h-[30px]">
                    <button onClick={() => setColorMode("BW")} className={`flex-1 rounded-lg text-[9px] font-bold transition-colors ${colorMode === "BW" ? "bg-[#1c1f37] text-indigo-400 border border-[#2e345e]" : "text-gray-500"}`}>B&amp;W</button>
                    <button onClick={() => setColorMode("COLOR")} className={`flex-1 rounded-lg text-[9px] font-bold transition-colors ${colorMode === "COLOR" ? "bg-[#1c1f37] text-indigo-400 border border-[#2e345e]" : "text-gray-500"}`}>Color</button>
                  </div>
                </div>
              </div>

              {/* Layout + Paper */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Layout</label>
                  <select
                    value={printType}
                    onChange={(e) => setPrintType(e.target.value as "single-sided" | "double-sided")}
                    className="w-full bg-[#0d0f1c] border border-[#1e2235] text-white rounded-xl px-2.5 py-1 text-[11px] focus:outline-none"
                  >
                    <option value="single-sided">Single</option>
                    <option value="double-sided">Duplex</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Paper</label>
                  <select
                    value={paperSize}
                    onChange={(e) => setPaperSize(e.target.value as "A4" | "Letter")}
                    className="w-full bg-[#0d0f1c] border border-[#1e2235] text-white rounded-xl px-2.5 py-1 text-[11px] focus:outline-none"
                  >
                    <option value="A4">A4</option>
                    <option value="Letter">Letter</option>
                  </select>
                </div>
              </div>

              {/* Payment */}
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Payment</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as "wallet" | "cash")}
                  className="w-full bg-[#0d0f1c] border border-[#1e2235] text-white rounded-xl px-3 py-1 text-[11px] focus:outline-none"
                >
                  <option value="wallet">Campus Wallet</option>
                  <option value="cash">Cash at Counter</option>
                </select>
              </div>

              {/* Cost estimate */}
              {stagedFiles.length > 0 && (
                <div className="p-3 bg-[#0d0f1c] border border-[#1e2235] rounded-xl flex justify-between text-xs font-mono">
                  <span className="text-gray-400">Total Charge:</span>
                  <span className="text-indigo-400 font-bold">₹{estimatedCost.toFixed(2)}</span>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-[11px] font-mono break-words leading-relaxed">
                  ⚠ {error}
                </div>
              )}

              {/* Action buttons */}
              <div className="space-y-2 pt-1 border-t border-[#1e2235]">
                <button
                  onClick={handleSubmitPrintJob}
                  disabled={stagedFiles.length === 0 || submitting || compiling || totalAggregatedPages === 0}
                  className="w-full py-2.5 bg-indigo-600 disabled:opacity-30 text-white text-xs font-bold rounded-xl hover:bg-indigo-500 transition-colors uppercase tracking-wider shadow-md"
                >
                  {submitting || compiling ? "Processing…" : "Dispatch Print Job"}
                </button>
                {stagedFiles.length > 0 && (
                  <button
                    onClick={handleDownload}
                    disabled={compiling || submitting}
                    className="w-full py-2 bg-transparent border border-[#22263d] hover:bg-[#16192e] text-gray-300 text-[11px] font-bold rounded-xl transition-colors font-mono uppercase disabled:opacity-30"
                  >
                    Download Edited PDF
                  </button>
                )}
              </div>
            </div>

            {/* ── PDF Editor ── */}
            <div className="flex-1 min-w-0" style={{ height: "620px" }}>
              <PdfEditor onFilesChange={handleFilesChange} />
            </div>

          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="w-[360px] flex-shrink-0 flex flex-col gap-3">

          {/* Status Track */}
          <div className="bg-[#111322] border border-[#1e2235] rounded-2xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-[#1e2235] pb-2">Status Track</h3>

            {activeJobs.length === 0 && sessionPhase === "IDLE" ? (
              <div className="relative space-y-4 pl-1 opacity-30">
                <div className="absolute top-3 bottom-3 left-[9px] w-[1.5px] bg-[#1a1d33]" />
                {getTimelineSteps("WAITING").map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2.5">
                    <UpcomingStepIcon />
                    <div className="space-y-0.5">
                      <p className="text-xs text-gray-500 font-semibold">{step.label}</p>
                      <p className="text-[10px] text-gray-600 leading-tight">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

            ) : activeJobs.length === 0 && sessionPhase === "SUBMITTED" && dispatchedTokens.length > 0 ? (
              /* Submitted but poll hasn't fired yet — show all tokens immediately */
              <div className="flex flex-col items-center gap-3 py-2">
                <div className="w-10 h-10 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5 text-green-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </div>
                <p className="text-xs font-semibold text-green-400">{dispatchedTokens.length} job{dispatchedTokens.length > 1 ? "s" : ""} dispatched</p>
                <div className="w-full space-y-2">
                  {dispatchedTokens.map((token, i) => (
                    <div key={token} className="w-full rounded-xl border border-indigo-500/30 bg-indigo-500/5 px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest font-mono">Job {i + 1}</p>
                        <p className="text-[9px] text-gray-500 font-mono mt-0.5">Show at printer to collect</p>
                      </div>
                      <p className="text-2xl font-extrabold text-white font-mono tracking-tight">#{token}</p>
                    </div>
                  ))}
                </div>
              </div>

            ) : (() => {              const job = activeJobs[0] ?? {
                id: "staged",
                fileName:
                  stagedFiles.length === 1
                    ? stagedFiles[0]!.fileName
                    : stagedFiles.length > 1
                    ? `Bundle_${stagedFiles.length}_docs.pdf`
                    : "Awaiting files…",
                status: "WAITING" as const,
                amount: estimatedCost,
              };
              const steps = getTimelineSteps(job.status as PrintJob["status"]);
              return (
                <div className="space-y-4">
                  <div className="bg-[#0d0f1c] border border-[#1e2235] rounded-xl p-3 space-y-1">
                    <p className="text-[9px] text-gray-500 font-mono uppercase tracking-wide">Active Stream</p>
                    <p className="text-xs font-bold text-white truncate font-mono">{job.fileName}</p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[9px] text-indigo-400 font-bold font-mono">#{job.id.slice(0, 6).toUpperCase()}</span>
                      <span className="text-[8px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-bold uppercase font-mono">
                        {sessionPhase === "UPLOADED" && activeJobs.length === 0 ? "STAGED" : job.status}
                      </span>
                    </div>
                  </div>
                  <div className="relative space-y-4 pl-1">
                    <div className="absolute top-3 bottom-3 left-[9px] w-[1.5px] bg-[#1a1d33]" />
                    {steps.map((step, idx) => (
                      <div key={idx} className="flex items-start gap-2.5">
                        {step.isDone ? <CheckedStepIcon /> : step.isActive ? <ActiveStepIcon /> : <UpcomingStepIcon />}
                        <div className="space-y-0.5">
                          <p className={`text-xs ${step.isDone ? "text-slate-200 font-semibold" : step.isActive ? "text-indigo-400 font-bold" : "text-gray-500"}`}>{step.label}</p>
                          <p className="text-[10px] text-gray-500 leading-tight">{step.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="pt-2.5 border-t border-[#1e2235] flex items-center justify-between text-xs font-mono">
                    <span className="text-gray-500">Fee:</span>
                    <span className="text-white font-bold">₹{job.amount.toFixed(2)}</span>
                  </div>

                  {/* Token numbers — all dispatched tokens for this session */}
                  {dispatchedTokens.length > 0 && (
                    <div className="mt-1 space-y-2">
                      {dispatchedTokens.map((token, i) => (
                        <div key={token} className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 px-3 py-2.5 flex items-center justify-between">
                          <div>
                            <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest font-mono">Job {i + 1} token</p>
                            <p className="text-[9px] text-gray-500 font-mono mt-0.5">Show at printer</p>
                          </div>
                          <p className="text-2xl font-extrabold text-white font-mono tracking-tight">#{token}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Print History */}
          <div className="bg-[#111322] border border-[#1e2235] rounded-2xl overflow-hidden">
            <div className="p-3 bg-[#16192e] border-b border-[#1e2235] flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Print History</h3>
              <span className="text-[10px] font-mono text-gray-500">{allJobs.length} jobs</span>
            </div>
            <div className="divide-y divide-[#1e2235] max-h-[400px] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {allJobs.length === 0 ? (
                <p className="text-[10px] text-gray-500 p-4 text-center">No print jobs yet.</p>
              ) : (
                allJobs.map((j) => {
                  const isWaiting = j.status === "WAITING";
                  const isExpanded = expandedJobId === j.id;
                  return (
                    <div
                      key={j.id}
                      onClick={() => isWaiting && setExpandedJobId(isExpanded ? null : j.id)}
                      className={`p-3 transition-colors space-y-1.5 text-[11px] font-mono border-b border-[#1e2235]/0 ${
                        isWaiting ? "cursor-pointer hover:bg-[#15182b]" : "hover:bg-[#15182b]"
                      } ${isExpanded ? "bg-[#15182b]" : ""}`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-indigo-400 font-bold truncate">#{j.tokenNumber}</span>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {isWaiting && (
                            <span className="text-[8px] text-gray-500 font-mono">
                              {isExpanded ? "▲" : "▼"}
                            </span>
                          )}
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase ${STATUS_STYLE[j.status] ?? "bg-gray-500/10 text-gray-400 border-gray-500/20"}`}>
                            {j.status}
                          </span>
                        </div>
                      </div>
                      <p className="text-white font-sans text-xs truncate">{j.fileName}</p>
                      <div className="flex justify-between text-gray-500 text-[9px] pt-1 border-t border-[#1e2235]/40">
                        <span>{j.totalPages} pgs &bull; x{j.copies} &bull; {j.colorMode}</span>
                        <span className="text-slate-200 font-bold">₹{j.amount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-[9px]">
                        <span className={j.paymentStatus === "PAID" ? "text-green-400" : "text-yellow-400"}>
                          {j.paymentStatus ?? "PENDING"}
                        </span>
                        <span className="text-gray-600">{formatDate(j.createdAt)}</span>
                      </div>

                      {/* Token panel — expands on click for WAITING jobs */}
                      {isExpanded && isWaiting && (
                        <div className="mt-2 rounded-xl border border-indigo-500/30 bg-indigo-500/5 px-3 py-3 flex items-center justify-between">
                          <div>
                            <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">Print Token</p>
                            <p className="text-[9px] text-gray-500 mt-0.5">Show at the printer to collect</p>
                          </div>
                          <p className="text-2xl font-extrabold text-white tracking-tight">#{j.tokenNumber}</p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
