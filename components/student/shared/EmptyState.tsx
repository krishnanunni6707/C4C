"use client";

import React from "react";
import { FolderOpen } from "lucide-react";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`bg-white border border-slate-200 rounded-2xl p-10 sm:p-12 text-center max-w-md mx-auto space-y-3.5 shadow-sm ${className}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto shadow-sm">
        {icon || <FolderOpen className="w-6 h-6 stroke-[1.75]" />}
      </div>
      <div>
        <h3 className="text-base font-bold text-[#0F172A] tracking-tight">
          {title}
        </h3>
        {description && (
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {actionLabel && onAction && (
        <div className="pt-2">
          <button
            type="button"
            onClick={onAction}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            {actionLabel}
          </button>
        </div>
      )}
    </div>
  );
}
