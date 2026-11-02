"use client";

import React, { useState, useRef, useEffect } from "react";
import { Plus, RotateCw, ArrowUpDown, Undo2, Redo2 } from "lucide-react";

export interface EditToolbarProps {
  onAddFiles?: () => void;
  onRotateAll?: () => void;
  onSort?: (order: "original" | "reverse") => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  loading?: boolean;
}

export default function EditToolbar({
  onAddFiles,
  onRotateAll,
  onSort,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  loading = false,
}: EditToolbarProps) {
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sortMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        sortMenuRef.current &&
        !sortMenuRef.current.contains(e.target as Node)
      ) {
        setSortMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [sortMenuOpen]);

  return (
    <div className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 flex items-center justify-between sm:justify-start gap-2 sm:gap-3 flex-wrap">
      {/* "+ Add files" button matching screenshot: outlined indigo button */}
      <button
        type="button"
        onClick={onAddFiles}
        disabled={loading}
        className="h-9 px-3.5 bg-white border border-indigo-600 text-indigo-600 hover:bg-indigo-50/70 active:bg-indigo-100 font-semibold text-xs rounded-[10px] flex items-center gap-1.5 transition-colors shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50"
        aria-label="Add files to merge"
      >
        <Plus className="w-4 h-4" strokeWidth={2.5} />
        <span>Add files</span>
      </button>

      {/* "Rotate all" button */}
      <button
        type="button"
        onClick={onRotateAll}
        disabled={loading}
        className="h-9 px-3 rounded-[10px] text-slate-600 hover:text-[#0F172A] hover:bg-slate-200/50 active:bg-slate-200 font-medium text-xs flex items-center gap-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-40"
        aria-label="Rotate all pages clockwise"
      >
        <RotateCw className="w-3.5 h-3.5" strokeWidth={2} />
        <span>Rotate all</span>
      </button>

      {/* "Sort" button with dropdown */}
      <div className="relative" ref={sortMenuRef}>
        <button
          type="button"
          onClick={() => setSortMenuOpen((o) => !o)}
          disabled={loading}
          className="h-9 px-3 rounded-[10px] text-slate-600 hover:text-[#0F172A] hover:bg-slate-200/50 active:bg-slate-200 font-medium text-xs flex items-center gap-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-40"
          aria-label="Sort options"
          aria-expanded={sortMenuOpen}
        >
          <ArrowUpDown className="w-3.5 h-3.5" strokeWidth={2} />
          <span>Sort</span>
        </button>

        {sortMenuOpen && (
          <div className="absolute left-0 top-full mt-1.5 w-44 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-30">
            <button
              type="button"
              onClick={() => {
                onSort?.("original");
                setSortMenuOpen(false);
              }}
              className="w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Original order
            </button>
            <button
              type="button"
              onClick={() => {
                onSort?.("reverse");
                setSortMenuOpen(false);
              }}
              className="w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Reverse order
            </button>
          </div>
        )}
      </div>

      {/* "Undo" button */}
      <button
        type="button"
        onClick={onUndo}
        disabled={!canUndo || loading}
        className={`h-9 px-3 rounded-[10px] font-medium text-xs flex items-center gap-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
          canUndo && !loading
            ? "text-slate-600 hover:text-[#0F172A] hover:bg-slate-200/50 active:bg-slate-200 cursor-pointer"
            : "text-slate-300 cursor-not-allowed pointer-events-none"
        }`}
        aria-label="Undo last action"
      >
        <Undo2 className="w-3.5 h-3.5" strokeWidth={2} />
        <span>Undo</span>
      </button>

      {/* "Redo" button */}
      <button
        type="button"
        onClick={onRedo}
        disabled={!canRedo || loading}
        className={`h-9 px-3 rounded-[10px] font-medium text-xs flex items-center gap-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
          canRedo && !loading
            ? "text-slate-600 hover:text-[#0F172A] hover:bg-slate-200/50 active:bg-slate-200 cursor-pointer"
            : "text-slate-300 cursor-not-allowed pointer-events-none"
        }`}
        aria-label="Redo action"
      >
        <Redo2 className="w-3.5 h-3.5" strokeWidth={2} />
        <span>Redo</span>
      </button>
    </div>
  );
}
