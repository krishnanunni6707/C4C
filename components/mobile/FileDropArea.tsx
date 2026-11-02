"use client";

import React, { useRef, useState } from "react";
import { UploadCloud, AlertCircle } from "lucide-react";

interface FileDropAreaProps {
  onFilesSelected: (files: File[]) => void;
  isProcessing?: boolean;
  className?: string;
}

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/png",
  "image/jpeg",
];

const ACCEPT_STRING = ".pdf,.docx,.doc,.pptx,.png,.jpg,.jpeg";
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

export default function FileDropArea({
  onFilesSelected,
  isProcessing = false,
  className = "",
}: FileDropAreaProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const validateAndHandleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setErrorMessage(null);

    const validFiles: File[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setErrorMessage(`"${file.name}" exceeds the 20 MB maximum limit.`);
        return;
      }
      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    validateAndHandleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`w-full bg-white rounded-2xl border-2 border-dashed p-4 sm:p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
          isDragOver
            ? "border-indigo-600 bg-indigo-50/50 shadow-md scale-[1.01]"
            : "border-indigo-200/90 hover:border-indigo-400 bg-white shadow-xs"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPT_STRING}
          className="hidden"
          onChange={(e) => {
            validateAndHandleFiles(e.target.files);
            // Reset input so re-selecting the same file fires onChange
            e.target.value = "";
          }}
          disabled={isProcessing}
        />

        {/* Upload Icon in Circle */}
        <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-2 shadow-xs">
          <UploadCloud className="w-5 h-5 stroke-[2]" />
        </div>

        {/* Text Instructions */}
        <p className="text-sm font-bold text-[#0F172A] tracking-tight">
          Drag &amp; drop your files here
        </p>
        <span className="text-xs text-slate-400 my-1 font-medium">or</span>

        {/* Outlined Action Button */}
        <button
          type="button"
          disabled={isProcessing}
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          className="mt-1 h-9 px-4 rounded-xl border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          Choose Files
        </button>
      </div>

      {/* Inline Error */}
      {errorMessage && (
        <div className="flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 border border-rose-200/60 rounded-xl p-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
