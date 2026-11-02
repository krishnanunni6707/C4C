"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, FileText } from "lucide-react";
import type { ManagedPdfFile } from "../PdfEditor";

export interface FileHeaderProps {
  files: ManagedPdfFile[];
  activeFileId?: string;
  onSelectFile?: (fileId: string) => void;
  totalPageCount: number;
}

function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return "0 KB";
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.round(bytes / 1024)} KB`;
}

export default function FileHeader({
  files,
  activeFileId,
  onSelectFile,
  totalPageCount,
}: FileHeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentFile =
    files.find((f) => f.id === activeFileId) ||
    files[0] || {
      id: "default",
      fileName: "Operating_Systems_Notes.pdf",
      fileSize: 2.8 * 1024 * 1024,
      totalOriginalPages: 24,
      keptPageIndices: Array.from({ length: 24 }, (_, i) => i),
      rawBytes: new Uint8Array(),
    };

  const hasMultipleFiles = files.length > 1;

  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownOpen]);

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-1">
      {/* Left: Red PDF Icon Tile + File details */}
      <div className="flex items-center gap-3.5 min-w-0">
        {/* Red PDF Icon Tile matching screenshot */}
        <div
          className="w-10 h-10 rounded-xl bg-[#EF4444] text-white flex items-center justify-center flex-shrink-0 shadow-sm shadow-red-500/20"
          aria-hidden="true"
        >
          <FileText className="w-5 h-5 text-white" strokeWidth={2.2} />
        </div>

        {/* File Name & Page / Size Info */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2
              className="text-base font-bold text-[#0F172A] truncate"
              title={currentFile.fileName}
            >
              {currentFile.fileName}
            </h2>

            {/* Multiple files dropdown switcher if more than 1 file exists */}
            {hasMultipleFiles && (
              <div className="relative flex-shrink-0" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen((o) => !o)}
                  className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                  aria-label="Switch document"
                >
                  <span>
                    {files.length} file{files.length > 1 ? "s" : ""}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                </button>

                {dropdownOpen && (
                  <div className="absolute left-0 top-full mt-1.5 w-60 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-30">
                    <p className="px-3 py-1 text-[10px] uppercase font-bold text-slate-400">
                      Uploaded Documents
                    </p>
                    {files.map((file) => (
                      <button
                        key={file.id}
                        type="button"
                        onClick={() => {
                          onSelectFile?.(file.id);
                          setDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                          file.id === currentFile.id
                            ? "font-bold text-indigo-600 bg-indigo-50/50"
                            : "text-slate-700 font-medium"
                        }`}
                      >
                        <span className="truncate max-w-[170px]" title={file.fileName}>
                          {file.fileName}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {file.totalOriginalPages}p
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <p className="text-xs text-slate-500 font-normal mt-0.5">
            {totalPageCount} pages &middot; {formatFileSize(currentFile.fileSize)}
          </p>
        </div>
      </div>

      {/* Right: Big page count + hint */}
      <div className="text-left sm:text-right flex-shrink-0">
        <p className="text-lg sm:text-xl font-bold text-[#0F172A] tabular-nums tracking-tight">
          {totalPageCount} pages
        </p>
        <p className="text-xs text-slate-500 font-normal mt-0.5">
          Drag pages to rearrange. Select a page to preview.
        </p>
      </div>
    </div>
  );
}
