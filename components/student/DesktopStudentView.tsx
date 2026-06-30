"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PDFDocument } from "pdf-lib";
import dynamic from "next/dynamic";
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

interface DesktopStudentViewProps {
  activeJobs?: PrintJob[];
  allJobs?: PrintJob[];
  locations?: PrintLocation[];
  onJobCreated?: () => void;
}

const STATUS_STYLE: Record<string, string> = {
  WAITING:   "bg-amber-50 text-amber-700 border-amber-200",
  PRINTING:  "bg-sky-50 text-sky-700 border-sky-200",
  READY:     "bg-emerald-50 text-emerald-700 border-emerald-200",
  COLLECTED: "bg-slate-50 text-slate-600 border-slate-200",
  CANCELLED: "bg-rose-50 text-rose-700 border-rose-200",
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

const ChevronDownIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-slate-500">
    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
  </svg>
);

const CheckedStepIcon = () => (
  <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm shadow-indigo-200">
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  </div>
);

const ActiveStepIcon = ({ num }: { num: number }) => (
  <div className="w-8 h-8 rounded-full border-2 border-indigo-600 bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
    <span className="text-indigo-600 text-xs font-bold">{num}</span>
  </div>
);

const UpcomingStepIcon = ({ num }: { num: number }) => (
  <div className="w-8 h-8 rounded-full border-2 border-slate-200 bg-white flex items-center justify-center flex-shrink-0">
    <span className="text-slate-400 text-xs font-bold">{num}</span>
  </div>
);

const getTimelineSteps = (status: PrintJob["status"]) => [
  {
    label: "Document Uploaded",
    desc: "PDF verified and staged",
    isDone: true,
    isActive: false,
  },
  {
    label: "Queued for Printing",
    desc: "Waiting in printer buffer",
    isDone: ["PRINTING", "READY", "COLLECTED"].includes(status),
    isActive: status === "WAITING",
  },
  {
    label: "Printing",
    desc: "Processing through the printer",
    isDone: ["READY", "COLLECTED"].includes(status),
    isActive: status === "PRINTING",
  },
  {
    label: "Ready for Pickup",
    desc: "Collect at printing hub node",
    isDone: status === "COLLECTED",
    isActive: status === "READY",
  },
];

export default function DesktopStudentView({
  activeJobs = [],
  allJobs = [],
  locations = [],
  onJobCreated,
}: DesktopStudentViewProps) {
  const router = useRouter();
  const { data: session } = useSession();

  // Main nav tabs (visible in top bar)
  const [activeTab, setActiveTab] = useState<"new" | "active" | "history" | "locations">("new");

  // Wizard step: Upload → Edit → Settings (only for "new" tab)
  const [wizardStep, setWizardStep] = useState<"UPLOAD" | "EDIT" | "SETTINGS">("UPLOAD");

  // Print settings
  const [selectedLocationId, setSelectedLocationId] = useState(() => locations[0]?.id ?? "");
  const [copies, setCopies] = useState(1);
  const [colorMode, setColorMode] = useState<"BW" | "COLOR">("BW");
  const [printType, setPrintType] = useState<"single-sided" | "double-sided">("single-sided");
  const [paperSize, setPaperSize] = useState<"A4" | "Letter">("A4");
  const [paymentMethod, setPaymentMethod] = useState<"wallet" | "cash">("wallet");

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

  // Staged files & pages — persistent across steps
  const [stagedFiles, setStagedFiles] = useState<ManagedPdfFile[]>([]);
  const [stagedPages, setStagedPages] = useState<{ fileId: string; originalIndex: number }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [compiling, setCompiling] = useState(false);
  const [error, setError] = useState("");
  const [dispatchedTokens, setDispatchedTokens] = useState<string[]>([]);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  // Derived cost
  const totalAggregatedPages = stagedPages.length;

  // Duplex reduces sheet count: 2 pages per sheet, ceiling for odd pages
  const sheetsCount =
    printType === "double-sided"
      ? Math.ceil(totalAggregatedPages / 2)
      : totalAggregatedPages;

  const pricePerSheet =
    colorMode === "COLOR"
      ? printType === "double-sided" ? pricing.colorDoubleSidedPrice : pricing.colorSingleSidedPrice
      : printType === "double-sided" ? pricing.bwDoubleSidedPrice    : pricing.bwSingleSidedPrice;

  const estimatedCost = sheetsCount * copies * pricePerSheet;

  // PdfEditor callback — transition to EDIT step on first file load
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

  // Compile pages in order into a single PDF
  const compileAndBakePdf = async (): Promise<Uint8Array<ArrayBuffer> | null> => {
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
    } catch (err) {
      console.error("[compile]", err);
      setError("Failed to compile PDF. Please try again.");
      return null;
    } finally {
      setCompiling(false);
    }
  };

  const handleDownload = async () => {
    const bytes = await compileAndBakePdf();
    if (!bytes) return;
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `QDoc_Edited_${Date.now()}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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
        throw new Error(d.error || "Submission failed.");
      }

      const jobData = await jobRes.json();
      const newToken: string | undefined = jobData.printJob?.tokenNumber;
      if (newToken) setDispatchedTokens((prev) => [...prev, newToken]);

      // Reset wizard
      setStagedFiles([]);
      setStagedPages([]);
      setWizardStep("UPLOAD");
      setActiveTab("active");
      onJobCreated?.();
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error.");
    } finally {
      setSubmitting(false);
    }
  };

  const studentName = session?.user?.name ?? "Student";
  const initials = studentName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Wizard step indicator
  const steps = [
    { id: "UPLOAD", label: "Upload" },
    { id: "EDIT",   label: "Edit PDF" },
    { id: "SETTINGS", label: "Print Settings" },
  ];
  const currentStepIdx = steps.findIndex((s) => s.id === wizardStep);

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800 antialiased flex flex-col">

      {/* ── Top Navigation Bar ── */}
      <nav className="bg-white border-b border-slate-200 px-6 py-0 flex items-center justify-between sticky top-0 z-40 shadow-sm h-14">
        <div className="flex items-center gap-6 h-full">
          {/* Logo */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
              <Image 
                src="/logo.png" 
                alt="QDoc Logo" 
                width={52} 
                height={52} 
                className="object-contain p-1" 
              />
            <div>
              <h1 className="text-sm font-black text-slate-900 tracking-tight leading-none">QDoc</h1>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Campus Print</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center h-full gap-0">
            {[
              { id: "new",       label: "New Print Job" },
              { id: "active",    label: "Active Jobs",  badge: activeJobs.length > 0 ? activeJobs.length : undefined },
              { id: "history",   label: "Print History" },
              { id: "locations", label: "Printer Hubs" },
            ].map(({ id, label, badge }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as typeof activeTab)}
                className={`relative h-full px-4 text-xs font-semibold transition-all flex items-center gap-1.5 border-b-2 ${
                  activeTab === id
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-200"
                }`}
              >
                {label}
                {badge !== undefined && (
                  <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-indigo-600 text-white text-[9px] font-bold leading-none">
                    {badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* User profile & controls */}
        <div className="flex items-center gap-3">
          <NotificationBell variant="glass" />
          <div className="flex items-center gap-2.5 border-l border-slate-200 pl-3">
            <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold shadow-sm">
              {initials}
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-xs font-bold text-slate-800 leading-tight">{studentName}</p>
              <p className="text-[10px] text-slate-400">Student Portal</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-slate-400 hover:text-red-500 transition-colors ml-1 p-1.5 hover:bg-red-50 rounded-lg"
              title="Sign Out"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* ── Content ── */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">

        {/* ─── TAB: New Print Job (Upload → Edit → Settings Wizard) ─── */}
        {activeTab === "new" && (
          <div className="space-y-6">

            {/* Wizard progress steps */}
            <div className="flex items-center gap-0">
              {steps.map((step, idx) => {
                const isDone = idx < currentStepIdx;
                const isActive = idx === currentStepIdx;
                return (
                  <React.Fragment key={step.id}>
                    <div className="flex items-center gap-3">
                      {isDone ? (
                        <CheckedStepIcon />
                      ) : isActive ? (
                        <ActiveStepIcon num={idx + 1} />
                      ) : (
                        <UpcomingStepIcon num={idx + 1} />
                      )}
                      <span className={`text-xs font-bold ${isActive ? "text-slate-900" : isDone ? "text-indigo-600" : "text-slate-400"}`}>
                        {step.label}
                      </span>
                    </div>
                    {idx < steps.length - 1 && (
                      <div className={`flex-1 h-px mx-4 ${idx < currentStepIdx ? "bg-indigo-300" : "bg-slate-200"}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* ── UPLOAD step header (only shown when UPLOAD step) ── */}
            {wizardStep === "UPLOAD" && (
              <div className="max-w-xl mx-auto">
                <div className="bg-white border border-slate-200 rounded-t-3xl px-6 py-5 border-b border-slate-100">
                  <h2 className="text-lg font-black text-slate-900">Upload your document</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Select or drag a PDF to get started. You can trim pages, reorder them, and merge multiple files before printing.
                  </p>
                </div>
              </div>
            )}

            {/* ── EDIT step header + actions (only shown when EDIT step) ── */}
            {wizardStep === "EDIT" && (
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Edit your document</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Drag pages to reorder • Click to select for deletion • Add more PDFs to merge
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setStagedFiles([]);
                      setStagedPages([]);
                      setWizardStep("UPLOAD");
                    }}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-all text-xs"
                  >
                    ← Start Over
                  </button>
                  <button
                    onClick={() => setWizardStep("SETTINGS")}
                    disabled={totalAggregatedPages === 0}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 disabled:opacity-40 transition-all text-xs shadow shadow-indigo-600/10 flex items-center gap-1.5"
                  >
                    Proceed to Print Settings
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* ── Persistent PdfEditor — always mounted, only hidden during SETTINGS ── */}
            {wizardStep !== "SETTINGS" && (
              <div
                className={`bg-white border border-slate-200 shadow-sm overflow-hidden ${
                  wizardStep === "UPLOAD" ? "max-w-xl mx-auto rounded-b-3xl border-t-0" : "rounded-3xl"
                }`}
                style={{ height: wizardStep === "UPLOAD" ? "360px" : "520px" }}
              >
                <PdfEditor onFilesChange={handleFilesChange} />
              </div>
            )}

            {/* ── STEP 3: SETTINGS ── */}
            {wizardStep === "SETTINGS" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

                {/* Document Summary */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2.5">
                    Document Summary
                  </h3>

                  <div className="divide-y divide-slate-100">
                    {stagedFiles.map((file) => (
                      <div key={file.id} className="py-2.5">
                        <p className="text-xs font-bold text-slate-800 truncate" title={file.fileName}>
                          📄 {file.fileName}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {stagedPages.filter((p) => p.fileId === file.id).length} of {file.totalOriginalPages} pages kept
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">PDF Pages</p>
                      <p className="text-2xl font-black text-slate-900 mt-0.5">{totalAggregatedPages}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">
                        {printType === "double-sided" ? "Sheets (Duplex)" : "Sheets"}
                      </p>
                      <p className="text-2xl font-black text-indigo-600 mt-0.5">{sheetsCount}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setWizardStep("EDIT")}
                    className="w-full py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                  >
                    ← Modify Pages & Order
                  </button>
                </div>

                {/* Print Settings Form */}
                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-100">
                      Print Preferences
                    </h3>

                    {/* Location */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Printer Hub Location</label>
                      <div className="relative">
                        <select
                          value={selectedLocationId}
                          onChange={(e) => setSelectedLocationId(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2.5 text-xs appearance-none focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
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
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"><ChevronDownIcon /></div>
                      </div>
                    </div>

                    {/* Copies & Color */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Copies</label>
                        <div className="flex bg-slate-50 border border-slate-200 rounded-xl p-1 justify-between items-center h-[40px]">
                          <button onClick={() => setCopies((c) => Math.max(1, c - 1))} className="w-7 h-7 bg-white border border-slate-200 rounded-lg text-slate-600 font-bold hover:border-indigo-300 flex items-center justify-center text-sm shadow-sm">−</button>
                          <span className="text-sm font-bold text-slate-800 font-mono">{copies}</span>
                          <button onClick={() => setCopies((c) => c + 1)} className="w-7 h-7 bg-white border border-slate-200 rounded-lg text-slate-600 font-bold hover:border-indigo-300 flex items-center justify-center text-sm shadow-sm">+</button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Color Mode</label>
                        <div className="flex bg-slate-50 border border-slate-200 rounded-xl p-1 h-[40px]">
                          <button onClick={() => setColorMode("BW")} className={`flex-1 rounded-lg text-[10px] font-bold transition-all ${colorMode === "BW" ? "bg-white text-indigo-600 shadow-sm border border-slate-200/50" : "text-slate-400 hover:text-slate-600"}`}>B&amp;W</button>
                          {/* <button onClick={() => setColorMode("COLOR")} className={`flex-1 rounded-lg text-[10px] font-bold transition-all ${colorMode === "COLOR" ? "bg-white text-indigo-600 shadow-sm border border-slate-200/50" : "text-slate-400 hover:text-slate-600"}`}>Color</button> */}
                        </div>
                      </div>
                    </div>

                    {/* Layout & Paper */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Layout</label>
                        <select
                          value={printType}
                          onChange={(e) => setPrintType(e.target.value as "single-sided" | "double-sided")}
                          className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        >
                          <option value="single-sided">Single Sided</option>
                          <option value="double-sided">Duplex (Double Sided)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Paper Size</label>
                        <select
                          value={paperSize}
                          onChange={(e) => setPaperSize(e.target.value as "A4" | "Letter")}
                          className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        >
                          <option value="A4">A4</option>
                          <option value="Letter">Letter</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Payment & Cost */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-100">
                      Payment & Cost
                    </h3>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Payment Method</label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value as "wallet" | "cash")}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      >
                        <option value="cash">Pay Cash at Counter</option>
                      </select>
                    </div>

                    {/* Cost Breakdown */}
                    <div className="bg-slate-50 rounded-2xl p-4 space-y-2 border border-slate-100">
                      <div className="flex justify-between text-xs text-slate-500 font-mono">
                        <span>Total PDF Pages:</span>
                        <span className="font-bold text-slate-700">{totalAggregatedPages}</span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-500 font-mono">
                        <span>Physical Sheets:</span>
                        <span className="font-bold text-slate-700">
                          {sheetsCount}
                          {printType === "double-sided" && totalAggregatedPages !== sheetsCount && (
                            <span className="ml-1 text-indigo-500 text-[10px]">(duplex)</span>
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-500 font-mono">
                        <span>Rate per Sheet:</span>
                        <span className="font-bold text-slate-700">₹{pricePerSheet.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-500 font-mono">
                        <span>Copies:</span>
                        <span className="font-bold text-slate-700">×{copies}</span>
                      </div>
                      <div className="h-px bg-slate-200 my-1" />
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-slate-700">Estimated Cost</span>
                        <span className="text-lg font-black text-indigo-600">₹{estimatedCost.toFixed(2)}</span>
                      </div>
                    </div>

                    {error && (
                      <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 text-[11px] font-mono">
                        ⚠ {error}
                      </div>
                    )}

                    <div className="space-y-2 pt-1">
                      <button
                        onClick={handleSubmitPrintJob}
                        disabled={stagedFiles.length === 0 || submitting || compiling || totalAggregatedPages === 0}
                        className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all uppercase tracking-wider shadow-md shadow-indigo-600/10 flex items-center justify-center gap-2"
                      >
                        {submitting || compiling ? (
                          <>
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            {compiling ? "Compiling PDF…" : "Dispatching…"}
                          </>
                        ) : (
                          <>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659" />
                            </svg>
                            Dispatch Print Job
                          </>
                        )}
                      </button>
                      <button
                        onClick={handleDownload}
                        disabled={compiling || submitting}
                        className="w-full py-2 bg-transparent border border-slate-200 hover:bg-slate-50 text-slate-500 text-[10px] font-mono font-semibold rounded-xl transition-all"
                      >
                        ↓ Download Edited PDF (Local Copy)
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB: Active Jobs ─── */}
        {activeTab === "active" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 space-y-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Active Jobs Tracker</h2>
                <p className="text-xs text-slate-500 mt-1">Track your currently active print spool files in real-time.</p>
              </div>

              {activeJobs.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-lg mx-auto space-y-3 shadow-sm">
                  <div className="text-5xl">📭</div>
                  <h3 className="text-sm font-bold text-slate-800">No active print streams</h3>
                  <p className="text-xs text-slate-400">Active print jobs will show progress, printer assignments, and collection tags here.</p>
                  <button
                    onClick={() => setActiveTab("new")}
                    className="mt-2 px-5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-bold rounded-xl transition-all"
                  >
                    Create a new job
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeJobs.map((job) => {
                    const timelineSteps = getTimelineSteps(job.status);
                    return (
                      <div key={job.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <span className="text-[10px] font-bold text-indigo-600 font-mono bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                              #{job.tokenNumber}
                            </span>
                            <h3 className="text-sm font-bold text-slate-800 mt-2 font-mono truncate max-w-md">
                              {job.fileName}
                            </h3>
                          </div>
                          <span className={`text-[10px] font-bold border px-2.5 py-1 rounded-full uppercase font-mono ${STATUS_STYLE[job.status] ?? "bg-slate-50 text-slate-600 border-slate-200"}`}>
                            {job.status}
                          </span>
                        </div>

                        {/* Timeline */}
                        <div className="relative flex justify-between items-start pt-2">
                          <div className="absolute top-4 left-4 right-4 h-0.5 bg-slate-100 z-0" />
                          {timelineSteps.map((step, idx) => (
                            <div key={idx} className="flex flex-col items-center text-center relative z-10 w-24">
                              {step.isDone ? (
                                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shadow-sm">
                                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                  </svg>
                                </div>
                              ) : step.isActive ? (
                                <div className="w-8 h-8 rounded-full border-2 border-indigo-600 bg-white flex items-center justify-center shadow-sm">
                                  <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                                </div>
                              ) : (
                                <div className="w-8 h-8 rounded-full border-2 border-slate-200 bg-white" />
                              )}
                              <p className={`text-[10px] font-bold mt-2 ${step.isDone ? "text-slate-800" : step.isActive ? "text-indigo-600" : "text-slate-400"}`}>
                                {step.label}
                              </p>
                              <p className="text-[8px] text-slate-400 mt-0.5 leading-tight hidden md:block">
                                {step.desc}
                              </p>
                            </div>
                          ))}
                        </div>

                        <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono border-t border-slate-100 pt-3.5">
                          <span>{job.totalPages} pages • ×{job.copies} copies • {job.colorMode}</span>
                          <span className="text-slate-800 font-bold">₹{job.amount.toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Collection Tokens Sidebar */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2.5">
                Collection Tokens
              </h3>
              <p className="text-xs text-slate-500">Show these tokens to the print center manager.</p>

              {dispatchedTokens.length > 0 ? (
                <div className="space-y-3">
                  {dispatchedTokens.map((token, i) => (
                    <div key={token} className="rounded-2xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest font-mono">Job {i + 1} Token</p>
                        <p className="text-[9px] text-slate-400 font-mono mt-0.5">Collect at assigned hub</p>
                      </div>
                      <p className="text-2xl font-black text-slate-900 font-mono tracking-tight">#{token}</p>
                    </div>
                  ))}
                </div>
              ) : activeJobs.length > 0 ? (
                <div className="space-y-3">
                  {activeJobs.map((job) => (
                    <div key={job.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 flex items-center justify-between">
                      <div>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono">Hub Token</p>
                        <p className="text-[9px] text-slate-400 font-mono mt-0.5 truncate max-w-[120px]">{job.fileName}</p>
                      </div>
                      <p className="text-2xl font-black text-slate-800 font-mono">#{job.tokenNumber}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 font-mono text-center py-4">No collection tokens yet</p>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB: Print History ─── */}
        {activeTab === "history" && (
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Print History</h2>
                <p className="text-xs text-slate-400 mt-0.5">All print operations linked to your account.</p>
              </div>
              <span className="text-xs font-mono bg-slate-100 text-slate-600 px-3 py-1 rounded-xl">
                {allJobs.length} Jobs Total
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-6">Token</th>
                    <th className="py-3 px-6">File Name</th>
                    <th className="py-3 px-6">Details</th>
                    <th className="py-3 px-6">Amount</th>
                    <th className="py-3 px-6">Payment</th>
                    <th className="py-3 px-6">Status</th>
                    <th className="py-3 px-6">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {allJobs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-mono">
                        No print job records found.
                      </td>
                    </tr>
                  ) : (
                    allJobs.map((j) => (
                      <tr key={j.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-6 font-mono font-bold text-indigo-600">#{j.tokenNumber}</td>
                        <td className="py-4 px-6 font-semibold text-slate-800 truncate max-w-[200px]" title={j.fileName}>
                          {j.fileName}
                        </td>
                        <td className="py-4 px-6 font-mono text-slate-500 text-[11px]">
                          {j.totalPages} pgs • ×{j.copies} • {j.colorMode}
                        </td>
                        <td className="py-4 px-6 font-mono font-bold text-slate-800">₹{j.amount.toFixed(2)}</td>
                        <td className="py-4 px-6">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${j.paymentStatus === "PAID" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                            {j.paymentStatus ?? "PENDING"}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase font-mono ${STATUS_STYLE[j.status] ?? "bg-slate-50 text-slate-600"}`}>
                            {j.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-slate-400 font-mono text-[11px]">{formatDate(j.createdAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── TAB: Printer Locations ─── */}
        {activeTab === "locations" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Campus Printer Hubs</h2>
              <p className="text-xs text-slate-500 mt-1">Locate all printing stations across campus buildings.</p>
            </div>

            {locations.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-lg mx-auto shadow-sm">
                <div className="text-4xl mb-3">🏢</div>
                <p className="text-xs text-slate-400">No print hubs registered yet. Please notify support.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {locations.map((loc) => (
                  <div key={loc.id} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all group flex items-start gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0 text-lg shadow-sm group-hover:bg-indigo-100 transition-colors">
                      🖨️
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-slate-800 truncate">{loc.name}</h3>
                      {(loc.building || loc.floor) && (
                        <p className="text-xs text-slate-400 mt-1 font-medium">
                          {[loc.building, loc.floor].filter(Boolean).join(", ")}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 mt-2 bg-emerald-50 border border-emerald-100 text-emerald-700 px-2 py-0.5 rounded-lg w-max text-[9px] font-bold uppercase tracking-wider">
                        <span className="w-1 h-1 rounded-full bg-emerald-500 inline-block animate-pulse" />
                        Online & Active
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
