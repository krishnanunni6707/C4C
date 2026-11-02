"use client";

import React, { useState } from "react";
import Image from "next/image";
import QRCode from "react-qr-code";
import {
  Printer,
  Share2,
  ArrowLeft,
  X,
  FileText,
  Palette,
  MapPin,
  Clock,
  Check,
  CheckCircle2,
} from "lucide-react";
import type { PrintJob } from "@/app/student/page";

interface TokenSlipTicketProps {
  job: Partial<PrintJob> & {
    tokenNumber: string;
    fileName: string;
    amount: number;
  };
  locationName?: string;
  createdAtText?: string;
  onBack?: () => void;
  onClose?: () => void;
  className?: string;
}

export default function TokenSlipTicket({
  job,
  locationName = "Main Print Room",
  createdAtText = "Oct 28, 10:24 AM",
  onBack,
  onClose,
  className = "",
}: TokenSlipTicketProps) {
  const [copied, setCopied] = useState(false);

  const qrValue =
    typeof window !== "undefined"
      ? `${window.location.origin}/student/token-slip/${job.id || job.tokenNumber}`
      : `token:${job.tokenNumber}`;

  const pagesText = `${job.totalPages || 24} pages • ${
    job.copies || 1
  } cop${(job.copies || 1) === 1 ? "y" : "ies"}`;

  const colorModeText =
    job.colorMode === "BW" ? "Black & White" : "Color";
  const printSidesText =
    job.printType === "single-sided" || job.printType === "SINGLE"
      ? "Single sided"
      : "Double sided";

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `QDoc Token #${job.tokenNumber}`,
          text: `Here is my print token #${job.tokenNumber} for ${job.fileName}`,
          url: qrValue,
        });
        return;
      } catch {
        // user cancelled or share failed, fallback to copy
      }
    }

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(qrValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={`w-full max-w-[400px] mx-auto p-2 sm:p-4 space-y-4 ${className}`}>
      {/* Ticket Card with decorative scalloped notch styling */}
      <div className="relative bg-white rounded-3xl shadow-xl border border-slate-200/90 p-6 space-y-4 overflow-hidden">
        {/* Scalloped edge decorative background / notch styling */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-700" />

        {/* Top Header: Logo + Campus Print & Close X */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <Image
                src="/logo-new-updated-original.png"
                alt="QDoc"
                width={85}
                height={26}
                className="h-6 w-auto object-contain"
              />
            </div>
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider pl-0.5">
              Campus Print
            </span>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Close token slip"
            >
              <X className="w-5 h-5 stroke-[2]" />
            </button>
          )}
        </div>

        {/* Giant Mono Token in Pale Box */}
        <div className="w-full bg-indigo-50/70 border border-indigo-100 rounded-2xl py-3 px-4 text-center">
          <span className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] font-mono tracking-wider block">
            {job.tokenNumber}
          </span>
        </div>

        {/* QR Code Container */}
        <div className="flex flex-col items-center justify-center py-1">
          <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs">
            <QRCode
              value={qrValue}
              size={140}
              style={{ height: "auto", maxWidth: "100%", width: "100%" }}
              viewBox={`0 0 140 140`}
            />
          </div>
        </div>

        {/* Details Rows */}
        <div className="space-y-3 pt-1 text-xs">
          {/* File Row */}
          <div className="flex items-start gap-2.5 text-slate-700">
            <FileText className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="font-bold text-[#0F172A] truncate">
                {job.fileName}
              </p>
              <p className="text-slate-400 font-medium">{pagesText}</p>
            </div>
          </div>

          {/* Color & Sides Row */}
          <div className="flex items-center gap-2.5 text-slate-700">
            <Palette className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span className="font-medium">
              {colorModeText} • {printSidesText}
            </span>
          </div>

          {/* Green PAID Badge Box */}
          <div className="bg-emerald-50 border border-emerald-200/70 rounded-xl px-4 py-2.5 flex items-center justify-between text-emerald-800">
            <div className="flex items-center gap-1.5 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>PAID</span>
            </div>
            <span className="font-mono font-extrabold text-sm text-emerald-900">
              ₹{(job.amount || 68).toFixed(2)}
            </span>
          </div>

          {/* Location Row */}
          <div className="flex items-center gap-2.5 text-slate-600">
            <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span>{locationName}</span>
          </div>

          {/* Timestamp Row */}
          <div className="flex items-center gap-2.5 text-slate-600">
            <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span>{createdAtText}</span>
          </div>

          {/* Live Status Pill */}
          <div className="pt-2 flex items-center justify-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
              {job.status === "READY"
                ? "Ready for collection"
                : job.status === "COLLECTED"
                ? "Collected"
                : "Printing"}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Three Action Buttons: Print, Share, Back */}
      <div className="grid grid-cols-3 gap-2.5 pt-1 no-print">
        {/* Print Button */}
        <button
          type="button"
          onClick={handlePrint}
          className="min-h-[44px] rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <Printer className="w-4 h-4" />
          <span>Print</span>
        </button>

        {/* Share Button */}
        <button
          type="button"
          onClick={handleShare}
          className="min-h-[44px] rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-600" />
              <span className="text-emerald-600">Copied!</span>
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </>
          )}
        </button>

        {/* Back Button */}
        <button
          type="button"
          onClick={onBack || onClose}
          className="min-h-[44px] rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
      </div>

      {/* Print-only CSS */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0; padding: 10px; }
        }
      `}</style>
    </div>
  );
}
