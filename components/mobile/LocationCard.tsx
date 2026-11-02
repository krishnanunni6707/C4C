"use client";

import React from "react";
import {
  Printer,
  Building2,
  Settings,
  Clock,
  MapPin,
  Check,
} from "lucide-react";

export interface MobileLocationData {
  id: string;
  name: string;
  building?: string;
  floor?: string;
  openTime?: string;
  closeTime?: string;
  isOpen: boolean;
  queueAhead?: number;
  estWaitMinutes?: number;
  printersCount?: number;
  isSelectable?: boolean;
}

interface LocationCardProps {
  location: MobileLocationData;
  isSelected: boolean;
  onSelect: (id: string) => void;
  className?: string;
}

function getCenterIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("eng") || lower.includes("block")) {
    return <Settings className="w-5 h-5 stroke-[2]" />;
  }
  if (lower.includes("library") || lower.includes("hub")) {
    return <Building2 className="w-5 h-5 stroke-[2]" />;
  }
  return <Printer className="w-5 h-5 stroke-[2]" />;
}

export default function LocationCard({
  location,
  isSelected,
  onSelect,
  className = "",
}: LocationCardProps) {
  const isSelectable = location.isSelectable !== false;
  const hours = `${location.openTime || "8:00 AM"} – ${
    location.closeTime || "8:00 PM"
  }`;
  const queueText = `${location.queueAhead ?? 0} ahead • ~${
    location.estWaitMinutes ?? 2
  } min`;
  const printersText = `${location.printersCount ?? 3} printers`;

  return (
    <div
      role="radio"
      aria-checked={isSelected}
      tabIndex={isSelectable ? 0 : -1}
      onClick={() => {
        if (isSelectable) onSelect(location.id);
      }}
      onKeyDown={(e) => {
        if (isSelectable && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onSelect(location.id);
        }
      }}
      className={`relative w-full rounded-2xl bg-white p-3.5 transition-all cursor-pointer border ${
        isSelected
          ? "border-2 border-indigo-600 shadow-md ring-2 ring-indigo-50"
          : "border-slate-200/90 hover:border-slate-300 shadow-sm"
      } ${
        !isSelectable
          ? "opacity-60 cursor-not-allowed bg-slate-50/60"
          : "active:scale-[0.99]"
      } ${className}`}
    >
      {/* Top row: Icon tile + Name + Pill + Radio Selection Indicator */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Icon Tile */}
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0 shadow-xs">
            {getCenterIcon(location.name)}
          </div>

          {/* Name & Status Pill */}
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-[#0F172A] tracking-tight truncate">
              {location.name}
            </h3>

            <div className="flex items-center gap-2 mt-1">
              {location.isOpen ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Open
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/50">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Closed
                </span>
              )}
              <span className="text-xs text-slate-500 font-medium">{hours}</span>
            </div>
          </div>
        </div>

        {/* Radio Indicator (Top Right) */}
        <div
          className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
            isSelected
              ? "bg-indigo-600 text-white shadow-xs"
              : "border-2 border-slate-300 bg-white"
          }`}
        >
          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
        </div>
      </div>

      {/* Details Row: Queue Ahead & Printers Count */}
      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-slate-400" />
          <span>{queueText}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Printer className="w-3.5 h-3.5 text-slate-400" />
          <span>{printersText}</span>
        </div>
      </div>
    </div>
  );
}
