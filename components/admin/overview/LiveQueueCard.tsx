"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ListOrdered } from "lucide-react";
import type { OverviewLiveJob } from "@/lib/admin/overview";

interface LiveQueueCardProps {
  jobs: OverviewLiveJob[];
  isLoading?: boolean;
  lastUpdatedText?: string;
  className?: string;
}

export default function LiveQueueCard({
  jobs,
  isLoading = false,
  lastUpdatedText = "Updated just now",
  className = "",
}: LiveQueueCardProps) {
  const router = useRouter();

  const getStatusPill = (status: OverviewLiveJob["status"]) => {
    switch (status) {
      case "PRINTING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
            Printing
          </span>
        );
      case "WAITING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-100">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Waiting
          </span>
        );
      case "READY":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Ready
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            {status}
          </span>
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
            <ListOrdered className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Live Print Queue
            </h2>
            <span className="text-[11px] text-slate-400 font-normal ml-2 hidden sm:inline-block">
              {lastUpdatedText}
            </span>
          </div>

          <Link
            href="/admin/queue"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors group"
          >
            <span>View all</span>
            <span className="group-hover:translate-x-0.5 transition-transform">→</span>
          </Link>
        </div>

        {/* Table Content */}
        {isLoading ? (
          <div className="space-y-3 py-4 animate-pulse">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-9 bg-slate-100 rounded-lg w-full" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm font-medium text-slate-500">Queue is clear</p>
            <p className="text-xs text-slate-400 mt-1">No pending print jobs in the queue.</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-medium">
                  <th scope="col" className="pb-2.5 font-medium pl-1 w-8">#</th>
                  <th scope="col" className="pb-2.5 font-medium">Token</th>
                  <th scope="col" className="pb-2.5 font-medium">Student</th>
                  <th scope="col" className="pb-2.5 font-medium">File Name</th>
                  <th scope="col" className="pb-2.5 font-medium text-center">Pages × Copies</th>
                  <th scope="col" className="pb-2.5 font-medium text-center">Status</th>
                  <th scope="col" className="pb-2.5 font-medium text-right pr-1">Wait Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {jobs.map((job, idx) => (
                  <tr
                    key={job.id}
                    onClick={() => router.push(`/admin/queue/${job.id}`)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                  >
                    <td className="py-2.5 pl-1 font-medium text-slate-400 tabular-nums">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 font-mono font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {job.tokenNumber}
                    </td>
                    <td className="py-2.5 font-semibold text-slate-800 truncate max-w-[120px]">
                      {job.studentName}
                    </td>
                    <td className="py-2.5 text-slate-600 truncate max-w-[150px]" title={job.fileName}>
                      {job.fileName}
                    </td>
                    <td className="py-2.5 text-center text-slate-700 font-medium tabular-nums">
                      {`${job.totalPages} × ${job.copies}`}
                    </td>
                    <td className="py-2.5 text-center">
                      {getStatusPill(job.status)}
                    </td>
                    <td className="py-2.5 text-right pr-1 font-medium text-slate-600 tabular-nums">
                      {`${job.waitTimeMin} min`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
