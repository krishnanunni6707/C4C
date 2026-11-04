"use client";

import React, { useState, useRef, useEffect } from "react";
import { Calendar, ChevronDown, Check } from "lucide-react";
import type { OverviewRange } from "@/lib/admin/overview";

interface RangeSelectProps {
  value: OverviewRange;
  onChange: (range: OverviewRange) => void;
  className?: string;
}

const OPTIONS: { id: OverviewRange; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
];

export default function RangeSelect({
  value,
  onChange,
  className = "",
}: RangeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentLabel = OPTIONS.find((o) => o.id === value)?.label || "Last 7 days";

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      <button
        type="button"
        id="date-range-select"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Select date range"
        onClick={() => setIsOpen((prev) => !prev)}
        className="bg-white border border-slate-200/90 hover:border-slate-300 text-slate-700 hover:text-slate-900 rounded-xl px-3.5 py-2 text-xs font-semibold shadow-sm flex items-center gap-2 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
      >
        <Calendar className="w-3.5 h-3.5 text-slate-400" />
        <span>{currentLabel}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div
          role="listbox"
          tabIndex={-1}
          className="absolute right-0 mt-1.5 w-44 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 focus:outline-none"
        >
          {OPTIONS.map((opt) => {
            const isSelected = opt.id === value;
            return (
              <button
                key={opt.id}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(opt.id);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2 text-xs font-medium flex items-center justify-between transition-colors ${
                  isSelected
                    ? "bg-indigo-50 text-indigo-700 font-semibold"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span>{opt.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
