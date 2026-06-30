"use client";

import React, { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { PDFDocument } from "pdf-lib";
import { signOut, useSession } from "next-auth/react";
import type { ManagedPdfFile } from "./PdfEditor";
import type { PrintLocation } from "@/app/student/page";
import NotificationBell from "@/components/ui/NotificationBell";
import Image from "next/image";

const PdfEditor = dynamic(() => import("./PdfEditor"), { ssr: false });

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
  WAITING:   "bg-amber-50 text-amber-700 border-amber-200",
  PRINTING:  "bg-sky-50 text-sky-700 border-sky-200",
  READY:     "bg-emerald-50 text-emerald-700 border-emerald-200",
  COLLECTED: "bg-slate-50 text-slate-600 border-slate-200",
  CANCELLED: "bg-rose-50 text-rose-700 border-rose-200",
};

// ─── Icons ────────────────────────────────────────────────────────────────────

const PrintIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659" />
  </svg>
);

const TrackerIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
  </svg>
);

const HistoryIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const PrintersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-slate-500">
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
  const { data: session } = useSession();

  // Bottom nav tab
  const [activeTab, setActiveTab] = useState<"print" | "tracker" | "history" | "hubs">("print");

  // Wizard Step inside print tab: UPLOAD → EDIT → SETTINGS
  const [wizardStep, setWizardStep] = useState<"UPLOAD" | "EDIT" | "SETTINGS">("UPLOAD");

  // Print Settings
  const [selectedLocationId, setSelectedLocationId] = useState(() => locations[0]?.id ?? "");
  const [copies, setCopies] = useState(1);
  const [colorMode, setColorMode] = useState<"BW" | "COLOR">("BW");
  const [printType, setPrintType] = useState<"single-sided" | "double-sided">("single-sided");
  const [paperSize] = useState<"A4">("A4");
  const [paymentMethod, setPaymentMethod] = useState<"wallet" | "cash">("wallet");

  const [stagedFiles, setStagedFiles] = useState<ManagedPdfFile[]>([]);
  const [stagedPages, setStagedPages] = useState<{ fileId: string; originalIndex: number }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [compiling, setCompiling] = useState(false);
  const [error, setError] = useState("");
  const [dispatchedTokens, setDispatchedTokens] = useState<string[]>([]);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  // Pricing from DB
  const [pricing, setPricing] = useState({
    bwSingleSidedPrice: 2,
    bwDoubleSidedPrice: 3,
    colorSingleSidedPrice: 5,
    colorDoubleSidedPrice: 8,
  });

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.pricing) setPricing(d.pricing);
      })
      .catch(() => {});
  }, []);

  // Derived cost — duplex halves the sheet count
  const totalPages = stagedPages.length;
  const sheetsCount = printType === "double-sided" ? Math.ceil(totalPages / 2) : totalPages;
  const pricePerSheet =
    colorMode === "COLOR"
      ? printType === "double-sided" ? pricing.colorDoubleSidedPrice : pricing.colorSingleSidedPrice
      : printType === "double-sided" ? pricing.bwDoubleSidedPrice    : pricing.bwSingleSidedPrice;
  const estimatedCost = sheetsCount * copies * pricePerSheet;

  const handleFilesChange = useCallback((
    files: ManagedPdfFile[],
    pages: { fileId: string; originalIndex: number }[]
  ) => {
    setStagedFiles(files);
    setStagedPages(pages);
    if (files.length > 0) {
      setWizardStep((prev) => (prev === "UPLOAD" ? "EDIT" : prev));
    } else {
      setWizardStep("UPLOAD");
    }
    setError("");
  }, []);

  // Compile PDF
  const compilePdf = async (): Promise<Uint8Array<ArrayBuffer> | null> => {
    if (stagedFiles.length === 0 || stagedPages.length === 0) return null;
    try {
      setCompiling(true);
      const master = await PDFDocument.create();
      const docCache: Record<string, PDFDocument> = {};
      for (const f of stagedFiles) {
        docCache[f.id] = await PDFDocument.load(f.rawBytes);
      }
      for (const page of stagedPages) {
        const src = docCache[page.fileId];
        if (src) {
          const [copiedPage] = await master.copyPages(src, [page.originalIndex]);
          master.addPage(copiedPage);
        }
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

  // Submit print job
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
          paymentMethod,
          locationId: selectedLocationId,
          locationName: selectedLocation?.name ?? selectedLocationId,
        }),
      });

      if (!jobRes.ok) {
        const d = await jobRes.json().catch(() => ({}));
        throw new Error(d.error || "Submission failed.");
      }

      const jobData = await jobRes.json();
      const token: string | undefined = jobData.printJob?.tokenNumber;
      if (token) setDispatchedTokens((prev) => [...prev, token]);

      // Reset wizard
      setStagedFiles([]);
      setStagedPages([]);
      setWizardStep("UPLOAD");
      setActiveTab("tracker");
      onJobCreated?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error.");
    } finally {
      setSubmitting(false);
    }
  };

  const studentName = session?.user?.name ?? "Student";
  const initials = studentName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  // ─── Wizard Step Indicator ─────────────────────────────────────────────────

  const WizardStepBar = () => {
    const steps = ["Upload", "Edit PDF", "Settings"];
    const currentIdx = wizardStep === "UPLOAD" ? 0 : wizardStep === "EDIT" ? 1 : 2;
    return (
      <div className="flex items-center gap-0 px-4 py-3 bg-white border-b border-slate-100">
        {steps.map((step, idx) => (
          <React.Fragment key={step}>
            <div className="flex items-center gap-1.5">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${
                idx < currentIdx
                  ? "bg-indigo-600 text-white"
                  : idx === currentIdx
                  ? "border-2 border-indigo-600 text-indigo-600 bg-white"
                  : "border-2 border-slate-200 text-slate-400 bg-white"
              }`}>
                {idx < currentIdx ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} className="w-2.5 h-2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                ) : idx + 1}
              </div>
              <span className={`text-[10px] font-bold ${idx === currentIdx ? "text-slate-900" : idx < currentIdx ? "text-indigo-600" : "text-slate-400"}`}>
                {step}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`flex-1 h-px mx-2 ${idx < currentIdx ? "bg-indigo-300" : "bg-slate-200"}`} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  // ─── Print Tab ──────────────────────────────────────────────────────────────

  const renderPrintTab = () => (
    <div className="flex-1 flex flex-col min-h-0 pb-20">
      <WizardStepBar />

      {/* STEP 1: UPLOAD — header only */}
      {wizardStep === "UPLOAD" && (
        <div className="px-4 pt-4 pb-2 flex-shrink-0">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Upload Document</h2>
          <p className="text-xs text-slate-500 mt-0.5">Select a PDF to edit and print.</p>
        </div>
      )}

      {/* STEP 2: EDIT — header + actions */}
      {wizardStep === "EDIT" && (
        <div className="px-4 pt-4 pb-2 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-lg font-black text-slate-900">Edit PDF</h2>
            <p className="text-[10px] text-slate-400 mt-0.5">Tap a page's number to move it • Tap to select</p>
          </div>
          <span className="text-[10px] font-mono bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded">
            {totalPages} page{totalPages !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Persistent PdfEditor — always mounted while not in SETTINGS.
          Now flex-1 so it fills available screen height instead of a fixed
          pixel height that left dead space below on most phones. */}
      {wizardStep !== "SETTINGS" && (
        <div className="flex-1 min-h-0 px-4 pb-2">
          <div className="h-full bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <PdfEditor onFilesChange={handleFilesChange} />
          </div>
        </div>
      )}

      {/* EDIT step — bottom actions */}
      {wizardStep === "EDIT" && (
        <div className="px-4 py-4 flex gap-2 flex-shrink-0">
          <button
            onClick={() => {
              setStagedFiles([]);
              setStagedPages([]);
              setWizardStep("UPLOAD");
            }}
            className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold bg-white shadow-sm"
          >
            ← Start Over
          </button>
          <button
            onClick={() => setWizardStep("SETTINGS")}
            disabled={totalPages === 0}
            className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/10"
          >
            Print Settings →
          </button>
        </div>
      )}

      {/* STEP 3: SETTINGS */}
      {wizardStep === "SETTINGS" && (
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-28 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900">Print Settings</h2>
            <button onClick={() => setWizardStep("EDIT")} className="text-xs text-indigo-600 font-bold">
              ← Edit Pages
            </button>
          </div>

          {/* Document summary strip */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">PDF Pages</p>
              <p className="text-xl font-black text-slate-900">{totalPages}</p>
            </div>
            <div className="h-8 w-px bg-indigo-200" />
            <div className="text-right">
              <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">
                {printType === "double-sided" ? "Sheets (Duplex)" : "Sheets"}
              </p>
              <p className="text-xl font-black text-indigo-600">{sheetsCount}</p>
            </div>
            <div className="h-8 w-px bg-indigo-200" />
            <div className="text-right">
              <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">Est. Cost</p>
              <p className="text-xl font-black text-indigo-600">₹{estimatedCost.toFixed(2)}</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4 shadow-sm">
            {/* Location */}
            <div className="space-y-1.5">
              <label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Printer Location</label>
              <div className="relative">
                <select
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-3 pr-10 appearance-none focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
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
                <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2"><ChevronDownIcon /></div>
              </div>
            </div>

            {/* Copies + Color */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Copies</label>
                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-1 h-[42px]">
                  <button onClick={() => setCopies((c) => Math.max(1, c - 1))} className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-800 text-sm flex items-center justify-center font-bold shadow-sm">−</button>
                  <span className="text-slate-800 text-sm font-bold">{copies}</span>
                  <button onClick={() => setCopies((c) => Math.min(99, c + 1))} className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-800 text-sm flex items-center justify-center font-bold shadow-sm">+</button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Color Mode</label>
                <div className="flex bg-slate-50 border border-slate-200 rounded-xl p-1 h-[42px]">
                  <button onClick={() => setColorMode("BW")} className={`flex-1 rounded-lg text-[10px] font-bold transition-colors ${colorMode === "BW" ? "bg-white text-indigo-600 shadow-sm border border-slate-200/50" : "text-slate-400"}`}>B&amp;W</button>
                  <button onClick={() => setColorMode("COLOR")} className={`flex-1 rounded-lg text-[10px] font-bold transition-colors ${colorMode === "COLOR" ? "bg-white text-indigo-600 shadow-sm border border-slate-200/50" : "text-slate-400"}`}>Color</button>
                </div>
              </div>
            </div>

            {/* Layout */}
            <div className="space-y-1.5">
              <label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Print Layout</label>
              <div className="relative">
                <select
                  value={printType}
                  onChange={(e) => setPrintType(e.target.value as "single-sided" | "double-sided")}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-3 pr-8 appearance-none focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="single-sided">Single Sided</option>
                  <option value="double-sided">Duplex (Double Sided)</option>
                </select>
                <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2"><ChevronDownIcon /></div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="space-y-1.5">
              <label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Payment Mode</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as "wallet" | "cash")}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-3 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="wallet">Campus Wallet</option>
                <option value="cash">Pay Cash at Counter</option>
              </select>
            </div>

            {/* Cost Breakdown */}
            <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 border border-slate-100">
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>PDF Pages:</span><span className="font-bold text-slate-700">{totalPages}</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>Physical Sheets:</span>
                <span className="font-bold text-slate-700">
                  {sheetsCount}
                  {printType === "double-sided" && totalPages !== sheetsCount && (
                    <span className="ml-1 text-indigo-400 text-[9px]">(duplex)</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>Rate/Sheet:</span><span className="font-bold text-slate-700">₹{pricePerSheet.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>Copies:</span><span className="font-bold text-slate-700">×{copies}</span>
              </div>
              <div className="h-px bg-slate-200 my-1" />
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-700">Total:</span>
                <span className="text-base font-black text-indigo-600">₹{estimatedCost.toFixed(2)}</span>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 text-[11px] font-mono">
                ⚠ {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={stagedFiles.length === 0 || submitting || compiling || totalPages === 0}
              className="w-full bg-indigo-600 text-white font-bold text-xs py-4 rounded-xl hover:bg-indigo-500 transition-colors disabled:opacity-40 shadow-md shadow-indigo-600/10 flex items-center justify-center gap-1.5"
            >
              {submitting || compiling ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {compiling ? "Compiling PDF…" : "Dispatching…"}
                </>
              ) : "🖨️ Dispatch Print Job"}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // ─── Tracker Tab ─────────────────────────────────────────────────────────────

  const renderTracker = () => (
    <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 pb-28">
      <div>
        <h2 className="text-xl font-black text-slate-900 tracking-tight">Active Print Streams</h2>
        <p className="text-xs text-slate-500 mt-0.5">Monitor your currently processing print jobs.</p>
      </div>

      {/* Recent dispatched tokens */}
      {dispatchedTokens.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Collection Tokens</p>
          {dispatchedTokens.map((token, i) => (
            <div key={token} className="bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest font-mono">Job {i + 1}</p>
                <p className="text-[9px] text-slate-400 font-mono mt-0.5">Present at print counter</p>
              </div>
              <p className="text-2xl font-black text-slate-900 font-mono">#{token}</p>
            </div>
          ))}
        </div>
      )}

      {activeJobs.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-2 shadow-sm">
          <div className="text-3xl">📭</div>
          <p className="text-slate-700 font-bold text-xs">No active print streams</p>
          <p className="text-slate-400 text-[10px]">Create a new print job from the Print tab below.</p>
          <button onClick={() => setActiveTab("print")} className="mt-2 text-xs bg-indigo-50 text-indigo-600 font-bold px-4 py-2 rounded-xl">
            Start printing →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {activeJobs.map((job) => (
            <div key={job.id} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-sm">
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <span className="text-[9px] font-bold text-indigo-600 font-mono bg-indigo-50 px-1.5 py-0.5 rounded">
                    #{job.tokenNumber}
                  </span>
                  <p className="text-slate-800 text-xs font-bold font-mono mt-1.5 truncate max-w-[180px]">
                    {job.fileName}
                  </p>
                </div>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase ${STATUS_STYLE[job.status] ?? "bg-slate-50 text-slate-600 border-slate-200"}`}>
                  {job.status}
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-2 border-t border-slate-100">
                <span>{job.totalPages} pgs • ×{job.copies} copies • {job.colorMode}</span>
                <span className="text-slate-800 font-bold">₹{job.amount.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ─── History Tab ──────────────────────────────────────────────────────────────

  const renderHistory = () => (
    <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 pb-28">
      <div>
        <h2 className="text-xl font-black text-slate-900 tracking-tight">Print History</h2>
        <p className="text-xs text-slate-500 mt-0.5">Tap WAITING jobs to reveal pickup token.</p>
      </div>

      {allJobs.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-2 shadow-sm">
          <div className="text-3xl">📭</div>
          <p className="text-slate-500 text-xs">No print records found</p>
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
                className={`bg-white border rounded-2xl p-4 space-y-3 transition-all ${
                  isExpanded ? "border-indigo-300 bg-indigo-50/20" : "border-slate-200 shadow-sm"
                } ${isWaiting ? "cursor-pointer active:scale-[0.99]" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 text-[9px] font-black flex-shrink-0">
                      {job.colorMode === "COLOR" ? "CLR" : "B&W"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-slate-800 text-xs font-bold truncate max-w-[140px]">{job.fileName}</p>
                      <p className="text-slate-400 text-[10px] mt-0.5">Token #{job.tokenNumber}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {isWaiting && (
                      <span className="text-[10px] text-slate-400">{isExpanded ? "▲" : "▼"}</span>
                    )}
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLE[job.status] ?? "bg-slate-50 text-slate-600"}`}>
                      {job.status}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-100 pt-2">
                  <span>{job.totalPages} pgs • ×{job.copies} {job.copies === 1 ? "copy" : "copies"}</span>
                  <span className="text-slate-800 font-bold">₹{job.amount.toFixed(2)}</span>
                </div>

                {isExpanded && isWaiting && (
                  <div className="mt-1 rounded-xl border border-indigo-100 bg-indigo-50/50 px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest font-mono">Print Token</p>
                      <p className="text-[8px] text-slate-400 mt-0.5">Present this at the print counter</p>
                    </div>
                    <p className="text-2xl font-black text-slate-900 font-mono">#{job.tokenNumber}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ─── Hubs Tab ─────────────────────────────────────────────────────────────────

  const renderHubs = () => (
    <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 pb-28">
      <div>
        <h2 className="text-xl font-black text-slate-900 tracking-tight">Printer Hubs</h2>
        <p className="text-xs text-slate-500 mt-0.5">Campus printing stations currently online.</p>
      </div>

      {locations.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
          <p className="text-slate-500 text-xs">No active centres found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {locations.map((loc) => (
            <div key={loc.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:border-indigo-200 transition-colors">
              <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 flex-shrink-0 text-lg">
                🖨️
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-slate-800 text-sm font-bold truncate">{loc.name}</p>
                {(loc.building || loc.floor) && (
                  <p className="text-slate-400 text-[10px] mt-0.5 truncate">
                    {[loc.building, loc.floor].filter(Boolean).join(", ")}
                  </p>
                )}
                <div className="flex items-center gap-1 mt-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                  <span className="text-emerald-700 text-[9px] font-bold uppercase tracking-wider">Active</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ─── Root render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col bg-slate-50 min-h-screen text-slate-800 antialiased">

      {/* Top Header */}
      <div className="flex items-center justify-between px-4 pt-safe-top py-3 bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2.5 flex-shrink-0">
                <Image 
                  src="/logo.png" 
                  alt="QDoc Logo" 
                  width={52} 
                  height={52} 
                  className="object-contain p-1" 
                />
              </div>
          <div>
            <span className="text-slate-900 font-black text-base tracking-tight leading-none block">QDoc</span>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Campus Print</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 text-[10px] font-bold">
            {initials}
          </div>
          <NotificationBell variant="dark" />
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors"
            title="Sign out"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {activeTab === "print"   && renderPrintTab()}
        {activeTab === "tracker" && renderTracker()}
        {activeTab === "history" && renderHistory()}
        {activeTab === "hubs"    && renderHubs()}
      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex items-center justify-around pb-safe-bottom z-50 shadow-lg shadow-slate-200/50">
        {[
          { id: "print",   label: "Print",   Icon: PrintIcon,    badge: undefined },
          { id: "tracker", label: "Tracker", Icon: TrackerIcon,  badge: activeJobs.length > 0 ? activeJobs.length : undefined },
          { id: "history", label: "History", Icon: HistoryIcon,  badge: undefined },
          { id: "hubs",    label: "Hubs",    Icon: PrintersIcon, badge: undefined },
        ].map(({ id, label, Icon, badge }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id as typeof activeTab)}
              className={`flex flex-col items-center gap-0.5 py-2.5 transition-colors relative w-16 ${active ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"}`}
            >
              <div className="relative">
                <Icon />
                {badge !== undefined && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-indigo-600 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                    {badge}
                  </span>
                )}
              </div>
              <span className="text-[9px] font-bold tracking-wide">{label}</span>
              {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-indigo-600 rounded-full" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}