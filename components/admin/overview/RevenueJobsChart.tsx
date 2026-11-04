"use client";

import React, { useState, useEffect } from "react";
import { BarChart3 } from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { OverviewSeriesItem, OverviewRange } from "@/lib/admin/overview";

interface RevenueJobsChartProps {
  series: OverviewSeriesItem[];
  currentRange: OverviewRange;
  onRangeChange?: (range: OverviewRange) => void;
  isLoading?: boolean;
  className?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    dataKey: string;
    color: string;
  }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const revenueVal = payload.find((p) => p.dataKey === "revenue")?.value ?? 0;
    const jobsVal = payload.find((p) => p.dataKey === "jobs")?.value ?? 0;

    return (
      <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1.5 border border-slate-800">
        <p className="font-semibold text-slate-300">{label}</p>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500" />
          <span className="text-slate-400">Revenue:</span>
          <span className="font-bold text-white">₹{revenueVal.toLocaleString("en-IN")}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-300" />
          <span className="text-slate-400">Jobs:</span>
          <span className="font-bold text-white">{jobsVal}</span>
        </div>
      </div>
    );
  }
  return null;
}

export default function RevenueJobsChart({
  series,
  currentRange,
  onRangeChange,
  isLoading = false,
  className = "",
}: RevenueJobsChartProps) {
  const [mounted, setMounted] = useState(false);
  const [activeSegment, setActiveSegment] = useState<OverviewRange>(
    currentRange === "today" ? "7d" : currentRange
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSegmentClick = (range: OverviewRange) => {
    setActiveSegment(range);
    if (onRangeChange) {
      onRangeChange(range);
    }
  };

  const formatYAxis = (val: number) => {
    if (val === 0) return "0";
    if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
    return String(val);
  };

  return (
    <div
      className={`bg-white rounded-[16px] border border-slate-200/80 p-5 shadow-sm flex flex-col justify-between ${className}`}
    >
      <div>
        {/* Header with Icon, Title, and Segmented Control */}
        <div className="flex items-center justify-between pb-2 mb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Revenue & Jobs Overview
            </h2>
          </div>

          {/* Segmented control: 7D / 30D / 90D */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-semibold">
            {(["7d", "30d", "90d"] as const).map((r) => {
              const isActive = (onRangeChange ? currentRange : activeSegment) === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleSegmentClick(r)}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {r.toUpperCase()}
                </button>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-5 text-xs text-slate-500 font-medium mb-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
            <span>Revenue (₹)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-300" />
            <span>Jobs</span>
          </div>
        </div>

        {/* Recharts Container */}
        {isLoading || !mounted ? (
          <div className="h-60 w-full bg-slate-50/70 rounded-xl animate-pulse flex items-center justify-center text-xs text-slate-400">
            Loading chart data...
          </div>
        ) : (
          <div className="h-60 w-full -ml-3">
            <ResponsiveContainer width="100%" height={240} debounce={50}>
              <ComposedChart
                data={series}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#F1F5F9"
                />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={{ stroke: "#E2E8F0" }}
                  tick={{ fill: "#64748B", fontSize: 11 }}
                  dy={4}
                />
                <YAxis
                  yAxisId="revenue"
                  tickLine={false}
                  axisLine={false}
                  ticks={[0, 1000, 2000, 3000, 4000, 5000]}
                  domain={[0, 5000]}
                  tickFormatter={formatYAxis}
                  tick={{ fill: "#64748B", fontSize: 11 }}
                  dx={-4}
                />
                <YAxis
                  yAxisId="jobs"
                  orientation="right"
                  hide
                  domain={[0, "auto"]}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  yAxisId="revenue"
                  dataKey="revenue"
                  fill="#4F46E5"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                  isAnimationActive={false}
                />
                <Line
                  yAxisId="jobs"
                  type="monotone"
                  dataKey="jobs"
                  stroke="#A5B4FC"
                  strokeWidth={2.5}
                  dot={{ fill: "#A5B4FC", r: 3.5, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: "#6366F1" }}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Accessible visually-hidden table fallback */}
        <div className="sr-only">
          <table aria-label="Revenue and Jobs Overview Data">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Revenue (₹)</th>
                <th scope="col">Jobs Count</th>
              </tr>
            </thead>
            <tbody>
              {series.map((item) => (
                <tr key={item.date}>
                  <td>{item.label}</td>
                  <td>₹{item.revenue}</td>
                  <td>{item.jobs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
