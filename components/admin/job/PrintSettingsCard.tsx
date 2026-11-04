"use client";

import React from "react";
import { Settings, Printer, Palette, Layers, FileText } from "lucide-react";

interface PrintSettingsCardProps {
  selectedPrinter?: string | null;
  colorMode: string;
  printType: string;
  totalPages: number;
  copies: number;
  onPrinterTileClick?: () => void;
  className?: string;
}

export default function PrintSettingsCard({
  selectedPrinter,
  colorMode,
  printType,
  totalPages,
  copies,
  onPrinterTileClick,
  className = "",
}: PrintSettingsCardProps) {
  const isColor = colorMode?.toUpperCase() === "COLOR";
  const isDouble =
    printType?.toUpperCase() === "DOUBLE" ||
    printType?.toLowerCase().includes("double");

  const printerDisplay = selectedPrinter?.trim() || "Not selected";
  const colorDisplay = isColor ? "Color" : "Black & White";
  const sidesDisplay = isDouble ? "Double sided" : "Single sided";
  const pagesDisplay = `${totalPages} × ${copies}`;

  return (
    <div
      className={`bg-white rounded-[16px] border border-slate-200/80 p-5 shadow-sm ${className}`}
    >
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
        <Settings className="w-5 h-5 text-indigo-600" />
        <h2 className="text-base font-bold text-slate-900 tracking-tight">
          Print Settings
        </h2>
      </div>

      {/* ── 4 Tiles in a row ──────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* 1. Printer Tile */}
        <button
          type="button"
          onClick={onPrinterTileClick}
          className="bg-slate-50/80 hover:bg-slate-100/80 border border-slate-100 rounded-xl p-3 flex flex-col items-center justify-center text-center transition-colors group cursor-pointer"
          title="Click to select target printer"
        >
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
            <Printer className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-medium text-slate-400">Printer</span>
          <span className="text-xs sm:text-sm font-bold text-slate-900 truncate max-w-full">
            {printerDisplay}
          </span>
        </button>

        {/* 2. Color Tile */}
        <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-3 flex flex-col items-center justify-center text-center">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1.5">
            <Palette className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-medium text-slate-400">Color</span>
          <span className="text-xs sm:text-sm font-bold text-slate-900 truncate max-w-full">
            {colorDisplay}
          </span>
        </div>

        {/* 3. Sides Tile */}
        <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-3 flex flex-col items-center justify-center text-center">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-1.5">
            <Layers className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-medium text-slate-400">Sides</span>
          <span className="text-xs sm:text-sm font-bold text-slate-900 truncate max-w-full">
            {sidesDisplay}
          </span>
        </div>

        {/* 4. Pages Tile */}
        <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-3 flex flex-col items-center justify-center text-center">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-1.5">
            <FileText className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-medium text-slate-400">Pages</span>
          <span className="text-xs sm:text-sm font-bold text-slate-900 truncate max-w-full tabular-nums">
            {pagesDisplay}
          </span>
        </div>
      </div>
    </div>
  );
}
