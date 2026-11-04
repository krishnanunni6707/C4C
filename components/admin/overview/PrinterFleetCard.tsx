"use client";

import React from "react";
import Link from "next/link";
import { Printer } from "lucide-react";
import type { OverviewPrinter } from "@/lib/admin/overview";

interface PrinterFleetCardProps {
  printers: OverviewPrinter[];
  isLoading?: boolean;
  className?: string;
}

export default function PrinterFleetCard({
  printers,
  isLoading = false,
  className = "",
}: PrinterFleetCardProps) {
  return (
    <div
      className={`bg-white rounded-[16px] border border-slate-200/80 p-5 shadow-sm flex flex-col justify-between ${className}`}
    >
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Printer Fleet Status
            </h2>
          </div>

          <Link
            href="/admin/settings"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors group"
          >
            <span>View all</span>
            <span className="group-hover:translate-x-0.5 transition-transform">→</span>
          </Link>
        </div>

        {/* Printer list */}
        {isLoading ? (
          <div className="space-y-4 py-2 animate-pulse">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-14 bg-slate-100 rounded-xl w-full" />
            ))}
          </div>
        ) : printers.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm font-medium text-slate-500">No printers added</p>
            <Link
              href="/admin/settings"
              className="text-xs text-indigo-600 font-semibold hover:underline mt-1 inline-block"
            >
              Configure printers in Settings →
            </Link>
          </div>
        ) : (
          <div className="space-y-3.5">
            {printers.slice(0, 4).map((printer) => {
              const isOnline = printer.status === "ONLINE";
              return (
                <div
                  key={printer.id}
                  className="flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-slate-50/80 transition-colors"
                >
                  {/* Left: Icon + details */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0">
                      <Printer className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {printer.name}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {printer.location || "Default Location"}
                      </p>
                    </div>
                  </div>

                  {/* Right: Status dot + Load Bar */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {/* Status Dot & Label */}
                    <div className="flex items-center gap-1.5 w-16">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isOnline ? "bg-emerald-500" : "bg-rose-500"
                        }`}
                      />
                      <span
                        className={`text-xs font-semibold ${
                          isOnline ? "text-emerald-700" : "text-rose-600"
                        }`}
                      >
                        {isOnline ? "Online" : "Offline"}
                      </span>
                    </div>

                    {/* Load bar */}
                    <div className="flex items-center gap-2">
                      <div className="w-20 sm:w-28 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isOnline ? "bg-emerald-500" : "bg-transparent"
                          }`}
                          style={{ width: `${isOnline ? printer.loadPercent : 0}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-slate-600 tabular-nums w-8 text-right">
                        {isOnline ? `${printer.loadPercent}%` : "0%"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
