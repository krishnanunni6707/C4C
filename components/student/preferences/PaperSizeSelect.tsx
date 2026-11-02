"use client";

import React from "react";
import { FileText, ChevronDown } from "lucide-react";

export interface PaperSizeSelectProps {
  value: string;
  onChange?: (size: "A4") => void;
  disabled?: boolean;
}

export default function PaperSizeSelect({
  value = "A4",
  onChange,
  disabled = false,
}: PaperSizeSelectProps) {
  return (
    <div className="relative w-full">
      {/* Visual Presentation Container */}
      <div className="w-full flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-xs transition-colors pointer-events-none">
        <div className="flex items-center gap-3">
          <FileText className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-medium text-[#0F172A]">
            A4 (210 × 297 mm)
          </span>
        </div>
        <ChevronDown className="w-4 h-4 text-slate-400" />
      </div>

      {/* Accessible native select overlay (currently only A4, ready for future expansion) */}
      <select
        id="paper-size-select"
        value={value}
        onChange={(e) => onChange?.(e.target.value as "A4")}
        disabled={disabled}
        aria-label="Paper Size"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
      >
        <option value="A4">A4 (210 × 297 mm)</option>
      </select>
    </div>
  );
}
