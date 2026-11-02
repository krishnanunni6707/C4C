"use client";

import React, { useState } from "react";
import {
  RotateCw,
  Trash2,
  MoreHorizontal,
  ArrowRight,
  RotateCcw,
  ArrowUpDown,
  Undo2,
  Redo2,
  FilePlus2,
  X,
} from "lucide-react";

interface PageActionBarProps {
  onRotateSelected: () => void;
  onDeleteSelected: () => void;
  onRotateAll?: () => void;
  onSortPages?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onAddFiles?: () => void;
  onDone: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  hasSelection: boolean;
  className?: string;
}

export default function PageActionBar({
  onRotateSelected,
  onDeleteSelected,
  onRotateAll,
  onSortPages,
  onUndo,
  onRedo,
  onAddFiles,
  onDone,
  canUndo = false,
  canRedo = false,
  hasSelection,
  className = "",
}: PageActionBarProps) {
  const [showMoreSheet, setShowMoreSheet] = useState(false);

  return (
    <>
      {/* Fixed/Sticky Action Bar above Bottom Tabs */}
      <div
        className={`w-full bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-4 py-2 flex items-center justify-between shadow-sm z-30 ${className}`}
      >
        {/* Left Actions: Rotate, Delete, More */}
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={onRotateSelected}
            disabled={!hasSelection}
            className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              hasSelection
                ? "text-slate-700 hover:text-indigo-600 active:scale-95"
                : "text-slate-300 cursor-not-allowed"
            }`}
            aria-label="Rotate selected page"
          >
            <RotateCw className="w-4 h-4 stroke-[2]" />
            <span className="text-[10px] font-semibold">Rotate</span>
          </button>

          <button
            type="button"
            onClick={onDeleteSelected}
            disabled={!hasSelection}
            className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              hasSelection
                ? "text-slate-700 hover:text-rose-600 active:scale-95"
                : "text-slate-300 cursor-not-allowed"
            }`}
            aria-label="Delete selected page"
          >
            <Trash2 className="w-4 h-4 stroke-[2]" />
            <span className="text-[10px] font-semibold">Delete</span>
          </button>

          <button
            type="button"
            onClick={() => setShowMoreSheet(true)}
            className="min-h-[44px] flex flex-col items-center justify-center gap-0.5 px-2 py-1 text-slate-700 hover:text-indigo-600 rounded-xl transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label="More edit options"
          >
            <MoreHorizontal className="w-4 h-4 stroke-[2]" />
            <span className="text-[10px] font-semibold">More</span>
          </button>
        </div>

        {/* Primary Done Button */}
        <button
          type="button"
          onClick={onDone}
          className="h-10 px-5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white text-xs sm:text-sm font-bold shadow-sm shadow-indigo-500/20 flex items-center gap-1.5 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <span>Done</span>
          <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>
      </div>

      {/* "More" Options Bottom Sheet */}
      {showMoreSheet && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150 p-2 sm:p-4"
          onClick={() => setShowMoreSheet(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[420px] bg-white rounded-2xl shadow-xl border border-slate-200 p-4 space-y-3 animate-in slide-in-from-bottom duration-200"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-[#0F172A]">More Options</h3>
              <button
                type="button"
                onClick={() => setShowMoreSheet(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                aria-label="Close options"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-700">
              <button
                type="button"
                onClick={() => {
                  onRotateAll?.();
                  setShowMoreSheet(false);
                }}
                className="min-h-[44px] flex items-center gap-2 p-2.5 rounded-xl hover:bg-slate-50 border border-slate-200/80 transition-colors"
              >
                <RotateCcw className="w-4 h-4 text-indigo-600" />
                <span>Rotate All</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onSortPages?.();
                  setShowMoreSheet(false);
                }}
                className="min-h-[44px] flex items-center gap-2 p-2.5 rounded-xl hover:bg-slate-50 border border-slate-200/80 transition-colors"
              >
                <ArrowUpDown className="w-4 h-4 text-indigo-600" />
                <span>Sort Pages</span>
              </button>

              <button
                type="button"
                disabled={!canUndo}
                onClick={() => {
                  onUndo?.();
                  setShowMoreSheet(false);
                }}
                className={`min-h-[44px] flex items-center gap-2 p-2.5 rounded-xl border border-slate-200/80 transition-colors ${
                  canUndo
                    ? "hover:bg-slate-50 text-slate-700"
                    : "text-slate-300 cursor-not-allowed"
                }`}
              >
                <Undo2 className="w-4 h-4" />
                <span>Undo</span>
              </button>

              <button
                type="button"
                disabled={!canRedo}
                onClick={() => {
                  onRedo?.();
                  setShowMoreSheet(false);
                }}
                className={`min-h-[44px] flex items-center gap-2 p-2.5 rounded-xl border border-slate-200/80 transition-colors ${
                  canRedo
                    ? "hover:bg-slate-50 text-slate-700"
                    : "text-slate-300 cursor-not-allowed"
                }`}
              >
                <Redo2 className="w-4 h-4" />
                <span>Redo</span>
              </button>

              {onAddFiles && (
                <button
                  type="button"
                  onClick={() => {
                    onAddFiles();
                    setShowMoreSheet(false);
                  }}
                  className="col-span-2 min-h-[44px] flex items-center justify-center gap-2 p-2.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                >
                  <FilePlus2 className="w-4 h-4" />
                  <span>Add More Files</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
