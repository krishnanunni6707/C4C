"use client";

import React from "react";
import Link from "next/link";
import QRCode from "react-qr-code";
import {
  Printer,
  Users,
  Clock,
  FileText,
  Check,
  Sparkles,
} from "lucide-react";
import type { PrintJob } from "@/app/student/page";

interface ActiveJobCardProps {
  job: PrintJob;
  queuePosition?: number;
  estWaitMinutes?: number;
  onOpenTokenSlip?: (jobId: string) => void;
  className?: string;
}

export default function ActiveJobCard({
  job,
  queuePosition = 2,
  estWaitMinutes = 3,
  onOpenTokenSlip,
  className = "",
}: ActiveJobCardProps) {
  const isPrinting = job.status === "PRINTING";
  const isReady = job.status === "READY";
  const isWaiting = job.status === "WAITING";

  const colorModeLabel = job.colorMode === "COLOR" ? "Color" : "B/W";
  const printTypeLabel =
    job.printType === "double-sided" || job.printType === "DOUBLE"
      ? "Double sided"
      : "Single sided";

  const metaText = `${job.totalPages || 24} pages • ${colorModeLabel} • ${printTypeLabel}`;

  const qrValue =
    typeof window !== "undefined"
      ? `${window.location.origin}/student/token-slip/${job.id}`
      : `token:${job.tokenNumber}:${job.id}`;

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* Top Illustration Card */}
      <div className="w-full bg-indigo-50/70 border border-indigo-100 rounded-2xl p-3.5 flex flex-col items-center justify-center text-center relative overflow-hidden">
        {/* Decorative soft glow circles */}
        <div className="absolute -top-8 -right-8 w-20 h-20 bg-indigo-200/40 rounded-full blur-xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-20 h-20 bg-blue-200/40 rounded-full blur-xl pointer-events-none" />

        {/* Printer & Document Illustration */}
        <div className="relative w-20 h-16 flex items-center justify-center mb-2">
          {/* Printer Body */}
          <div className="w-16 h-11 bg-white rounded-xl shadow-md border border-indigo-100 flex flex-col items-center justify-center p-1.5 relative z-10">
            {/* Top paper slot */}
            <div className="w-10 h-1 bg-indigo-200 rounded-full mb-1" />
            {/* Front status light and button */}
            <div className="flex items-center gap-1 w-full px-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <div className="flex-1 h-1 bg-slate-100 rounded-full" />
            </div>
          </div>
          {/* Paper emerging */}
          <div className="absolute -top-1 w-11 h-6 bg-indigo-100/90 border border-indigo-200 rounded-t-lg z-0 animate-bounce duration-1000 flex items-center justify-center">
            <div className="w-6 h-0.5 bg-indigo-300 rounded-full" />
          </div>
        </div>

        {/* Live Status Pill */}
        <div className="mb-1.5">
          {isReady ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Ready for collection
            </span>
          ) : isPrinting ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-700">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping" />
              Printing
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Waiting in Queue
            </span>
          )}
        </div>

        {/* Huge Token Number */}
        <h2 className="text-3xl font-extrabold text-[#0F172A] font-mono tracking-wider">
          {job.tokenNumber}
        </h2>

        {/* File Name & Meta */}
        <p className="text-xs font-bold text-[#0F172A] mt-0.5 truncate max-w-[280px]">
          {job.fileName}
        </p>
        <p className="text-[11px] text-slate-500 font-medium mt-0.5">{metaText}</p>
      </div>

      {/* 3-Step Tracker Card */}
      <div className="w-full bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
        <div className="flex items-center justify-between relative px-4">
          {/* Connecting Line */}
          <div className="absolute top-3.5 left-8 right-8 h-[2px] bg-slate-200 z-0">
            <div
              className="h-full bg-indigo-600 transition-all duration-500"
              style={{
                width: isReady ? "100%" : isPrinting ? "50%" : "0%",
              }}
            />
          </div>

          {/* Step 1: Waiting */}
          <div className="flex flex-col items-center relative z-10">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                !isWaiting
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-indigo-600 text-white ring-4 ring-indigo-100"
              }`}
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
            <span
              className={`text-[10px] mt-1.5 font-semibold ${
                !isWaiting ? "text-indigo-600 font-bold" : "text-slate-700"
              }`}
            >
              Waiting
            </span>
          </div>

          {/* Step 2: Printing */}
          <div className="flex flex-col items-center relative z-10">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                isReady
                  ? "bg-indigo-600 text-white"
                  : isPrinting
                  ? "bg-indigo-600 text-white ring-4 ring-indigo-100 shadow-xs"
                  : "bg-white border-2 border-slate-300 text-slate-400"
              }`}
            >
              {isReady ? (
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              ) : (
                <Printer className="w-3.5 h-3.5 text-white" />
              )}
            </div>
            <span
              className={`text-[10px] mt-1.5 font-semibold ${
                isPrinting
                  ? "text-indigo-600 font-bold"
                  : isReady
                  ? "text-slate-700"
                  : "text-slate-400"
              }`}
            >
              Printing
            </span>
          </div>

          {/* Step 3: Ready */}
          <div className="flex flex-col items-center relative z-10">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                isReady
                  ? "bg-emerald-600 text-white ring-4 ring-emerald-100 shadow-xs"
                  : "bg-white border-2 border-slate-300 text-slate-400"
              }`}
            >
              {isReady ? (
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              ) : (
                <Sparkles className="w-3 h-3 text-slate-400" />
              )}
            </div>
            <span
              className={`text-[10px] mt-1.5 font-semibold ${
                isReady ? "text-emerald-600 font-bold" : "text-slate-400"
              }`}
            >
              Ready
            </span>
          </div>
        </div>
      </div>

      {/* Two Stat Boxes: Queue Position & Est. Wait */}
      <div className="grid grid-cols-2 gap-3">
        {/* Queue Position */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
            <Users className="w-5 h-5 stroke-[2]" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-medium leading-tight">
              Queue Position
            </p>
            <p className="text-sm font-bold text-[#0F172A] mt-0.5">
              #{queuePosition} in line
            </p>
          </div>
        </div>

        {/* Est. Wait */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
            <Clock className="w-5 h-5 stroke-[2]" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-medium leading-tight">
              Est. Wait
            </p>
            <p className="text-sm font-bold text-[#0F172A] mt-0.5">
              ~{estWaitMinutes} min
            </p>
          </div>
        </div>
      </div>

      {/* QR Code Container */}
      <div className="w-full bg-white rounded-2xl border border-slate-200/90 p-3.5 flex flex-col items-center justify-center shadow-xs">
        <div className="p-2 bg-white rounded-xl border border-slate-100">
          <QRCode
            value={qrValue}
            size={96}
            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
            viewBox={`0 0 96 96`}
          />
        </div>
      </div>

      {/* Open Token Slip Button */}
      <div className="pt-0.5">
        {onOpenTokenSlip ? (
          <button
            type="button"
            onClick={() => onOpenTokenSlip(job.id)}
            className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <FileText className="w-4 h-4" />
            <span>Open token slip</span>
          </button>
        ) : (
          <Link
            href={`/student/token-slip/${job.id}`}
            className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <FileText className="w-4 h-4" />
            <span>Open token slip</span>
          </Link>
        )}
      </div>
    </div>
  );
}
