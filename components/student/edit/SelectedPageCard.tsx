"use client";

import React from "react";
import { FileText, Trash2 } from "lucide-react";

export interface SelectedPageCardProps {
  selectedPageNumber: number;
  totalPages: number;
  onDoubleClick?: () => void;
  onDelete?: () => void;
}

export default function SelectedPageCard({
  selectedPageNumber,
  totalPages,
  onDoubleClick,
  onDelete,
}: SelectedPageCardProps) {
  return (
    <div
      onDoubleClick={onDoubleClick}
      className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-3 sm:p-3.5 flex items-center justify-between gap-3 select-none"
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Indigo Document Icon Tile matching screenshot */}
        <div
          className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0"
          aria-hidden="true"
        >
          <FileText className="w-5 h-5" strokeWidth={2.2} />
        </div>

        {/* Page Info & Hint */}
        <div className="min-w-0">
          <p className="text-xs font-bold text-[#0F172A] leading-tight">
            Selected page
          </p>
          <p className="text-sm font-semibold text-slate-700 leading-tight mt-0.5">
            Page {totalPages > 0 ? selectedPageNumber : 0}
          </p>
          <p className="text-[11px] text-slate-500 font-normal leading-tight mt-1">
            Drag to reorder &middot; Double click to zoom
          </p>
        </div>
      </div>

      {/* Delete Selected Page Button */}
      {onDelete && totalPages > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="flex-shrink-0 px-2.5 py-1.5 rounded-lg border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-2xs focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 cursor-pointer"
          title={`Delete page ${selectedPageNumber}`}
          aria-label={`Delete page ${selectedPageNumber}`}
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete</span>
        </button>
      )}
    </div>
  );
}
