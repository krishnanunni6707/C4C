"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import StatusChip from "./StatusChip";
import { formatKolkataDateTime } from "@/lib/admin/job-date";

interface JobHeaderProps {
  tokenNumber: string;
  status: string;
  colorMode: string;
  printType: string;
  createdAt: any;
  className?: string;
}

export default function JobHeader({
  tokenNumber,
  status,
  colorMode,
  printType,
  createdAt,
  className = "",
}: JobHeaderProps) {
  const formattedCreated = formatKolkataDateTime(createdAt, { includeYear: true });

  return (
    <div className={`space-y-3 ${className}`}>
      {/* 1. Back link */}
      <div>
        <Link
          href="/admin/queue"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
          <span>Back to Queue</span>
        </Link>
      </div>

      {/* 2. Main Row: H1 Token + Chips + Created timestamp */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-black text-slate-900 tracking-tight font-mono leading-none">
            {tokenNumber}
          </h1>

          <div className="flex flex-wrap items-center gap-2">
            <StatusChip type="status" value={status} />
            <StatusChip type="colorMode" value={colorMode} />
            <StatusChip type="sides" value={printType} />
          </div>
        </div>

        {/* Right aligned created timestamp */}
        <div className="text-xs sm:text-sm font-medium text-slate-500 whitespace-nowrap">
          <span>Created: </span>
          <span className="text-slate-700 font-semibold">{formattedCreated}</span>
        </div>
      </div>
    </div>
  );
}
