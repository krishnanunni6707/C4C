"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { signOut, useSession } from "next-auth/react";
import type { ManagedPdfFile } from "./PdfEditor";
import type { PrintLocation } from "@/app/student/page";
import NotificationBell from "@/components/ui/NotificationBell";
import Image from "next/image";
import { usePrintSettings } from "@/lib/hooks/usePrintSettings";
import { usePricing } from "@/lib/hooks/usePricing";
import { usePayment } from "@/lib/hooks/usePayment";
import RazorpayPaymentModal from "./RazorpayPaymentModal";

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
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  // Settings & draft state via shared hook
  const {
    wizardStep,
    setWizardStep,
    selectedLocationId,
    setSelectedLocationId,
    copies,
    setCopies,
    colorMode,
    setColorMode,
    printType,
    setPrintType,
    paperSize,
    setPaperSize,
    paymentMethod,
    stagedFiles,
    setStagedFiles,
    stagedPages,
    setStagedPages,
    handleFilesChange,
    promptState,
    pendingDraft,
    handleAcceptDraft,
    discardDraft,
    resetSettings,
  } = usePrintSettings({
    userId: session?.user?.id,
    locations,
    onFileError: (err) => setError(err),
  });

  // Cost and pricing via shared hook
  const {
    pricing,
    isDuplex,
    sheetsCount,
    pricePerSheet,
    estimatedCost,
  } = usePricing({
    pagesCount: stagedPages.length,
    copies,
    colorMode,
    printType,
  });
  const totalAggregatedPages = stagedPages.length;

  // Compilation, download, upload, and payment via shared hook
  const {
    isRazorpayModalOpen,
    setIsRazorpayModalOpen,
    pendingOrderId,
    setPendingOrderId,
    submitting,
    compiling,
    error,
    setError,
    dispatchedTokens,
    setDispatchedTokens,
    compileAndBakePdf,
    handleDownload,
    handleInitiatePayment,
    handlePaymentSuccess,
  } = usePayment({
    stagedFiles,
    stagedPages,
    copies,
    colorMode,
    printType,
    paperSize,
    selectedLocationId,
    onSuccess: () => {
      resetSettings();
      setActiveTab("active");
      onJobCreated?.();
      router.refresh();
    },
  });

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
    { id: "PAYMENT", label: "Razorpay Payment" },
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

            {/* Resume Draft Banner */}
            {promptState === "prompting" && pendingDraft && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 3.75H6.912a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H15M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859M12 3v8.25m0 0-3-3m3 3 3-3" /></svg>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Unsaved Print Draft Found</h4>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      You have an unfinished session with {pendingDraft.stagedFiles.length} file(s) ({pendingDraft.stagedPages.length} pages). Continue where you left off?
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={discardDraft}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-300 text-slate-600 text-xs font-semibold hover:bg-white transition-all"
                  >
                    Start Fresh
                  </button>
                  <button
                    onClick={handleAcceptDraft}
                    className="px-4 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 transition-all shadow-sm"
                  >
                    Resume Draft
                  </button>
                </div>
              </div>
            )}

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

            {/* ── Persistent PdfEditor — always mounted, only hidden during SETTINGS or PAYMENT ── */}
            {wizardStep !== "SETTINGS" && wizardStep !== "PAYMENT" && (
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
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5 inline-block mr-1 flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>{file.fileName}
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
                          <button onClick={() => setColorMode("COLOR")} className={`flex-1 rounded-lg text-[10px] font-bold transition-all ${colorMode === "COLOR" ? "bg-white text-amber-600 shadow-sm border border-slate-200/50" : "text-slate-400 hover:text-slate-600"}`}>Color</button>
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
                      Payment &amp; Cost
                    </h3>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Payment Method</label>
                      <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-3.5 py-2.5">
                        <span className="text-indigo-600 text-sm">💳</span>
                        <span className="text-xs font-bold text-indigo-700 flex-1">Razorpay Gateway</span>
                        <span className="text-[10px] font-bold uppercase tracking-wide bg-indigo-600 text-white px-2 py-0.5 rounded-full">UPI • Cards • NetBanking</span>
                      </div>
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
                      <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 text-[11px] font-mono flex items-start gap-2">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 flex-shrink-0 mt-px"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
                        {error}
                      </div>
                    )}

                    <div className="space-y-2 pt-1">
                      <button
                        onClick={() => setWizardStep("PAYMENT")}
                        disabled={stagedFiles.length === 0 || totalAggregatedPages === 0}
                        className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all uppercase tracking-wider shadow-md shadow-indigo-600/10 flex items-center justify-center gap-2"
                      >
                        Proceed to Payment (₹{estimatedCost.toFixed(2)}) →
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

            {/* ── STEP 4: PAYMENT ── */}
            {wizardStep === "PAYMENT" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* Document Summary */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2.5">
                    Print Order Summary
                  </h3>
                  <div className="divide-y divide-slate-100">
                    {stagedFiles.map((file) => (
                      <div key={file.id} className="py-2.5">
                        <p className="text-xs font-bold text-slate-800 truncate" title={file.fileName}>
                          📄 {file.fileName}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {totalAggregatedPages} total pages • ×{copies} copies
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-medium">Layout:</span>
                      <span className="font-bold text-slate-800">{printType === "double-sided" ? "Duplex" : "Single Sided"}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-medium">Color:</span>
                      <span className="font-bold text-slate-800">{colorMode}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-medium">Location:</span>
                      <span className="font-bold text-slate-800">{locations.find(l => l.id === selectedLocationId)?.name ?? "Campus Hub"}</span>
                    </div>
                    <div className="h-px bg-indigo-100 my-1" />
                    <div className="flex justify-between items-center text-sm font-black text-indigo-700">
                      <span>Total Due:</span>
                      <span className="text-xl">₹{estimatedCost.toFixed(2)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setWizardStep("SETTINGS")}
                    className="w-full py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                  >
                    ← Back to Settings
                  </button>
                </div>

                {/* Payment Gateway Box */}
                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
                  <div>
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-black text-slate-900">Complete Razorpay Payment</h2>
                      <span className="bg-indigo-50 text-indigo-600 border border-indigo-100 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                        Online Gateway
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Upon successful payment verification, your document will automatically compile and dispatch to the target printer queue.
                    </p>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-900">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5 flex-shrink-0 text-amber-600 mt-px"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" /></svg>
                    <div>
                      <p className="font-bold text-xs">Automatic Spool Dispatch</p>
                      <p className="text-[11px] text-amber-800 mt-0.5">
                        Only after payment confirmation is your job assigned a sequential queue token number.
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5 text-indigo-600"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.753 3h15.75c.621 0 1.125-.504 1.125-1.125V6.375c0-.621-.504-1.125-1.125-1.125H3.75c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125Z" /></svg>
                        <span className="text-xs font-bold text-slate-800">Razorpay Payment Instruments</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">UPI • Cards • NetBanking</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Click below to open the Razorpay payment gateway modal. You can complete payment using any GPay/PhonePe UPI ID, Debit/Credit Card, or NetBanking.
                    </p>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 text-[11px] font-mono flex items-start gap-2">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 flex-shrink-0 mt-px"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
                      {error}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={handleInitiatePayment}
                      disabled={stagedFiles.length === 0 || submitting || compiling || totalAggregatedPages === 0}
                      className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all uppercase tracking-wider shadow-md shadow-indigo-600/10 flex items-center justify-center gap-2"
                    >
                      {submitting || compiling ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          {compiling ? "Compiling PDF…" : "Preparing Order…"}
                        </>
                      ) : (
                        <>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.753 3h15.75c.621 0 1.125-.504 1.125-1.125V6.375c0-.621-.504-1.125-1.125-1.125H3.75c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125Z" />
                          </svg>
                          Pay ₹{estimatedCost.toFixed(2)} &amp; Dispatch Job
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleDownload}
                      disabled={compiling || submitting}
                      className="px-4 py-4 bg-transparent border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-xl transition-all"
                    >
                      ↓ Download PDF
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Razorpay Gateway Modal */}
            <RazorpayPaymentModal
              isOpen={isRazorpayModalOpen}
              onClose={() => setIsRazorpayModalOpen(false)}
              orderId={pendingOrderId}
              amount={estimatedCost}
              user={session?.user}
              jobDetails={{
                fileName: stagedFiles[0]?.fileName || "Print Document",
                pages: totalAggregatedPages,
                copies,
                locationName: locations.find((l) => l.id === selectedLocationId)?.name || "Campus Printer",
                colorMode,
                printType,
              }}
              onSuccess={handlePaymentSuccess}
            />
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
                  <div className="flex justify-center text-slate-300">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} className="w-16 h-16"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H6.911a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661Z" /></svg>
                  </div>
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
                <div className="flex justify-center text-slate-300 mb-3">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} className="w-14 h-14"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" /></svg>
                </div>
                <p className="text-xs text-slate-400">No print hubs registered yet. Please notify support.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {locations.map((loc) => (
                  <div key={loc.id} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all group flex items-start gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0 shadow-sm group-hover:bg-indigo-100 transition-colors">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" /></svg>
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
