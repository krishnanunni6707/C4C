"use client";

import React, { useRef, useState } from "react";
import { Folder, UploadCloud } from "lucide-react";

interface UploadDropzoneProps {
  onFilesSelected: (files: FileList | File[]) => void;
  loading?: boolean;
}

export default function UploadDropzone({
  onFilesSelected,
  loading = false,
}: UploadDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  };

  return (
    <label
      htmlFor="student-dropzone-file-input"
      tabIndex={0}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onKeyDown={handleKeyDown}
      aria-describedby="upload-formats-desc"
      className={`w-full min-h-[190px] py-7 px-6 rounded-xl border-[1.5px] border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center outline-none focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 select-none ${
        isDragging
          ? "border-indigo-600 bg-indigo-50/90 shadow-inner"
          : "border-indigo-300 bg-indigo-50/40 hover:bg-indigo-50/70"
      }`}
    >
      <input
        id="student-dropzone-file-input"
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.pptx,.png,.jpg,.jpeg"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onFilesSelected(e.target.files);
            // reset value so the same file can be re-selected if removed
            e.target.value = "";
          }
        }}
        className="sr-only"
        aria-hidden="true"
      />

      {/* Cloud Upload Icon */}
      <div className="w-10 h-10 mb-2 flex items-center justify-center text-indigo-600 pointer-events-none">
        <UploadCloud className="w-10 h-10" strokeWidth={1.8} />
      </div>

      {/* Primary & Subtext */}
      <p className="text-lg font-bold text-[#0F172A] tracking-tight pointer-events-none">
        Drag & drop files here
      </p>
      <p className="text-[13px] text-slate-500 font-normal mt-0.5 pointer-events-none">
        or click to browse
      </p>

      {/* Outlined Action Button */}
      <div className="mt-3.5 pointer-events-none">
        <span className="inline-flex items-center gap-2 h-11 px-5 rounded-lg border border-indigo-300 bg-white text-indigo-700 font-semibold text-sm shadow-sm hover:bg-indigo-50/50 hover:border-indigo-400 transition-colors">
          <Folder className="w-4 h-4 text-indigo-600" />
          <span>Choose Files</span>
        </span>
      </div>
    </label>
  );
}
