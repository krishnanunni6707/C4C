"use client";

import React, { useState, useRef, useEffect } from "react";
import { CheckCircle2, MoreVertical, Trash2, Eye } from "lucide-react";
import FileTypeBadge from "./FileTypeBadge";
import type { ManagedPdfFile } from "../PdfEditor";

interface UploadedFileRowProps {
  file: ManagedPdfFile;
  progress?: number; // 0 to 100
  onRemove: (fileId: string) => void;
  onPreview?: (fileId: string) => void;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const val = parseFloat((bytes / Math.pow(k, i)).toFixed(1));
  return `${val} ${sizes[i]}`;
}

export default function UploadedFileRow({
  file,
  progress = 100,
  onRemove,
  onPreview,
}: UploadedFileRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close kebab menu on outside click or Escape
  useEffect(() => {
    if (!menuOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  const pageCountText = `${file.isNonPdfDoc ? "~" : ""}${file.totalOriginalPages} pages`;
  const isComplete = progress >= 100;

  return (
    <div className="bg-white border border-slate-200/90 rounded-[10px] h-[76px] px-4 sm:px-5 flex items-center justify-between gap-4 transition-all hover:border-slate-300 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      {/* Left: Badge + File Name & Metadata */}
      <div className="flex items-center gap-3.5 min-w-0 flex-1 max-w-[45%]">
        <FileTypeBadge fileName={file.fileName} fileType={file.fileType} />
        <div className="min-w-0 flex-1">
          <p
            className="text-[15px] font-semibold text-[#0F172A] truncate"
            title={file.fileName}
          >
            {file.fileName}
          </p>
          <p className="text-[13px] text-slate-500 font-normal truncate mt-0.5">
            {pageCountText} • {formatBytes(file.fileSize)}
          </p>
        </div>
      </div>

      {/* Middle: Progress Bar and Status */}
      <div className="flex-1 max-w-[280px] hidden sm:flex flex-col gap-1.5 px-2">
        <div className="flex items-center gap-1.5 text-[13px] text-slate-600 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <span>Uploaded</span>
        </div>
        <div className="flex items-center gap-3">
          <div
            className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Upload progress for ${file.fileName}`}
          >
            <div
              className="h-full bg-indigo-600 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
          <span className="text-xs font-medium text-slate-500 font-mono w-9 text-right flex-shrink-0">
            {Math.round(progress)}%
          </span>
        </div>
      </div>

      {/* Right: Kebab Menu */}
      <div className="relative flex-shrink-0" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          aria-label="File actions"
          aria-expanded={menuOpen}
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-1.5 w-36 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-30 animate-in fade-in zoom-in-95 duration-150">
            {onPreview && !file.isNonPdfDoc && (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onPreview(file.id);
                }}
                className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <Eye className="w-3.5 h-3.5 text-slate-400" />
                <span>Preview</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onRemove(file.id);
              }}
              className="w-full px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span>Remove</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
