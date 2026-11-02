"use client";

import React from "react";
import { Check } from "lucide-react";

export interface PreferenceRadioCardProps {
  id: string;
  name: string;
  value: string;
  selectedValue: string;
  onSelect: (value: string) => void;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  ariaLabel?: string;
}

export default function PreferenceRadioCard({
  id,
  name,
  value,
  selectedValue,
  onSelect,
  title,
  subtitle,
  icon,
  ariaLabel,
}: PreferenceRadioCardProps) {
  const isSelected = selectedValue === value;

  return (
    <label
      htmlFor={id}
      aria-label={ariaLabel || `${title}${subtitle ? ` - ${subtitle}` : ""}`}
      className={`group relative flex items-center gap-3.5 p-4 sm:p-5 rounded-2xl cursor-pointer select-none transition-all duration-150 border text-left w-full has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-indigo-500 has-[:focus-visible]:ring-offset-2 ${
        isSelected
          ? "border-indigo-600 bg-indigo-50/40 shadow-sm"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/40"
      }`}
    >
      {/* Visually hidden real radio input for native accessibility and keyboard arrow navigation */}
      <input
        type="radio"
        id={id}
        name={name}
        value={value}
        checked={isSelected}
        onChange={() => onSelect(value)}
        className="sr-only"
      />

      {/* Custom Radio Circle Indicator */}
      <div className="flex-shrink-0" aria-hidden="true">
        {isSelected ? (
          <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-600/30">
            <Check className="w-3 h-3 stroke-[3]" />
          </div>
        ) : (
          <div className="w-5 h-5 rounded-full border-[1.5px] border-slate-300 bg-white group-hover:border-slate-400 transition-colors" />
        )}
      </div>

      {/* Visual Icon (Document, Colored Image Doc, Single Page, Double Page) */}
      <div className="flex-shrink-0 flex items-center justify-center" aria-hidden="true">
        {icon}
      </div>

      {/* Copy / Labels */}
      <div className="min-w-0 flex-1">
        <p className="text-sm sm:text-[15px] font-bold text-[#0F172A] leading-snug truncate">
          {title}
        </p>
        {subtitle && (
          <p className="text-xs font-medium text-slate-500 mt-0.5 font-mono">
            {subtitle}
          </p>
        )}
      </div>
    </label>
  );
}
