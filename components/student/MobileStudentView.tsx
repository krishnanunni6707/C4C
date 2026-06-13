"use client";

import React, { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { PDFDocument } from "pdf-lib";
import type { ManagedPdfFile } from "./PdfEditor";
import type { PrintLocation } from "@/app/student/page";
import NotificationBell from "@/components/ui/NotificationBell";

// Load PdfEditor client-side only — uses browser canvas APIs
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

interface MobileStudentViewProps {
  activeJobs?: PrintJob[];
  allJobs?: PrintJob[];
  locations?: PrintLocation[];
  onJobCreated?: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(ts: unknown): string {
  if (!ts) return "—";
  let date: Date;
  if (typeof ts === "object" && ts !== null && "_seconds" in ts) {
    date = new Date((ts as { _seconds: number })._seconds * 1000);
  } else if (typeof ts === "string" || typeof ts === "number") {
    date = new Date(ts);
  } else {
    return "—";
  }
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

const STATUS_STYLE: Record<string, string> = {
  WAITING:   "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  PRINTING:  "bg-[#54b4eb]/10 text-[#54b4eb] border-[#54b4eb]/20",
  READY:     "bg-green-500/10 text-green-400 border-green-500/20",
  COLLECTED: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  CANCELLED: "bg-red-500/10 text-red-400 border-red-500/20",
};

// ─── Icons ────────────────────────────────────────────────────────────────────

const DashboardIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
  </svg>
);

const PlusCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
    <circle cx="12" cy="12" r="9" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9" />
  </svg>
);

const HistoryIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const PrintersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
  </svg>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MobileStudentView({
  activeJobs = [],
  allJobs = [],
  locations = [],
  onJobCreated,
}: MobileStudentViewProps) {
  // ── Tab ───────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"new" | "dashboard" | "history" | "printers">("new");

  // ── New Job / PDF editor state ────────────────────────────────────────────
  const [stagedFiles, setStagedFiles] = useState<ManagedPdfFile[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState(() => locations[0]?.id ?? "");
  const [copies, setCopies] = useState(1);
  const [colorMode, setColorMode] = useState<"BW" | "COLOR">("BW");
  const [printType, setPrintType] = useState<"single-sided" | "double-sided">("single-sided");
  const [paperSize] = useState<"A4">("A4");
  const [submitting, setSubmitting] = useState(false);
  const [compiling, setCompiling] = useState(false);
  const [error, setError] = useState("");
  const [dispatchedTokens, setDispatchedTokens] = useState<string[]>([]);

  // ── History expand state ──────────────────────────────────────────────────
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

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

  // ── Derived ───────────────────────────────────────────────────────────────
  const totalPages = stagedFiles.reduce((a, f) => a + f.keptPageIndices.length, 0);

  const pricePerSheet =
    colorMode === "COLOR"
      ? printType === "double-sided" ? pricing.colorDoubleSidedPrice : pricing.colorSingleSidedPrice
      : printType === "double-sided" ? pricing.bwDoubleSidedPrice    : pricing.bwSingleSidedPrice;

  const estimatedCost = totalPages * copies * pricePerSheet;

  const handleFilesChange = useCallback((files: ManagedPdfFile[]) => {
    setStagedFiles(files);
    setError("");
  }, []);

  // ── Compile ───────────────────────────────────────────────────────────────
  const compilePdf = async (): Promise<Uint8Array<ArrayBuffer> | null> => {
    if (stagedFiles.length === 0) return null;
    try {
      setCompiling(true);
      const master = await PDFDocument.create();
      for (const file of stagedFiles) {
        const src = await PDFDocument.load(file.rawBytes);
        const pages = await master.copyPages(src, file.keptPageIndices);
        pages.forEach((p) => master.addPage(p));
      }
      const saved = await master.save();
      return new Uint8Array(saved.buffer as ArrayBuffer) as Uint8Array<ArrayBuffer>;
    } catch {
      setError("Failed to compile PDF.");
      return null;
    } finally {
      setCompiling(false);
    }
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (stagedFiles.length === 0 || totalPages === 0) {
      setError("Please load at least one PDF page.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const bytes = await compilePdf();
      if (!bytes) throw new Error("Compilation failed.");

      const fileName =
        stagedFiles.length === 1
          ? stagedFiles[0]!.fileName
          : `Merged_${stagedFiles.length}_docs.pdf`;

      const blob = new Blob([bytes], { type: "application/pdf" });
      const fd = new FormData();
      fd.append("file", blob, fileName);

      const uploadRes = await fetch("/api/upload", { method: "POST", body: fd });
      if (!uploadRes.ok) {
        const d = await uploadRes.json().catch(() => ({}));
        throw new Error(d.error || "Upload failed.");
      }
      const uploadData = await uploadRes.json();

      const selectedLocation = locations.find((l) => l.id === selectedLocationId);
      const jobRes = await fetch("/api/print-jobs/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName,
          fileUrl: String(uploadData.fileUrl),
          totalPages,
          copies,
          colorMode,
          printType,
          paperSize,
          amount: estimatedCost,
          paymentMethod: "cash",
          locationId: selectedLocationId,
          locationName: selectedLocation?.name ?? selectedLocationId,
        }),
      });

      if (!jobRes.ok) {
        const d = await jobRes.json().catch(() => ({}));
        const missing = d.missingFields ? ` Missing: ${d.missingFields.join(", ")}` : "";
        throw new Error((d.error || "Submission failed.") + missing);
      }

      const jobData = await jobRes.json();
      const token: string | undefined = jobData.printJob?.tokenNumber;
      if (token) setDispatchedTokens((prev) => [...prev, token]);

      onJobCreated?.();
      // Switch to history so user can see the new job
      setActiveTab("history");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error.");
    } finally {
      setSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // ── New Job View ──────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────

  const renderNewJob = () => (
    <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5 pb-32">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">New Print Job</h2>
        <p className="text-sm text-[#888] mt-1">Edit your PDF, then configure and dispatch.</p>
      </div>

      {/* PDF Editor */}
      <div style={{ height: 420 }}>
        <PdfEditor onFilesChange={handleFilesChange} />
      </div>

      {/* Print Settings */}
      <div className="bg-[#161824] rounded-2xl border border-[#222533] p-5 space-y-4">
        <h3 className="text-white font-bold text-base border-b border-[#222533] pb-3">Print Settings</h3>

        {/* Printer node */}
        <div className="space-y-1.5">
          <p className="text-[#686d7d] text-[10px] font-bold uppercase tracking-wider">Printer Node</p>
          <div className="relative">
            <select
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              className="w-full bg-[#0f111a] border border-[#222533] text-white text-sm rounded-xl px-3 py-3 pr-10 appearance-none focus:outline-none focus:border-[#4f46e5]"
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
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><ChevronDownIcon /></div>
          </div>
        </div>

        {/* Copies + Color */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <p className="text-[#686d7d] text-[10px] font-bold uppercase tracking-wider">Copies</p>
            <div className="flex items-center justify-between bg-[#0f111a] border border-[#222533] rounded-xl p-1 h-[46px]">
              <button onClick={() => setCopies((c) => Math.max(1, c - 1))} className="w-8 h-8 rounded-lg bg-[#1c1e2e] text-white text-lg flex items-center justify-center hover:bg-[#25283d]">−</button>
              <span className="text-white text-sm font-bold">{copies}</span>
              <button onClick={() => setCopies((c) => Math.min(99, c + 1))} className="w-8 h-8 rounded-lg bg-[#1c1e2e] text-white text-lg flex items-center justify-center hover:bg-[#25283d]">+</button>
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-[#686d7d] text-[10px] font-bold uppercase tracking-wider">Color Mode</p>
            <div className="flex bg-[#0f111a] border border-[#222533] rounded-xl p-1 h-[46px]">
              <button onClick={() => setColorMode("BW")} className={`flex-1 rounded-lg text-xs font-bold transition-colors ${colorMode === "BW" ? "bg-[#25283d] text-white" : "text-[#686d7d]"}`}>B&amp;W</button>
              <button onClick={() => setColorMode("COLOR")} className={`flex-1 rounded-lg text-xs font-bold transition-colors ${colorMode === "COLOR" ? "bg-[#25283d] text-white" : "text-[#686d7d]"}`}>Color</button>
            </div>
          </div>
        </div>

        {/* Layout */}
        <div className="space-y-1.5">
          <p className="text-[#686d7d] text-[10px] font-bold uppercase tracking-wider">Layout</p>
          <div className="relative">
            <select
              value={printType}
              onChange={(e) => setPrintType(e.target.value as "single-sided" | "double-sided")}
              className="w-full bg-[#0f111a] border border-[#222533] text-white text-xs rounded-xl px-3 py-3 pr-8 appearance-none focus:outline-none"
            >
              <option value="single-sided">Single Sided</option>
              <option value="double-sided">Duplex (Double)</option>
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><ChevronDownIcon /></div>
          </div>
        </div>

        {/* Cost + Dispatch */}
        <div className="pt-4 border-t border-[#222533] flex items-center justify-between gap-4">
          <div className="flex-shrink-0">
            <p className="text-[#686d7d] text-xs">Estimated Cost</p>
            <p className="text-white text-xl font-bold mt-0.5">₹{estimatedCost.toFixed(2)}</p>
          </div>
          <div className="flex-1">
            {error && <p className="text-red-400 text-[11px] mb-2">⚠ {error}</p>}
            <button
              onClick={handleSubmit}
              disabled={stagedFiles.length === 0 || submitting || compiling || totalPages === 0}
              className="w-full bg-indigo-600 text-white font-bold text-sm py-3.5 rounded-xl hover:bg-indigo-500 transition-colors disabled:opacity-40 shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
            >
              {submitting || compiling ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {compiling ? "Compiling…" : "Uploading…"}
                </>
              ) : "Dispatch Print Job"}
            </button>
          </div>
        </div>

        {/* Dispatched token chips (this session) */}
        {dispatchedTokens.length > 0 && (
          <div className="pt-3 border-t border-[#222533] space-y-2">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Dispatched This Session</p>
            {dispatchedTokens.map((token, i) => (
              <div key={token} className="flex items-center justify-between bg-indigo-500/5 border border-indigo-500/20 rounded-xl px-4 py-2.5">
                <div>
                  <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">Job {i + 1}</p>
                  <p className="text-[9px] text-gray-500 mt-0.5">Show at printer</p>
                </div>
                <p className="text-xl font-extrabold text-white">#{token}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // ── Dashboard View ────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────

  const renderDashboard = () => {
    const counts = {
      total:     allJobs.length,
      printing:  allJobs.filter((j) => j.status === "PRINTING").length,
      ready:     allJobs.filter((j) => j.status === "READY").length,
      collected: allJobs.filter((j) => j.status === "COLLECTED").length,
    };
    return (
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6 pb-28">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Dashboard</h2>
          <p className="text-sm text-[#888] mt-1">Overview of your print activity</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: "Total Jobs",  value: counts.total,     color: "from-indigo-500/20 to-indigo-500/5" },
            { label: "Printing",    value: counts.printing,  color: "from-blue-500/20 to-blue-500/5" },
            { label: "Ready",       value: counts.ready,     color: "from-green-500/20 to-green-500/5" },
            { label: "Collected",   value: counts.collected, color: "from-gray-500/20 to-gray-500/5" },
          ].map((s) => (
            <div key={s.label} className={`bg-gradient-to-b ${s.color} border border-[#222533] rounded-2xl p-4`}>
              <p className="text-[#686d7d] text-xs tracking-wide">{s.label}</p>
              <p className="text-white text-2xl font-bold mt-1.5">{s.value}</p>
            </div>
          ))}
        </div>
        <button
          onClick={() => setActiveTab("new")}
          className="w-full bg-indigo-600 text-white font-semibold py-4 rounded-2xl hover:bg-indigo-500 transition-colors text-sm"
        >
          + Start New Print Job
        </button>
        {activeJobs.length > 0 && (
          <div className="space-y-3">
            <p className="text-[#686d7d] text-xs uppercase tracking-wider">Active Jobs</p>
            {activeJobs.map((job) => (
              <div key={job.id} className="bg-[#161824] border border-[#222533] rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-white text-sm font-semibold truncate max-w-[180px]">{job.fileName}</p>
                  <p className="text-[#686d7d] text-xs mt-0.5">Token #{job.tokenNumber}</p>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${STATUS_STYLE[job.status] ?? "bg-gray-500/10 text-gray-400 border-gray-500/20"}`}>
                  {job.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // ── History View ──────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────

  const renderHistory = () => (
    <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 pb-28">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">History</h2>
        <p className="text-sm text-[#888] mt-1">All your print jobs — tap a waiting job to see its token</p>
      </div>

      {allJobs.length === 0 ? (
        <div className="bg-[#161824] border border-[#222533] rounded-2xl p-10 text-center space-y-2">
          <div className="text-4xl">📭</div>
          <p className="text-[#686d7d] text-sm">No print jobs yet</p>
          <button
            onClick={() => setActiveTab("new")}
            className="mt-2 text-xs text-indigo-400 font-semibold underline underline-offset-2"
          >
            Start your first print job →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {allJobs.map((job) => {
            const isWaiting = job.status === "WAITING";
            const isExpanded = expandedJobId === job.id;
            return (
              <div
                key={job.id}
                onClick={() => isWaiting && setExpandedJobId(isExpanded ? null : job.id)}
                className={`bg-[#161824] border rounded-2xl p-4 space-y-3 transition-all ${
                  isExpanded ? "border-indigo-500/40 bg-[#14172a]" : "border-[#222533]"
                } ${isWaiting ? "cursor-pointer active:scale-[0.99]" : ""}`}
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-[#e84a5f]/10 rounded-xl flex items-center justify-center text-[#e84a5f] text-[10px] font-bold flex-shrink-0">
                      {job.colorMode === "COLOR" ? "CLR" : "B&W"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-semibold truncate max-w-[160px]">{job.fileName}</p>
                      <p className="text-[#686d7d] text-xs mt-0.5">Token #{job.tokenNumber}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {isWaiting && (
                      <span className="text-[10px] text-gray-500">{isExpanded ? "▲" : "▼"}</span>
                    )}
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${STATUS_STYLE[job.status] ?? "bg-gray-500/10 text-gray-400 border-gray-500/20"}`}>
                      {job.status}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="flex items-center justify-between text-[11px] text-[#686d7d] border-t border-[#222533] pt-2">
                  <span>{job.totalPages} pages &bull; {job.copies} {job.copies === 1 ? "copy" : "copies"}</span>
                  <span className="text-white font-bold">₹{job.amount.toFixed(2)}</span>
                </div>

                {/* Payment + date */}
                <div className="flex items-center justify-between text-[11px]">
                  <span className={job.paymentStatus === "PAID" ? "text-green-400" : "text-yellow-400"}>
                    {job.paymentStatus ?? "PENDING"}
                  </span>
                  <span className="text-[#444a5a] text-xs">{formatDate(job.createdAt)}</span>
                </div>

                {/* Token expand panel */}
                {isExpanded && isWaiting && (
                  <div className="mt-1 rounded-xl border border-indigo-500/30 bg-indigo-500/5 px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">Print Token</p>
                      <p className="text-[9px] text-gray-500 mt-0.5">Show this at the printer</p>
                    </div>
                    <p className="text-3xl font-extrabold text-white tracking-tight">#{job.tokenNumber}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // ── Printers View ─────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────

  const renderPrinters = () => (
    <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 pb-28">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Printers</h2>
        <p className="text-sm text-[#888] mt-1">Available printing centres on campus</p>
      </div>
      {locations.length === 0 ? (
        <div className="bg-[#161824] border border-[#222533] rounded-2xl p-10 text-center space-y-2">
          <div className="text-3xl">🖨️</div>
          <p className="text-[#686d7d] text-sm">No printing centres found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {locations.map((loc) => (
            <div key={loc.id} className="bg-[#161824] border border-[#222533] rounded-2xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 flex-shrink-0">
                <PrintersIcon />
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-semibold truncate">{loc.name}</p>
                {(loc.building || loc.floor) && (
                  <p className="text-[#686d7d] text-xs mt-0.5 truncate">
                    {[loc.building, loc.floor].filter(Boolean).join(", ")}
                  </p>
                )}
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                  <span className="text-green-400 text-xs font-semibold">Online</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // ── Root render ───────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col bg-[#0f111a] min-h-screen text-slate-100 antialiased">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-4 bg-[#0f111a] border-b border-[#161824] sticky top-0 z-40">
        <span className="text-white font-bold text-xl tracking-tight">QDoc</span>
        <div className="flex items-center gap-2.5">
          <NotificationBell variant="dark" />
          <div className="bg-[#161824] border border-[#222533] rounded-xl px-3 py-1.5 flex items-center gap-1.5">
            <span className="text-[10px] text-[#686d7d]">Jobs</span>
            <span className="text-xs font-bold text-white">{allJobs.length}</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#1e1b4b] border border-[#312e81] flex items-center justify-center text-indigo-400 text-xs font-bold">
            U
          </div>
        </div>
      </div>

      {/* Tab content */}
      {activeTab === "new"       && renderNewJob()}
      {activeTab === "dashboard" && renderDashboard()}
      {activeTab === "history"   && renderHistory()}
      {activeTab === "printers"  && renderPrinters()}

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0f111a] border-t border-[#161824] flex items-center justify-around py-2.5 z-50">
        {[
          { id: "dashboard", label: "Dashboard", Icon: DashboardIcon },
          { id: "new",       label: "New Job",   Icon: PlusCircleIcon },
          { id: "history",   label: "History",   Icon: HistoryIcon },
          { id: "printers",  label: "Printers",  Icon: PrintersIcon },
        ].map(({ id, label, Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id as typeof activeTab)}
              className={`flex flex-col items-center gap-1 transition-colors relative w-16 ${active ? "text-indigo-400" : "text-[#444a5a] hover:text-gray-400"}`}
            >
              <Icon />
              <span className="text-[10px] font-bold tracking-wide">{label}</span>
              {active && <span className="absolute -bottom-2.5 w-6 h-0.5 bg-indigo-500 rounded-full" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
