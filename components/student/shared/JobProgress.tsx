"use client";

import React from "react";

export interface JobProgressProps {
  percent: number;
  showLabel?: boolean;
  className?: string;
  barColor?: string;
}

export default function JobProgress({
  percent,
  showLabel = true,
  className = "",
  barColor = "bg-indigo-600",
}: JobProgressProps) {
  const clampedPercent = Math.min(100, Math.max(0, Math.round(percent)));

  return (
    <div className={`flex items-center gap-3 w-full ${className}`}>
      <div
        role="progressbar"
        aria-valuenow={clampedPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden"
      >
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${clampedPercent}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-semibold text-slate-700 font-mono tabular-nums flex-shrink-0 min-w-[32px] text-right">
          {clampedPercent}%
        </span>
      )}
    </div>
  );
}
