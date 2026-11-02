"use client";

import React from "react";

interface PreferenceRadioCardProps {
  label: string;
  sublabel?: string;
  priceTag?: string;
  isSelected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  className?: string;
}

export default function PreferenceRadioCard({
  label,
  sublabel,
  priceTag,
  isSelected,
  onSelect,
  disabled = false,
  className = "",
}: PreferenceRadioCardProps) {
  return (
    <div
      role="radio"
      aria-checked={isSelected}
      tabIndex={disabled ? -1 : 0}
      onClick={() => {
        if (!disabled) onSelect();
      }}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`w-full min-h-[52px] bg-white rounded-2xl border p-3.5 sm:p-4 flex items-center justify-between transition-all cursor-pointer select-none ${
        isSelected
          ? "border-2 border-indigo-600 ring-2 ring-indigo-50 shadow-sm"
          : "border-slate-200 hover:border-slate-300 shadow-xs"
      } ${
        disabled
          ? "opacity-50 cursor-not-allowed bg-slate-50"
          : "active:scale-[0.99]"
      } ${className}`}
    >
      {/* Left: Custom Radio Circle + Label */}
      <div className="flex items-center gap-3">
        <div
          className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
            isSelected
              ? "border-2 border-indigo-600 bg-white"
              : "border-2 border-slate-300 bg-white"
          }`}
        >
          {isSelected && (
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
          )}
        </div>

        <div>
          <span className="text-sm font-bold text-[#0F172A]">{label}</span>
          {sublabel && (
            <p className="text-xs text-slate-400 font-medium">{sublabel}</p>
          )}
        </div>
      </div>

      {/* Right: Optional Price / Sheet badge */}
      {priceTag && (
        <span className="text-xs font-semibold text-slate-500 font-mono">
          {priceTag}
        </span>
      )}
    </div>
  );
}
