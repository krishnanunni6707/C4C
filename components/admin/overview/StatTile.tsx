"use client";

import React from "react";
import Sparkline from "./Sparkline";
import type { OverviewDelta } from "@/lib/admin/overview";

interface StatTileProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  delta: OverviewDelta;
  sparklineData: number[];
  className?: string;
}

export default function StatTile({
  icon,
  label,
  value,
  delta,
  sparklineData,
  className = "",
}: StatTileProps) {
  const isGood = delta.isGood;
  const isPositive = delta.isPositive;

  // Good = emerald, Bad = rose
  const deltaColorClass = isGood
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-rose-600 dark:text-rose-400";

  return (
    <div
      className={`bg-white rounded-[16px] border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all flex items-center justify-between ${className}`}
    >
      <div className="flex items-start gap-4">
        {/* Icon tile */}
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0">
          {icon}
        </div>

        {/* Text values */}
        <div>
          <p className="text-xs font-medium text-slate-500 tracking-normal">{label}</p>
          <p className="text-[28px] sm:text-3xl font-bold text-slate-900 tracking-tight leading-tight mt-0.5 tabular-nums">
            {value}
          </p>
          <div className="flex items-center gap-1 mt-1 text-xs">
            <span className={`flex items-center font-semibold ${deltaColorClass}`}>
              {isPositive ? "↑" : "↓"} {delta.formatted}
            </span>
          </div>
        </div>
      </div>

      {/* Sparkline chart */}
      <div className="hidden sm:block ml-2 flex-shrink-0">
        <Sparkline data={sparklineData} width={80} height={38} color="#6366F1" />
      </div>
    </div>
  );
}
