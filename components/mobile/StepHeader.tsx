"use client";

import React from "react";
import { ChevronLeft } from "lucide-react";

interface StepHeaderProps {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
  rightElement?: React.ReactNode;
  className?: string;
}

export default function StepHeader({
  title,
  subtitle,
  onBack,
  backLabel = "Back",
  rightElement,
  className = "",
}: StepHeaderProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {/* Top row with Back link and optional rightElement */}
      <div className="flex items-center justify-between min-h-[36px]">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors -ml-1 py-1 px-1.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label={`Go back to ${backLabel}`}
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
            <span>{backLabel}</span>
          </button>
        ) : (
          <div />
        )}

        {rightElement && (
          <div className="text-xs font-semibold text-slate-500">{rightElement}</div>
        )}
      </div>

      {/* Title & Subtitle */}
      {title && (
        <div className="space-y-0.5">
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#0F172A] tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              {subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
