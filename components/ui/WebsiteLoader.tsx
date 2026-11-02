"use client";

import React from "react";

export interface WebsiteLoaderProps {
  message?: string;
  fullScreen?: boolean;
  className?: string;
}

export default function WebsiteLoader({
  message,
  fullScreen = true,
  className = "",
}: WebsiteLoaderProps) {
  const content = (
    <div className="flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in duration-200">
      {/* Animation Card Badge */}
      <div className="relative w-36 h-28 sm:w-44 sm:h-32 rounded-3xl !bg-white shadow-xl shadow-slate-200/50 dark:shadow-black/70 border border-slate-100 dark:border-slate-800 dark:ring-4 dark:ring-indigo-500/20 flex items-center justify-center p-2 overflow-hidden transition-all">
        <picture className="w-full h-full flex items-center justify-center">
          <source srcSet="/loading.webp" type="image/webp" />
          <img
            src="/loading.gif"
            alt="Loading animation"
            width={150}
            height={112}
            className="w-full h-full object-contain pointer-events-none select-none"
            loading="eager"
            decoding="async"
          />
        </picture>
      </div>

      {/* Loading message */}
      {message && (
        <p className="mt-4 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 tracking-wide font-sans animate-pulse">
          {message}
        </p>
      )}
    </div>
  );

  if (!fullScreen) {
    return (
      <div className={`w-full py-12 flex items-center justify-center ${className}`}>
        {content}
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={message || "Loading"}
      className={`fixed inset-0 z-50 flex items-center justify-center bg-[#F8FAFC] dark:bg-[#0B0F19] transition-colors ${className}`}
    >
      {content}
    </div>
  );
}
