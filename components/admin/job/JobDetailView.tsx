"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowLeft, AlertCircle, RefreshCw, ShieldAlert, FileQuestion } from "lucide-react";
import JobHeader from "./JobHeader";
import PdfPreviewCard from "./PdfPreviewCard";
import StudentCard from "./StudentCard";
import PrintSettingsCard from "./PrintSettingsCard";
import PaymentCard from "./PaymentCard";
import JobTimeline from "./JobTimeline";
import JobActionBar from "./JobActionBar";
import { usePrinter } from "@/lib/hooks/usePrinter";
import type { PublicPrintJob } from "@/lib/mappers";

interface JobDetailViewProps {
  jobId: string;
  initialJob?: any;
  initialStudent?: any;
  className?: string;
}

export default function JobDetailView({
  jobId,
  initialJob,
  initialStudent,
  className = "",
}: JobDetailViewProps) {
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";

  const [job, setJob] = useState<any>(initialJob || null);
  const [student, setStudent] = useState<any>(initialStudent || null);
  const [loading, setLoading] = useState(!initialJob);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [base64File, setBase64File] = useState<string | null>(null);
  const [isPrinterPopoverOpen, setIsPrinterPopoverOpen] = useState(false);

  // Printer Daemon Hook
  const {
    connectionStatus,
    printers,
    targetPrinter,
    setTargetPrinter,
    printFile,
    reconnect,
  } = usePrinter();

  // 1. Fetch Job from /api/admin/jobs/[id]
  const fetchJob = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}`);
      if (!res.ok) {
        setErrorStatus(res.status);
        const errJson = await res.json().catch(() => ({}));
        setErrorMessage(
          errJson.error ||
            (res.status === 403
              ? "This job belongs to a different location"
              : res.status === 404
              ? "Job not found"
              : "Failed to load job")
        );
        setLoading(false);
        return;
      }

      const data = await res.json();
      setJob(data.job);
      setErrorStatus(null);
      setErrorMessage(null);
      setLoading(false);

      // If student info is missing, fetch student details
      if (data.job?.studentId && !student?.department) {
        fetch(`/api/admin/students/${data.job.studentId}`)
          .then((sRes) => (sRes.ok ? sRes.json() : null))
          .then((sData) => {
            if (sData?.student) {
              setStudent(sData.student);
            }
          })
          .catch(() => {});
      }
    } catch (err: unknown) {
      console.error("[JobDetailView] Fetch error:", err);
      setErrorStatus(500);
      setErrorMessage(err instanceof Error ? err.message : "Network error");
      setLoading(false);
    }
  }, [jobId, student?.department]);

  // Initial load
  useEffect(() => {
    if (!initialJob) {
      fetchJob();
    } else if (initialJob.studentId && !initialStudent) {
      fetch(`/api/admin/students/${initialJob.studentId}`)
        .then((sRes) => (sRes.ok ? sRes.json() : null))
        .then((sData) => {
          if (sData?.student) {
            setStudent(sData.student);
          }
        })
        .catch(() => {});
    }
  }, [fetchJob, initialJob, initialStudent]);

  // Realtime refresh every 10s while status is WAITING or PRINTING
  useEffect(() => {
    if (!job) return;
    const s = job.status?.toUpperCase();
    if (s === "WAITING" || s === "PRINTING") {
      const interval = setInterval(() => {
        fetchJob();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [job, fetchJob]);

  // File retriever for print action
  const getBase64File = useCallback(async (): Promise<string> => {
    if (base64File) return base64File;

    const res = await fetch(`/api/admin/jobs/${jobId}/file`);
    if (!res.ok) {
      throw new Error(`Failed to download file (HTTP ${res.status})`);
    }

    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const json = await res.json();
      if (json.base64Data) {
        setBase64File(json.base64Data);
        return json.base64Data;
      }
    }

    const blob = await res.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const b64 = result.includes(",") ? result.split(",")[1] : result;
        setBase64File(b64);
        resolve(b64);
      };
      reader.onerror = () => reject(new Error("Failed to read file into memory."));
      reader.readAsDataURL(blob);
    });
  }, [jobId, base64File]);

  // ── 404 Not Found State ──────────────────────────────────────────
  if (errorStatus === 404) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-4">
          <FileQuestion className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Job Not Found</h2>
        <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
          The requested print job could not be found or may have been deleted.
        </p>
        <div className="mt-6">
          <Link
            href="/admin/queue"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Queue</span>
          </Link>
        </div>
      </div>
    );
  }

  // ── 403 Forbidden / Location Scoping State ───────────────────────
  if (errorStatus === 403) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
        <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
          {errorMessage || "This job belongs to a different location."}
        </p>
        <div className="mt-6">
          <Link
            href="/admin/queue"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Queue</span>
          </Link>
        </div>
      </div>
    );
  }

  // ── Network Error Banner ─────────────────────────────────────────
  if (errorStatus && !job) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center space-y-4">
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-rose-800 text-sm">
          <AlertCircle className="w-8 h-8 text-rose-600 mx-auto mb-2" />
          <p className="font-bold">Could not load job overview</p>
          <p className="text-xs text-rose-600 mt-1">{errorMessage}</p>
          <button
            type="button"
            onClick={fetchJob}
            className="mt-4 px-4 py-2 rounded-xl bg-white border border-rose-200 text-rose-700 font-semibold text-xs inline-flex items-center gap-1.5 hover:bg-rose-100/50 shadow-xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  // ── Loading Skeleton ─────────────────────────────────────────────
  if (loading || !job) {
    return (
      <div className="space-y-6 pb-20 animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-28" />
        <div className="h-10 bg-slate-200 rounded-xl w-64" />
        <div className="flex flex-col lg:flex-row gap-5">
          <div className="w-full lg:w-[58%] h-[560px] bg-slate-200 rounded-[16px]" />
          <div className="w-full lg:w-[42%] space-y-5">
            <div className="h-32 bg-slate-200 rounded-[16px]" />
            <div className="h-28 bg-slate-200 rounded-[16px]" />
            <div className="h-28 bg-slate-200 rounded-[16px]" />
            <div className="h-48 bg-slate-200 rounded-[16px]" />
          </div>
        </div>
      </div>
    );
  }

  // ── Loaded View Matching Attached Screenshot ─────────────────────
  return (
    <div className={`space-y-5 pb-6 animate-in fade-in duration-200 ${className}`}>
      {/* ── Page Header ────────────────────────────────────────── */}
      <JobHeader
        tokenNumber={job.tokenNumber}
        status={job.status}
        colorMode={job.colorMode}
        printType={job.printType}
        createdAt={job.createdAt}
      />

      {/* ── Main Two Columns Layout (~58% / ~42%, gap 20) ──────── */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* LEFT COLUMN (~58%): Print Preview Card */}
        <div className="w-full lg:w-[58%] flex flex-col">
          <PdfPreviewCard
            jobId={job.id}
            fileName={job.fileName}
            totalPages={job.totalPages}
            isSuperAdmin={isSuperAdmin}
            isFileDeleted={!!job.fileDeletedAt}
            onFileDeleted={fetchJob}
            onBase64Loaded={(b64) => setBase64File(b64)}
            className="w-full"
          />
        </div>

        {/* RIGHT COLUMN (~42%): Stacked Detail Cards */}
        <div className="w-full lg:w-[42%] flex flex-col gap-4">
          {/* 1. Student Details */}
          <StudentCard
            studentId={job.studentId}
            studentName={job.studentName}
            admissionNumber={job.admissionNumber}
            department={student?.department || job.department}
            semester={student?.semester || job.semester}
          />

          {/* 2. Print Settings */}
          <PrintSettingsCard
            selectedPrinter={targetPrinter}
            colorMode={job.colorMode}
            printType={job.printType}
            totalPages={job.totalPages}
            copies={job.copies}
            onPrinterTileClick={() => setIsPrinterPopoverOpen(!isPrinterPopoverOpen)}
          />

          {/* 3. Payment & Amount */}
          <PaymentCard
            jobId={job.id}
            amount={job.amount}
            paymentStatus={job.paymentStatus}
            paymentMethod={job.paymentMethod}
            paidAt={job.paidAt}
            createdAt={job.createdAt}
            onPaymentChanged={fetchJob}
          />

          {/* 4. Job Timeline */}
          <JobTimeline
            jobId={job.id}
            status={job.status}
            paymentStatus={job.paymentStatus}
            studentName={job.studentName}
            createdAt={job.createdAt}
            paymentMethod={job.paymentMethod}
            paidAt={job.paidAt}
            startedAt={job.startedAt}
            readyAt={job.readyAt}
            collectedAt={job.collectedAt}
            cancelledAt={job.cancelledAt}
          />
        </div>
      </div>

      {/* ── BOTTOM ACTION BAR (sticky, white, 4 equal buttons) ─── */}
      <JobActionBar
        jobId={job.id}
        tokenNumber={job.tokenNumber}
        status={job.status}
        paymentStatus={job.paymentStatus}
        copies={job.copies}
        printType={job.printType}
        connectionStatus={connectionStatus}
        printers={printers}
        targetPrinter={targetPrinter}
        setTargetPrinter={setTargetPrinter}
        reconnectDaemon={reconnect}
        getBase64File={getBase64File}
        printFile={printFile}
        onActionSuccess={() => fetchJob()}
        isPrinterPopoverOpen={isPrinterPopoverOpen}
        setIsPrinterPopoverOpen={setIsPrinterPopoverOpen}
      />
    </div>
  );
}
