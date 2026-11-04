"use client";

import React from "react";
import Link from "next/link";
import { Zap, CheckCircle2, Printer, User, ArrowRight } from "lucide-react";
import type { OverviewActivity } from "@/lib/admin/overview";

interface RecentActivityCardProps {
  activities: OverviewActivity[];
  isLoading?: boolean;
  className?: string;
}

export default function RecentActivityCard({
  activities,
  isLoading = false,
  className = "",
}: RecentActivityCardProps) {
  const getIcon = (type: OverviewActivity["type"]) => {
    switch (type) {
      case "payment":
        return (
          <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 z-10 border border-emerald-100">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        );
      case "status":
        return (
          <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 z-10 border border-indigo-100">
            <Printer className="w-4 h-4" />
          </div>
        );
      case "user":
        return (
          <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 z-10 border border-blue-100">
            <User className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-slate-50 text-slate-500 flex items-center justify-center flex-shrink-0 z-10 border border-slate-200">
            <ArrowRight className="w-4 h-4" />
          </div>
        );
    }
  };

  return (
    <div
      className={`bg-white rounded-[16px] border border-slate-200/80 p-5 shadow-sm flex flex-col justify-between ${className}`}
    >
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Recent Activity
            </h2>
          </div>

          <Link
            href="/admin/queue"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors group"
          >
            <span>View all</span>
            <span className="group-hover:translate-x-0.5 transition-transform">→</span>
          </Link>
        </div>

        {/* Activity List */}
        {isLoading ? (
          <div className="space-y-4 py-2 animate-pulse">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 bg-slate-100 rounded-xl w-full" />
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No recent activity recorded
          </div>
        ) : (
          <div className="relative space-y-4">
            {/* Vertical connector line */}
            <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-slate-100 -translate-x-1/2 z-0" />

            {activities.slice(0, 5).map((act) => (
              <div key={act.id} className="relative flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {getIcon(act.type)}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {act.title}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      by {act.actor}
                    </p>
                  </div>
                </div>

                <span className="text-[11px] text-slate-400 whitespace-nowrap flex-shrink-0 tabular-nums">
                  {act.relativeTime}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
