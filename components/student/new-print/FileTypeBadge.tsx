"use client";

import React from "react";

interface FileTypeBadgeProps {
  fileName: string;
  fileType?: string;
  className?: string;
}

export default function FileTypeBadge({
  fileName,
  fileType,
  className = "",
}: FileTypeBadgeProps) {
  const ext = (
    fileType ||
    fileName.split(".").pop() ||
    ""
  ).toLowerCase();

  let badgeColor = "bg-rose-500";
  let label = "PDF";

  if (ext === "pdf") {
    badgeColor = "bg-rose-500";
    label = "PDF";
  } else if (ext === "docx" || ext === "doc") {
    badgeColor = "bg-blue-600";
    label = "DOCX";
  } else if (ext === "pptx" || ext === "ppt") {
    badgeColor = "bg-amber-500";
    label = "PPTX";
  } else if (["png", "jpg", "jpeg", "webp"].includes(ext)) {
    badgeColor = "bg-emerald-500";
    label = ext.toUpperCase().slice(0, 4);
  }

  return (
    <div
      className={`w-11 h-11 rounded-lg ${badgeColor} text-white font-black text-xs tracking-wider flex items-center justify-center flex-shrink-0 shadow-sm ${className}`}
      aria-label={`File type: ${label}`}
    >
      {label}
    </div>
  );
}
