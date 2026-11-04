"use client";

import React from "react";
import {
  Printer,
  Palette,
  Layers,
  Hourglass,
  CheckCircle2,
  XCircle,
  FileText,
} from "lucide-react";

export type StatusChipType =
  | "status"
  | "colorMode"
  | "sides"
  | "paperSize";

interface StatusChipProps {
  type: StatusChipType;
  value: string;
  className?: string;
}

export default function StatusChip({ type, value, className = "" }: StatusChipProps) {
  if (type === "status") {
    const s = value.toUpperCase();
    if (s === "PRINTING") {
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100/80 ${className}`}
        >
          <Printer className="w-3.5 h-3.5 text-indigo-600" />
          <span>Printing</span>
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
        </span>
      );
    }
    if (s === "WAITING") {
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/60 ${className}`}
        >
          <Hourglass className="w-3.5 h-3.5 text-amber-600" />
          <span>Waiting</span>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        </span>
      );
    }
    if (s === "READY") {
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 ${className}`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Ready</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        </span>
      );
    }
    if (s === "COLLECTED") {
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 ${className}`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
          <span>Collected</span>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
        </span>
      );
    }
    if (s === "CANCELLED") {
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/60 ${className}`}
        >
          <XCircle className="w-3.5 h-3.5 text-rose-600" />
          <span>Cancelled</span>
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
        </span>
      );
    }
  }

  if (type === "colorMode") {
    const isColor = value.toUpperCase() === "COLOR";
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
          isColor
            ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
            : "bg-slate-100 text-slate-700 border border-slate-200"
        } ${className}`}
      >
        <Palette className="w-3.5 h-3.5" />
        <span>{isColor ? "Color" : "B/W"}</span>
      </span>
    );
  }

  if (type === "sides") {
    const isDouble = value.toUpperCase() === "DOUBLE" || value.toLowerCase().includes("double");
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
          isDouble
            ? "bg-indigo-50 text-indigo-700 border border-indigo-100/80"
            : "bg-slate-100 text-slate-700 border border-slate-200"
        } ${className}`}
      >
        <Layers className="w-3.5 h-3.5" />
        <span>{isDouble ? "Double sided" : "Single sided"}</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 ${className}`}
    >
      <FileText className="w-3.5 h-3.5" />
      <span>{value}</span>
    </span>
  );
}
