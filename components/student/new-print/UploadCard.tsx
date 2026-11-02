"use client";

import React from "react";
import { UploadCloud, Trash2, Info } from "lucide-react";
import UploadDropzone from "./UploadDropzone";
import UploadedFileRow from "./UploadedFileRow";
import type { ManagedPdfFile } from "../PdfEditor";

interface UploadCardProps {
  files: ManagedPdfFile[];
  fileProgress?: Record<string, number>;
  error?: string | null;
  loading?: boolean;
  onFilesSelected: (files: FileList | File[]) => void;
  onRemoveFile: (fileId: string) => void;
  onClearAll: () => void;
  onPreviewFile?: (fileId: string) => void;
}

export default function UploadCard({
  files,
  fileProgress = {},
  error,
  loading = false,
  onFilesSelected,
  onRemoveFile,
  onClearAll,
  onPreviewFile,
}: UploadCardProps) {
  const handleClearAll = () => {
    if (files.length > 1) {
      const confirmed = window.confirm(
        "Are you sure you want to remove all uploaded files?"
      );
      if (!confirmed) return;
    }
    onClearAll();
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)] space-y-6">
      {/* Header Row */}
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0">
          <UploadCloud className="w-8 h-8" strokeWidth={1.8} />
        </div>
        <div>
          <h2 className="text-[22px] font-bold text-[#0F172A] tracking-tight leading-tight">
            Upload Documents
          </h2>
          <p
            id="upload-formats-desc"
            className="text-sm text-slate-500 font-normal mt-1 leading-relaxed"
          >
            Drag and drop your files here, or click to browse. Supported formats:
            PDF, DOCX, PPTX, JPG, PNG.
          </p>
        </div>
      </div>

      {/* Error Alert Banner */}
      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-xl text-xs sm:text-[13px] font-medium flex items-center gap-2.5"
        >
          <svg
            className="w-5 h-5 min-w-[20px] text-rose-500 flex-shrink-0"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
          <span className="flex-1">{error}</span>
        </div>
      )}

      {/* Dropzone */}
      <UploadDropzone onFilesSelected={onFilesSelected} loading={loading} />

      {/* Uploaded Files Section */}
      {files.length > 0 && (
        <div className="space-y-3.5 pt-1">
          {/* Section Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#0F172A] tracking-tight">
              Uploaded Files ({files.length})
            </h3>
            <button
              type="button"
              onClick={handleClearAll}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-md py-0.5 px-1"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear all</span>
            </button>
          </div>

          {/* File Rows List */}
          <div className="space-y-3">
            {files.map((file) => (
              <UploadedFileRow
                key={file.id}
                file={file}
                progress={fileProgress[file.id] ?? 100}
                onRemove={onRemoveFile}
                onPreview={onPreviewFile}
              />
            ))}
          </div>
        </div>
      )}

      {/* Bottom Info Strip */}
      <div className="bg-indigo-50/70 border border-indigo-100/60 rounded-xl px-4 py-3 flex items-center gap-2.5 text-[13px] text-indigo-700 font-medium">
        <Info className="w-4 h-4 text-indigo-600 flex-shrink-0" />
        <span>
          You can upload multiple files. We&apos;ll keep them in the order you
          add them.
        </span>
      </div>
    </div>
  );
}
