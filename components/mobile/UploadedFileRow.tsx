"use client";

import React from "react";
import { FileText, FileSpreadsheet, X } from "lucide-react";

export interface UploadedFileItem {
  id: string;
  name: string;
  sizeBytes: number;
  pageCount: number;
  uploadProgress?: number; // 0 to 100, undefined if finished
  isUploading?: boolean;
  type?: string;
}

interface UploadedFileRowProps {
  file: UploadedFileItem;
  onRemove: (id: string) => void;
  className?: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export default function UploadedFileRow({
  file,
  onRemove,
  className = "",
}: UploadedFileRowProps) {
  const isPdf =
    file.name.toLowerCase().endsWith(".pdf") ||
    file.type === "application/pdf";

  return (
    <div
      className={`w-full bg-white rounded-2xl border border-slate-200/90 p-3 shadow-xs transition-all ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        {/* File Type Icon */}
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-bold text-[11px] uppercase shadow-xs ${
            isPdf
              ? "bg-rose-500 shadow-rose-500/20"
              : "bg-blue-600 shadow-blue-600/20"
          }`}
        >
          {isPdf ? (
            <FileText className="w-5 h-5 text-white stroke-[2]" />
          ) : (
            <FileSpreadsheet className="w-5 h-5 text-white stroke-[2]" />
          )}
        </div>

        {/* File Info */}
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-bold text-[#0F172A] truncate">
            {file.name}
          </p>
          <p className="text-[11px] text-slate-500 font-medium">
            {file.pageCount > 0 ? `${file.pageCount} pages • ` : ""}
            {formatBytes(file.sizeBytes)}
          </p>
        </div>

        {/* Remove Button */}
        <button
          type="button"
          onClick={() => onRemove(file.id)}
          className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          aria-label={`Remove ${file.name}`}
        >
          <X className="w-4 h-4 stroke-[2.2]" />
        </button>
      </div>

      {/* Uploading Progress Bar */}
      {file.isUploading && file.uploadProgress !== undefined && (
        <div className="mt-2.5 space-y-1">
          <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all duration-300"
              style={{ width: `${file.uploadProgress}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 text-right font-mono">
            {file.uploadProgress}%
          </p>
        </div>
      )}
    </div>
  );
}
