"use client";

import React from "react";
import {
  Printer,
  IndianRupee,
  Hourglass,
  Clock,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import RangeSelect from "./RangeSelect";
import StatTile from "./StatTile";
import LiveQueueCard from "./LiveQueueCard";
import PrinterFleetCard from "./PrinterFleetCard";
import RevenueJobsChart from "./RevenueJobsChart";
import RecentActivityCard from "./RecentActivityCard";
import BroadcastCard from "./BroadcastCard";
import type { OverviewData, OverviewRange } from "@/lib/admin/overview";

interface OverviewViewProps {
  data: OverviewData | null;
  range: OverviewRange;
  onRangeChange: (range: OverviewRange) => void;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  lastRefreshedText?: string;
  className?: string;
}

export default function OverviewView({
  data,
  range,
  onRangeChange,
  isLoading = false,
  error = null,
  onRetry,
  lastRefreshedText = "Updated just now",
  className = "",
}: OverviewViewProps) {
  return (
    <div className={`space-y-4 pb-4 animate-in fade-in duration-200 ${className}`}>
      {/* ─── Page Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-[38px] lg:text-[40px] font-extrabold text-slate-900 tracking-tight leading-none">
            System Overview
          </h1>
          <p className="text-sm text-slate-500 mt-2 font-normal">
            Here&apos;s what&apos;s happening with your print system today.
          </p>
        </div>

        {/* Date Range Select */}
        <div className="flex items-center gap-3">
          <RangeSelect value={range} onChange={onRangeChange} />
        </div>
      </div>

      {/* ─── Error State Banner ─────────────────────────────────── */}
      {error && (
        <div
          role="alert"
          className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-between gap-3 text-rose-800 text-xs font-medium shadow-sm"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>Could not load overview. Retry.</span>
          </div>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="px-3 py-1.5 rounded-xl bg-white border border-rose-200 text-rose-700 hover:bg-rose-100/50 font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          )}
        </div>
      )}

      {/* ─── ROW 1: 4 Stat Tiles ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Jobs today */}
        <StatTile
          icon={<Printer className="w-6 h-6" />}
          label="Jobs today"
          value={isLoading ? "—" : (data?.stats.jobsToday ?? 0)}
          delta={
            data?.stats.deltaJobs ?? {
              value: 12,
              formatted: "+12% vs last week",
              isPositive: true,
              isGood: true,
            }
          }
          sparklineData={data?.stats.sparklines.jobs ?? [20, 35, 45, 30, 60, 85, 128]}
        />

        {/* 2. Revenue today */}
        <StatTile
          icon={<IndianRupee className="w-6 h-6" />}
          label="Revenue today"
          value={
            isLoading
              ? "—"
              : `₹${(data?.stats.revenueToday ?? 0).toLocaleString("en-IN")}`
          }
          delta={
            data?.stats.deltaRevenue ?? {
              value: 18,
              formatted: "+18% vs last week",
              isPositive: true,
              isGood: true,
            }
          }
          sparklineData={data?.stats.sparklines.revenue ?? [1200, 2400, 1800, 3200, 2800, 3900, 4260]}
        />

        {/* 3. Waiting */}
        <StatTile
          icon={<Hourglass className="w-6 h-6" />}
          label="Waiting"
          value={isLoading ? "—" : (data?.stats.waiting ?? 0)}
          delta={
            data?.stats.deltaWaiting ?? {
              value: -10,
              formatted: "−10% vs last hour",
              isPositive: false,
              isGood: true,
            }
          }
          sparklineData={data?.stats.sparklines.waiting ?? [15, 12, 14, 11, 13, 10, 9]}
        />

        {/* 4. Avg wait */}
        <StatTile
          icon={<Clock className="w-6 h-6" />}
          label="Avg wait"
          value={isLoading ? "—" : `${data?.stats.avgWaitMin ?? 0} min`}
          delta={
            data?.stats.deltaAvgWait ?? {
              value: -1,
              formatted: "−1 min vs last week",
              isPositive: false,
              isGood: true,
            }
          }
          sparklineData={data?.stats.sparklines.avgWait ?? [9, 8, 8, 7, 7, 6, 6]}
        />
      </div>

      {/* ─── ROW 2: Live Queue (63%) + Printer Fleet (37%) ──────── */}
      <div className="flex flex-col lg:flex-row gap-5 items-stretch">
        <div className="w-full lg:w-[63%] flex flex-col">
          <LiveQueueCard
            jobs={data?.liveQueue ?? []}
            isLoading={isLoading}
            lastUpdatedText={lastRefreshedText}
            className="h-full"
          />
        </div>

        <div className="w-full lg:w-[37%] flex flex-col">
          <PrinterFleetCard
            printers={data?.printers ?? []}
            isLoading={isLoading}
            className="h-full"
          />
        </div>
      </div>

      {/* ─── ROW 3: Revenue & Jobs (41%) + Activity (32%) + Broadcast (27%) */}
      <div className="flex flex-col lg:flex-row gap-5 items-stretch">
        <div className="w-full lg:w-[41%] flex flex-col">
          <RevenueJobsChart
            series={data?.series ?? []}
            currentRange={range}
            onRangeChange={onRangeChange}
            isLoading={isLoading}
            className="h-full"
          />
        </div>

        <div className="w-full lg:w-[32%] flex flex-col">
          <RecentActivityCard
            activities={data?.recentActivity ?? []}
            isLoading={isLoading}
            className="h-full"
          />
        </div>

        <div className="w-full lg:w-[27%] flex flex-col">
          <BroadcastCard className="h-full" />
        </div>
      </div>
    </div>
  );
}
