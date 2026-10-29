"use client";

import React, { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { PDFDocument } from "pdf-lib";
import { signOut, useSession } from "next-auth/react";
import type { ManagedPdfFile } from "./PdfEditor";
import type { PrintLocation } from "@/app/student/page";
import NotificationBell from "@/components/ui/NotificationBell";
import Image from "next/image";
import { useDraftPersistence } from "@/lib/hooks/useDraftPersistence";

const PdfEditor = dynamic(() => import("./PdfEditor"), { ssr: false });
import RazorpayPaymentModal from "./RazorpayPaymentModal";

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
  WAITING:   "bg-amber-500/10 text-amber-600 border-amber-500/20",
  PRINTING:  "bg-indigo-500/10 text-indigo-600 border-indigo-500/20 animate-pulse",
  READY:     "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  COLLECTED: "bg-slate-500/10 text-slate-500 border-slate-500/20",
  CANCELLED: "bg-rose-500/10 text-rose-600 border-rose-500/20",
};

// ─── SVG Icons ───────────────────────────────────────────────────────────────

const HomeIcon = ({ active }: { active?: boolean }) => (
  <svg viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 2} className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h7.5" />
  </svg>
);

const UploadTabIcon = ({ active }: { active?: boolean }) => (
  <svg viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const QueueIcon = ({ active }: { active?: boolean }) => (
  <svg viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 2} className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const HistoryTabIcon = ({ active }: { active?: boolean }) => (
  <svg viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 2} className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);

const ProfileIcon = ({ active }: { active?: boolean }) => (
  <svg viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 2} className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
  </svg>
);

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-slate-400">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
  </svg>
);

const FilterIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-slate-500">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0m-9.75 0h9.75" />
  </svg>
);

const WalletIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5 text-indigo-600">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9.563C9 9.252 9.252 9 9.563 9h4.874c.311 0 .563.252.563.563v.874c0 .311-.252.563-.563.563H9.563A.563.563 0 019 10.437v-.874zm0 3.5c0-.311.252-.563.563-.563h4.874c.311 0 .563.252.563.563v.874c0 .311-.252.563-.563.563H9.563A.563.563 0 019 13.937v-.874z" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-slate-400">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-slate-500">
    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
  </svg>
);

// ─── Main Mobile View ─────────────────────────────────────────────────────────

export default function MobileStudentView({
  activeJobs = [],
  allJobs = [],
  locations = [],
  onJobCreated,
}: MobileStudentViewProps) {
  const { data: session } = useSession();

  // Bottom Navigation state: "home" | "upload" | "queue" | "history" | "profile"
  const [activeTab, setActiveTab] = useState<"home" | "upload" | "queue" | "history" | "profile">("home");

  // Wizard Step inside upload tab: UPLOAD → EDIT → SETTINGS → PAYMENT
  const [wizardStep, setWizardStep] = useState<"UPLOAD" | "EDIT" | "SETTINGS" | "PAYMENT">("UPLOAD");

  // UI Local state
  const [searchQuery, setSearchQuery] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [walletBalance, setWalletBalance] = useState(0.00);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState(100);

  // Print Settings
  const [selectedLocationId, setSelectedLocationId] = useState(() => locations[0]?.id ?? "");
  const [copies, setCopies] = useState(1);
  const [colorMode, setColorMode] = useState<"BW" | "COLOR">("BW");
  const [printType, setPrintType] = useState<"single-sided" | "double-sided">("single-sided");
  const [paperSize] = useState<"A4">("A4");
  const paymentMethod = "razorpay" as const;
  const [isRazorpayModalOpen, setIsRazorpayModalOpen] = useState(false);

  const [stagedFiles, setStagedFiles] = useState<ManagedPdfFile[]>([]);
  const [stagedPages, setStagedPages] = useState<{ fileId: string; originalIndex: number }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [compiling, setCompiling] = useState(false);
  const [error, setError] = useState("");
  const [dispatchedTokens, setDispatchedTokens] = useState<string[]>([]);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  // Dynamic pricing state
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

  // Price math
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

  // Draft persistence hook
  const {
    promptState,
    pendingDraft,
    acceptDraft,
    discardDraft,
    saveDraft,
    clearDraft,
  } = useDraftPersistence({
    userId: session?.user?.id,
    availableLocationIds: locations.map((l) => l.id),
    defaultLocationId: locations[0]?.id ?? "",
  });

  useEffect(() => {
    saveDraft({
      wizardStep,
      stagedFiles,
      stagedPages,
      selectedLocationId,
      copies,
      colorMode,
      printType,
      paperSize,
      paymentMethod,
    });
  }, [
    wizardStep,
    stagedFiles,
    stagedPages,
    selectedLocationId,
    copies,
    colorMode,
    printType,
    paperSize,
    saveDraft,
  ]);

  const handleAcceptDraft = () => {
    const draft = acceptDraft();
    if (draft) {
      setWizardStep(draft.wizardStep);
      setStagedFiles(draft.stagedFiles);
      setStagedPages(draft.stagedPages);
      if (draft.selectedLocationId) setSelectedLocationId(draft.selectedLocationId);
      setCopies(draft.copies);
      setColorMode(draft.colorMode);
      setPrintType(draft.printType);
      // paymentMethod is always "razorpay" — no restore needed
    }
  };

  // Compile PDF
  const compilePdf = async (): Promise<Uint8Array<ArrayBuffer> | null> => {
    if (stagedFiles.length === 0 || stagedPages.length === 0) return null;
    const pdfFiles = stagedFiles.filter((f) => !f.isNonPdfDoc);
    if (pdfFiles.length === 0) return null;

    try {
      setCompiling(true);
      const master = await PDFDocument.create();
      const docCache: Record<string, PDFDocument> = {};
      for (const f of pdfFiles) {
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
      setError("Failed to compile document.");
      return null;
    } finally {
      setCompiling(false);
    }
  };

  // Submit print job
  const handleSubmit = async () => {
    if (stagedFiles.length === 0 || totalPages === 0) {
      setError("Please load at least one file.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      let uploadBlob: Blob;
      let fileName: string;

      const nonPdfDoc = stagedFiles.find((f) => f.isNonPdfDoc);
      if (nonPdfDoc && stagedFiles.length === 1) {
        uploadBlob = new Blob([nonPdfDoc.rawBytes as unknown as BlobPart]);
        fileName = nonPdfDoc.fileName;
      } else {
        const bytes = await compilePdf();
        if (!bytes) throw new Error("Compilation failed.");
        uploadBlob = new Blob([bytes], { type: "application/pdf" });
        fileName =
          stagedFiles.length === 1
            ? stagedFiles[0]!.fileName
            : `Merged_${stagedFiles.length}_docs.pdf`;
      }

      const fd = new FormData();
      fd.append("file", uploadBlob, fileName);

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
          paymentMethod: "RAZORPAY" as const,
          paymentStatus: "PAID" as const, // Set PAID after Razorpay success
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

      // wallet deduction removed — Razorpay only

      // Clear draft & reset wizard
      clearDraft();
      setStagedFiles([]);
      setStagedPages([]);
      setWizardStep("UPLOAD");
      setActiveTab("queue");
      onJobCreated?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error.");
    } finally {
      setSubmitting(false);
    }
  };

  const studentName = session?.user?.name ?? "Student";
  const userEmail = session?.user?.email ?? "";
  const admissionNumber = (session?.user as any)?.admissionNumber ?? "";
  const initials = studentName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  // ─── Step Indicator Component ──────────────────────────────────────────────

  const WizardStepBar = () => {
    const steps = ["Upload", "Edit PDF", "Settings", "Pay & Print"];
    const currentIdx = wizardStep === "UPLOAD" ? 0 : wizardStep === "EDIT" ? 1 : wizardStep === "SETTINGS" ? 2 : 3;
    return (
      <div className="flex items-center gap-0 px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
        {steps.map((step, idx) => (
          <React.Fragment key={step}>
            <div className="flex items-center gap-1.5">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 transition-all ${
                idx < currentIdx
                  ? "bg-indigo-600 text-white"
                  : idx === currentIdx
                  ? "border-2 border-indigo-600 text-indigo-600 bg-white dark:bg-slate-900"
                  : "border-2 border-slate-200 dark:border-slate-700 text-slate-400 bg-white dark:bg-slate-900"
              }`}>
                {idx < currentIdx ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} className="w-2.5 h-2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                ) : idx + 1}
              </div>
              <span className={`text-[10px] font-bold ${idx === currentIdx ? "text-slate-900 dark:text-white" : idx < currentIdx ? "text-indigo-600" : "text-slate-400"}`}>
                {step}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`flex-1 h-px mx-2 ${idx < currentIdx ? "bg-indigo-300 dark:bg-indigo-800" : "bg-slate-200 dark:bg-slate-800"}`} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  // ─── 1. Home Tab Render ────────────────────────────────────────────────────

  const renderHomeTab = () => {
    const activeStream = activeJobs[0];

    return (
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-28">
        {/* Header Greeting */}
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
            Hello {studentName.split(" ")[0]} <span className="animate-bounce">👋</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Welcome back to CampusPrint</p>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <SearchIcon />
            <input
              type="text"
              placeholder="Search print hubs, files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl pl-9 pr-4 py-2.5 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 shadow-sm"
            />
          </div>
          <button className="w-9 h-9 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-center shadow-sm active:scale-95 transition-transform">
            <FilterIcon />
          </button>
        </div>

        {/* Wallet Balance Card */}
        <div className="bg-gradient-to-br from-indigo-600 via-indigo-600 to-indigo-700 text-white rounded-3xl p-5 shadow-lg shadow-indigo-600/20 relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between relative z-10">
            <div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-indigo-200">Wallet Balance</span>
              <h2 className="text-3xl font-black tracking-tight mt-0.5">₹{walletBalance.toFixed(2)}</h2>
            </div>
            <button
              onClick={() => setShowTopUpModal(true)}
              className="bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs font-bold px-3.5 py-2 rounded-xl hover:bg-white/30 transition-all active:scale-95 flex items-center gap-1.5 shadow-sm"
            >
              <span>+</span> Top Up
            </button>
          </div>
          <div className="mt-4 pt-3 border-t border-indigo-500/40 flex items-center justify-between text-[10px] text-indigo-100 font-medium">
            <span>Fast print checkout enabled</span>
            <span className="bg-indigo-500/40 px-2 py-0.5 rounded-full font-mono text-[9px]">ACTIVE</span>
          </div>
        </div>

        {/* Quick New Print Card */}
        <div
          onClick={() => setActiveTab("upload")}
          className="bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/40 rounded-3xl p-4 shadow-sm hover:border-indigo-300 transition-all cursor-pointer group active:scale-[0.99] flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-2xl group-hover:scale-105 transition-transform shadow-sm">
              +
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">New Print Job</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Upload &amp; print files in seconds</p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 group-hover:translate-x-1 transition-transform">
            →
          </div>
        </div>

        {/* Active Print Stream Progress Card */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Active Print Stream</h3>
            {activeJobs.length > 1 && (
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
                {activeJobs.length} active
              </span>
            )}
          </div>

          {activeStream ? (
            <div className="bg-white dark:bg-slate-900 border border-indigo-100 dark:border-slate-800 rounded-3xl p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-ping inline-block" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {activeStream.status === "PRINTING" ? "Printing Page 3 of 12" : activeStream.status === "READY" ? "Ready for Pickup!" : "In Printing Queue"}
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-900">
                  #{activeStream.tokenNumber}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                    style={{ width: activeStream.status === "PRINTING" ? "65%" : activeStream.status === "READY" ? "100%" : "25%" }}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                  <span>EST. 2 MINS</span>
                  <span>{activeStream.status === "PRINTING" ? "65% Complete" : activeStream.status === "READY" ? "Complete" : "Queued"}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="text-slate-600 dark:text-slate-400 font-medium truncate max-w-[180px]">
                  📄 {activeStream.fileName}
                </span>
                <button
                  onClick={() => setActiveTab("queue")}
                  className="text-indigo-600 dark:text-indigo-400 font-bold text-xs hover:underline flex items-center gap-0.5"
                >
                  View Details →
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 text-center space-y-1 shadow-sm">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No print active right now</p>
              <p className="text-[10px] text-slate-400">Send your first document using the New Print button above.</p>
            </div>
          )}
        </div>

        {/* Recent Files List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Recent Files</h3>
            {allJobs.length > 3 && (
              <button onClick={() => setActiveTab("history")} className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
                See All
              </button>
            )}
          </div>

          {allJobs.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 text-center space-y-1 shadow-sm">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No recent files</p>
              <p className="text-[10px] text-slate-400">Your uploaded and printed files will appear here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {allJobs.slice(0, 3).map((job) => (
                <div
                  key={job.id}
                  className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-3 flex items-center justify-between shadow-sm hover:border-indigo-200 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs flex-shrink-0 border border-indigo-100 dark:border-indigo-900">
                      PDF
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{job.fileName}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                        {job.totalPages} pgs • {job.colorMode} • {formatDate(job.createdAt)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab("upload")}
                    className="bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold px-3 py-1.5 rounded-xl border border-indigo-100 dark:border-indigo-900 hover:bg-indigo-600 hover:text-white transition-colors flex-shrink-0"
                  >
                    Print
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ─── 2. Upload Tab Render ──────────────────────────────────────────────────

  const renderUploadTab = () => (
    <div className="flex-1 flex flex-col min-h-0 pb-20">
      <WizardStepBar />

      {/* Draft Resume Prompt Banner */}
      {promptState === "prompting" && pendingDraft && (
        <div className="mx-4 mt-3 bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-3 flex flex-col gap-2.5 shadow-sm flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-base flex-shrink-0">
              💾
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Resume Previous Draft?</h4>
              <p className="text-[10px] text-slate-600 dark:text-slate-300 mt-0.5">
                {pendingDraft.stagedFiles.length} file(s) ({pendingDraft.stagedPages.length} pages) saved.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={discardDraft}
              className="flex-1 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-semibold bg-white dark:bg-slate-900"
            >
              Start Fresh
            </button>
            <button
              onClick={handleAcceptDraft}
              className="flex-1 py-1.5 rounded-xl bg-indigo-600 text-white text-[11px] font-bold shadow-sm"
            >
              Resume
            </button>
          </div>
        </div>
      )}

      {/* STEP 1: UPLOAD */}
      {wizardStep === "UPLOAD" && (
        <div className="px-4 pt-4 pb-2 flex-shrink-0">
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Upload Document</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Select a PDF, Word document, or image to print.</p>
        </div>
      )}

      {/* STEP 2: EDIT */}
      {wizardStep === "EDIT" && (
        <div className="px-4 pt-4 pb-2 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">Edit PDF</h2>
            <p className="text-[10px] text-slate-400 mt-0.5">Tap a page&apos;s number to move it • Tap to select</p>
          </div>
          <span className="text-[10px] font-mono bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900 px-2 py-0.5 rounded-full font-bold">
            {totalPages} page{totalPages !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Persistent PdfEditor Component */}
      {wizardStep !== "SETTINGS" && wizardStep !== "PAYMENT" && (
        <div className="flex-1 min-h-0 px-4 pb-2">
          <div className="h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            <PdfEditor onFilesChange={handleFilesChange} />
          </div>
        </div>
      )}

      {/* EDIT step — bottom actions */}
      {wizardStep === "EDIT" && (
        <div className="px-4 py-3 flex gap-2 flex-shrink-0">
          <button
            onClick={() => {
              setStagedFiles([]);
              setStagedPages([]);
              setWizardStep("UPLOAD");
            }}
            className="flex-1 py-3 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl text-xs font-bold bg-white dark:bg-slate-900 shadow-sm"
          >
            ← Start Over
          </button>
          <button
            onClick={() => setWizardStep("SETTINGS")}
            disabled={totalPages === 0}
            className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-2xl text-xs font-bold shadow-md shadow-indigo-600/10"
          >
            Print Settings →
          </button>
        </div>
      )}

      {/* STEP 3: SETTINGS */}
      {wizardStep === "SETTINGS" && (
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-28 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900 dark:text-white">Print Settings</h2>
            <button onClick={() => setWizardStep("EDIT")} className="text-xs text-indigo-600 font-bold">
              ← Edit Pages
            </button>
          </div>

          {/* Document summary strip */}
          <div className="bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 rounded-3xl px-4 py-3.5 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider">PDF Pages</p>
              <p className="text-xl font-black text-slate-900 dark:text-white">{totalPages}</p>
            </div>
            <div className="h-8 w-px bg-indigo-200 dark:bg-indigo-800" />
            <div className="text-right">
              <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider">
                {printType === "double-sided" ? "Sheets (Duplex)" : "Sheets"}
              </p>
              <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">{sheetsCount}</p>
            </div>
            <div className="h-8 w-px bg-indigo-200 dark:bg-indigo-800" />
            <div className="text-right">
              <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider">Est. Cost</p>
              <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">₹{estimatedCost.toFixed(2)}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 space-y-4 shadow-sm">
            {/* Location */}
            <div className="space-y-1.5">
              <label className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">Printer Location</label>
              <div className="relative">
                <select
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white text-xs rounded-2xl px-3 py-3 pr-10 appearance-none focus:outline-none focus:border-indigo-500"
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
                <label className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">Copies</label>
                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-1 h-[42px]">
                  <button onClick={() => setCopies((c) => Math.max(1, c - 1))} className="w-7 h-7 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-white text-sm flex items-center justify-center font-bold shadow-sm">−</button>
                  <span className="text-slate-800 dark:text-white text-sm font-bold">{copies}</span>
                  <button onClick={() => setCopies((c) => Math.min(99, c + 1))} className="w-7 h-7 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-white text-sm flex items-center justify-center font-bold shadow-sm">+</button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">Color Mode</label>
                <div className="flex bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-1 h-[42px]">
                  <button onClick={() => setColorMode("BW")} className={`flex-1 rounded-xl text-[10px] font-bold transition-colors ${colorMode === "BW" ? "bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-sm" : "text-slate-400"}`}>B&amp;W</button>
                  <button onClick={() => setColorMode("COLOR")} className={`flex-1 rounded-xl text-[10px] font-bold transition-colors ${colorMode === "COLOR" ? "bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-sm" : "text-slate-400"}`}>Color</button>
                </div>
              </div>
            </div>

            {/* Layout */}
            <div className="space-y-1.5">
              <label className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">Print Layout</label>
              <div className="relative">
                <select
                  value={printType}
                  onChange={(e) => setPrintType(e.target.value as "single-sided" | "double-sided")}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white text-xs rounded-2xl px-3 py-3 pr-8 appearance-none focus:outline-none focus:border-indigo-500"
                >
                  <option value="single-sided">Single Sided</option>
                  <option value="double-sided">Duplex (Double Sided)</option>
                </select>
                <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2"><ChevronDownIcon /></div>
              </div>
            </div>

            {/* Payment Method - locked to Razorpay */}
            <div className="space-y-1.5">
              <label className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">Payment Mode</label>
              <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-2xl px-3 py-3">
                <span className="text-indigo-600 dark:text-indigo-400 text-sm">💳</span>
                <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 flex-1">Razorpay Gateway</span>
                <span className="text-[9px] font-bold uppercase bg-indigo-600 text-white px-2 py-0.5 rounded-full">UPI • Cards</span>
              </div>
            </div>

            {/* Cost Breakdown */}
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3 space-y-1.5 border border-slate-100 dark:border-slate-700">
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>PDF Pages:</span><span className="font-bold text-slate-700 dark:text-slate-300">{totalPages}</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>Physical Sheets:</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {sheetsCount}
                  {printType === "double-sided" && totalPages !== sheetsCount && (
                    <span className="ml-1 text-indigo-400 text-[9px]">(duplex)</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>Rate/Sheet:</span><span className="font-bold text-slate-700 dark:text-slate-300">₹{pricePerSheet.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>Copies:</span><span className="font-bold text-slate-700 dark:text-slate-300">×{copies}</span>
              </div>
              <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Total:</span>
                <span className="text-base font-black text-indigo-600 dark:text-indigo-400">₹{estimatedCost.toFixed(2)}</span>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-2xl p-3 text-[11px] font-mono">
                ⚠ {error}
              </div>
            )}

            <button
              onClick={() => setWizardStep("PAYMENT")}
              disabled={stagedFiles.length === 0 || totalPages === 0}
              className="w-full bg-indigo-600 text-white font-bold text-xs py-4 rounded-2xl hover:bg-indigo-500 transition-colors disabled:opacity-40 shadow-md shadow-indigo-600/10 flex items-center justify-center gap-1.5"
            >
              {`Proceed to Razorpay Payment (₹${estimatedCost.toFixed(2)}) →`}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: PAYMENT */}
      {wizardStep === "PAYMENT" && (
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-28 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900 dark:text-white">Pay &amp; Dispatch Job</h2>
            <button onClick={() => setWizardStep("SETTINGS")} className="text-xs text-indigo-600 font-bold">
              ← Print Settings
            </button>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-3xl p-3.5 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
            <span className="text-base">📢</span>
            <div>
              <p className="font-bold">Payment Required Before Dispatch</p>
              <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                Dispatch to print will happen automatically once your Razorpay payment is successful.
              </p>
            </div>
          </div>

          {/* Summary Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 space-y-3 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
              Print Order Summary
            </h3>
            <div className="flex justify-between items-start text-xs font-bold text-slate-800 dark:text-white">
              <span className="truncate max-w-[200px]">📄 {stagedFiles[0]?.fileName || "Print Document"}</span>
              <span className="font-mono text-indigo-600 dark:text-indigo-400 font-black text-base">₹{estimatedCost.toFixed(2)}</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1.5 font-mono pt-1">
              <div className="flex justify-between">
                <span>Pages &amp; Sheets:</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">{totalPages} pgs ({sheetsCount} sheets)</span>
              </div>
              <div className="flex justify-between">
                <span>Print Mode:</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">{colorMode} • {printType === "double-sided" ? "Duplex" : "Single Sided"}</span>
              </div>
              <div className="flex justify-between">
                <span>Target Hub:</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">{locations.find(l => l.id === selectedLocationId)?.name ?? "Campus Hub"}</span>
              </div>
            </div>
          </div>

          {/* Gateway Card */}
          <div className="bg-gradient-to-br from-indigo-50/80 to-slate-50 dark:from-indigo-950/40 dark:to-slate-900 border border-indigo-100 dark:border-indigo-900 rounded-3xl p-4 space-y-2 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white">Selected Gateway</span>
              <span className="bg-indigo-600 text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase font-mono">
                Razorpay
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Supports UPI (Google Pay, PhonePe, Paytm), Credit &amp; Debit Cards, NetBanking, and Wallets.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-2xl p-3 text-[11px] font-mono">
              ⚠ {error}
            </div>
          )}

          <button
            onClick={() => setIsRazorpayModalOpen(true)}
            disabled={submitting || compiling}
            className="w-full bg-indigo-600 text-white font-bold text-xs py-4 rounded-2xl hover:bg-indigo-500 transition-colors shadow-md shadow-indigo-600/10 flex items-center justify-center gap-2 uppercase tracking-wider"
          >
            {submitting || compiling ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {compiling ? "Compiling PDF…" : "Dispatching Job…"}
              </>
            ) : (
              <>
                <span>💳 Pay ₹{estimatedCost.toFixed(2)} with Razorpay</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Razorpay Gateway Modal */}
      <RazorpayPaymentModal
        isOpen={isRazorpayModalOpen}
        onClose={() => setIsRazorpayModalOpen(false)}
        amount={estimatedCost}
        jobDetails={{
          fileName: stagedFiles[0]?.fileName || "Print Document",
          pages: totalPages,
          copies,
          locationName: locations.find(l => l.id === selectedLocationId)?.name || "Campus Printer",
          colorMode,
          printType,
        }}
        onSuccess={async () => {
          setIsRazorpayModalOpen(false);
          await handleSubmit();
        }}
      />
    </div>
  );

  // ─── 3. Queue Tab Render ───────────────────────────────────────────────────

  const renderQueueTab = () => (
    <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 pb-28">
      <div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Active Print Queue</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Monitor your print jobs &amp; token collection numbers.</p>
      </div>

      {/* Dispatched Tokens Barcode / Cards */}
      {dispatchedTokens.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pickup Tokens</p>
          {dispatchedTokens.map((token, i) => (
            <div key={token} className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/60 dark:to-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-3xl p-4 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest font-mono">Token #{i + 1}</p>
                <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">Present token at printing station</p>
              </div>
              <div className="text-right font-mono">
                <span className="text-2xl font-black text-slate-900 dark:text-white bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-900 px-3 py-1 rounded-2xl shadow-inner inline-block">
                  #{token}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeJobs.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center space-y-2 shadow-sm">
          <div className="text-3xl">📭</div>
          <p className="text-slate-700 dark:text-slate-300 font-bold text-xs">No active print streams in queue</p>
          <p className="text-slate-400 text-[10px]">Upload a new file to place a print order.</p>
          <button onClick={() => setActiveTab("upload")} className="mt-2 text-xs bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold px-4 py-2.5 rounded-2xl">
            Start Printing →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {activeJobs.map((job) => (
            <div key={job.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 space-y-3 shadow-sm">
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 font-mono bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-900">
                    Token #{job.tokenNumber}
                  </span>
                  <p className="text-slate-900 dark:text-white text-xs font-bold font-mono mt-2 truncate max-w-[200px]">
                    {job.fileName}
                  </p>
                </div>
                <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full border uppercase ${STATUS_STYLE[job.status] ?? "bg-slate-50 text-slate-600 border-slate-200"}`}>
                  {job.status}
                </span>
              </div>

              {/* Progress Indicator */}
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                  style={{
                    width: job.status === "PRINTING" ? "70%" : job.status === "READY" ? "100%" : "30%"
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono pt-1">
                <span>{job.totalPages} pgs • ×{job.copies} copies • {job.colorMode}</span>
                <span className="text-slate-900 dark:text-white font-bold">₹{job.amount.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ─── 4. History Tab Render ─────────────────────────────────────────────────

  const renderHistoryTab = () => (
    <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 pb-28">
      <div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Print History</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">View and reprint past print jobs.</p>
      </div>

      {allJobs.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center space-y-2 shadow-sm">
          <div className="text-3xl">📜</div>
          <p className="text-slate-500 text-xs">No past print records found.</p>
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
                className={`bg-white dark:bg-slate-900 border rounded-3xl p-4 space-y-3 transition-all ${
                  isExpanded ? "border-indigo-300 dark:border-indigo-700 bg-indigo-50/20 dark:bg-indigo-950/20" : "border-slate-200/80 dark:border-slate-800 shadow-sm"
                } ${isWaiting ? "cursor-pointer active:scale-[0.99]" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 bg-indigo-50 dark:bg-indigo-950 border border-indigo-100 dark:border-indigo-900 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-[10px] font-black flex-shrink-0">
                      {job.colorMode === "COLOR" ? "CLR" : "B&W"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-slate-900 dark:text-white text-xs font-bold truncate max-w-[150px]">{job.fileName}</p>
                      <p className="text-slate-400 text-[10px] mt-0.5 font-mono">Token #{job.tokenNumber}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full border ${STATUS_STYLE[job.status] ?? "bg-slate-50 text-slate-600"}`}>
                      {job.status}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2 font-mono">
                  <span>{job.totalPages} pgs • ×{job.copies} {job.copies === 1 ? "copy" : "copies"}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-900 dark:text-white font-bold">₹{job.amount.toFixed(2)}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTab("upload");
                      }}
                      className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-lg border border-indigo-100 dark:border-indigo-900 hover:bg-indigo-600 hover:text-white transition-colors"
                    >
                      Re-print
                    </button>
                  </div>
                </div>

                {isExpanded && isWaiting && (
                  <div className="mt-1 rounded-2xl border border-indigo-100 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/40 px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest font-mono">Print Token</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">Present this at the print counter</p>
                    </div>
                    <p className="text-2xl font-black text-slate-900 dark:text-white font-mono">#{job.tokenNumber}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ─── 5. Profile Tab Render ─────────────────────────────────────────────────

  const renderProfileTab = () => (
    <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 pb-28">
      <div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Account &amp; Settings</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Manage preferences, wallet, and profile details.</p>
      </div>

      {/* User Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 flex items-center gap-3.5 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white font-black text-lg flex items-center justify-center shadow-md shadow-indigo-600/20 flex-shrink-0">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">{studentName}</h3>
          {userEmail && <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{userEmail}</p>}
          <span className="inline-block text-[9px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-900 mt-1">
            {admissionNumber ? `ID: #${admissionNumber}` : `Role: Student`}
          </span>
        </div>
      </div>

      {/* Wallet Overview Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-3xl p-4 flex items-center justify-between shadow-md">
        <div>
          <span className="text-[9px] uppercase tracking-wider font-bold text-indigo-300">Campus Wallet</span>
          <p className="text-xl font-black mt-0.5">₹{walletBalance.toFixed(2)}</p>
        </div>
        <button
          onClick={() => setShowTopUpModal(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-colors shadow-sm"
        >
          Top Up Wallet
        </button>
      </div>

      {/* Preferences Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 space-y-4 shadow-sm">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
          Preferences
        </h4>

        {/* Dark Mode Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
              🌙
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">Dark Appearance</p>
              <p className="text-[10px] text-slate-400">Switch theme aesthetics</p>
            </div>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`w-11 h-6 rounded-full p-1 transition-colors ${darkMode ? "bg-indigo-600" : "bg-slate-200"}`}
          >
            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${darkMode ? "translate-x-5" : "translate-x-0"}`} />
          </button>
        </div>

        {/* Notifications Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
              🔔
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">Print Status Alerts</p>
              <p className="text-[10px] text-slate-400">Get notified when print is ready</p>
            </div>
          </div>
          <button
            onClick={() => setNotificationsEnabled(!notificationsEnabled)}
            className={`w-11 h-6 rounded-full p-1 transition-colors ${notificationsEnabled ? "bg-indigo-600" : "bg-slate-200"}`}
          >
            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${notificationsEnabled ? "translate-x-5" : "translate-x-0"}`} />
          </button>
        </div>

        {/* Default Printer Station */}
        <div className="space-y-1.5 pt-1">
          <label className="text-xs font-bold text-slate-900 dark:text-white">Preferred Print Hub</label>
          <div className="relative">
            <select
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white text-xs rounded-2xl px-3 py-2.5 appearance-none focus:outline-none"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"><ChevronDownIcon /></div>
          </div>
        </div>
      </div>

      {/* Support & Logout */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-2 space-y-1 shadow-sm">
        <button className="w-full flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-2xl transition-colors text-xs font-bold text-slate-700 dark:text-slate-300">
          <span className="flex items-center gap-2"><span>❓</span> Help &amp; Support</span>
          <ChevronRightIcon />
        </button>
        <button className="w-full flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-2xl transition-colors text-xs font-bold text-slate-700 dark:text-slate-300">
          <span className="flex items-center gap-2"><span>📜</span> Terms &amp; Privacy Policy</span>
          <ChevronRightIcon />
        </button>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center justify-between p-3 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-2xl transition-colors text-xs font-bold text-rose-600"
        >
          <span className="flex items-center gap-2"><span>🚪</span> Sign Out</span>
          <ChevronRightIcon />
        </button>
      </div>
    </div>
  );

  // ─── Top-Up Modal ──────────────────────────────────────────────────────────

  const TopUpModal = () => (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-200">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-slate-900 dark:text-white">Top Up Campus Wallet</h3>
          <button onClick={() => setShowTopUpModal(false)} className="text-slate-400 text-lg font-bold">×</button>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">Select amount to add to your printing wallet.</p>

        <div className="grid grid-cols-3 gap-2">
          {[50, 100, 250].map((amt) => (
            <button
              key={amt}
              onClick={() => setTopUpAmount(amt)}
              className={`py-3 rounded-2xl font-bold text-xs border transition-all ${
                topUpAmount === amt
                  ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
              }`}
            >
              ₹{amt}
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            setWalletBalance((prev) => prev + topUpAmount);
            setShowTopUpModal(false);
          }}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-3.5 rounded-2xl shadow-md shadow-indigo-600/20 transition-all"
        >
          Add ₹{topUpAmount} via UPI
        </button>
      </div>
    </div>
  );

  // ─── Main Render Shell ─────────────────────────────────────────────────────

  return (
    <div className={`flex flex-col min-h-screen text-slate-800 antialiased transition-colors ${darkMode ? "dark bg-slate-950 text-slate-100" : "bg-[#F8F9FD]"}`}>
      
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 pt-safe-top py-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 flex-shrink-0">
            <Image 
              src="/logo.png" 
              alt="QDoc Logo" 
              width={42} 
              height={42} 
              className="object-contain p-0.5" 
            />
          </div>
          <div>
            <span className="text-slate-900 dark:text-white font-black text-base tracking-tight leading-none block">QDoc</span>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Campus Print</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <NotificationBell variant={darkMode ? "dark" : undefined} />
          <button
            onClick={() => setActiveTab("profile")}
            className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white font-bold text-xs flex items-center justify-center shadow-sm"
          >
            {initials}
          </button>
        </div>
      </div>

      {/* Content Area according to activeTab */}
      <div className="flex-1 flex flex-col min-h-0">
        {activeTab === "home"    && renderHomeTab()}
        {activeTab === "upload"  && renderUploadTab()}
        {activeTab === "queue"   && renderQueueTab()}
        {activeTab === "history" && renderHistoryTab()}
        {activeTab === "profile" && renderProfileTab()}
      </div>

      {/* Top Up Modal if open */}
      {showTopUpModal && <TopUpModal />}

      {/* 5-Tab Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 flex items-center justify-around pb-safe-bottom z-50 shadow-lg shadow-slate-200/50">
        {[
          { id: "home",    label: "Home",    Icon: HomeIcon,       badge: undefined },
          { id: "upload",  label: "Upload",  Icon: UploadTabIcon,  badge: undefined },
          { id: "queue",   label: "Queue",   Icon: QueueIcon,       badge: activeJobs.length > 0 ? activeJobs.length : undefined },
          { id: "history", label: "History", Icon: HistoryTabIcon, badge: undefined },
          { id: "profile", label: "Profile", Icon: ProfileIcon,    badge: undefined },
        ].map(({ id, label, Icon, badge }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id as typeof activeTab)}
              className={`flex flex-col items-center gap-0.5 py-2.5 transition-all relative w-14 ${
                active ? "text-indigo-600 dark:text-indigo-400 font-bold scale-105" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              }`}
            >
              <div className="relative">
                <Icon active={active} />
                {badge !== undefined && (
                  <span className="absolute -top-1 -right-1.5 w-3.5 h-3.5 bg-indigo-600 text-white text-[8px] font-bold rounded-full flex items-center justify-center border border-white">
                    {badge}
                  </span>
                )}
              </div>
              <span className="text-[9px] tracking-tight">{label}</span>
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}