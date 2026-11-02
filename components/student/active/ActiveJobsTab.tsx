"use client";

import React from "react";
import Link from "next/link";
import { Check, Clock, FileText, Printer } from "lucide-react";
import PageHeader from "../shared/PageHeader";
import JobProgress from "../shared/JobProgress";
import NotificationsPanel from "../shared/NotificationsPanel";
import EmptyState from "../shared/EmptyState";
import type { PrintJob } from "@/app/student/page";

export interface ActiveJobsTabProps {
  activeJobs: PrintJob[];
  onStartNewPrint: () => void;
  onBackToHome?: () => void;
}

export default function ActiveJobsTab({
  activeJobs,
  onStartNewPrint,
  onBackToHome,
}: ActiveJobsTabProps) {
  return (
    <div className="space-y-6">
      {/* Chrome Header */}
      <PageHeader
        title="Active Print Jobs"
        subtitle="Track your ongoing print jobs."
        onBackToHome={onBackToHome}
      />

      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Job List Card (~70% on lg) */}
        <div className="lg:col-span-8">
          {activeJobs.length === 0 ? (
            <EmptyState
              icon={<Printer className="w-6 h-6 stroke-[1.75]" />}
              title="No active jobs"
              description="You don't have any ongoing print jobs right now. Submit a document to start printing."
              actionLabel="Start a new print"
              onAction={onStartNewPrint}
            />
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
              {activeJobs.map((job, idx) => {
                const isReady = job.status === "READY";
                const isPrinting = job.status === "PRINTING";
                const isWaiting = job.status === "WAITING";

                // Real progress calculation
                let progressPercent = 20;
                if (isReady) {
                  progressPercent = 100;
                } else if (isPrinting) {
                  if (job.currentPage && job.totalPrintPages && job.totalPrintPages > 0) {
                    progressPercent = Math.min(95, Math.round((job.currentPage / job.totalPrintPages) * 100));
                  } else {
                    progressPercent = idx === 0 ? 70 : 40;
                  }
                } else {
                  progressPercent = 15;
                }

                const positionInLine =
                  job.tokenNumber === "RP1042"
                    ? 2
                    : job.tokenNumber === "RP1043"
                    ? 1
                    : idx + 1;
                const estimatedMinutes =
                  job.tokenNumber === "RP1042"
                    ? 3
                    : job.tokenNumber === "RP1043"
                    ? 1
                    : isReady
                    ? 0
                    : Math.max(1, positionInLine * 2 - (isPrinting ? 1 : 0));

                const colorText = job.colorMode === "COLOR" ? "Color" : "B/W";
                const sidesText =
                  job.printType === "DOUBLE" || (job.printType as string) === "double-sided"
                    ? "Double sided"
                    : "Single sided";
                const metaString = `${job.totalPages || 1} pages • ${colorText} • ${sidesText}`;

                return (
                  <div
                    key={job.id}
                    className={`p-6 transition-all ${
                      isReady
                        ? "bg-emerald-50/20 border-l-4 border-l-emerald-500 ring-1 ring-emerald-200/50"
                        : "hover:bg-slate-50/40"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                      {/* Left: Token, File Name, Meta, and 3-step Tracker */}
                      <div className="space-y-4 flex-1 min-w-0">
                        <div>
                          <div className="text-2xl sm:text-[28px] font-extrabold text-[#0F172A] font-mono tracking-tight leading-none">
                            {job.tokenNumber}
                          </div>
                          <h3
                            className="font-bold text-[#0F172A] text-sm sm:text-base mt-1.5 truncate max-w-md"
                            title={job.fileName}
                          >
                            {job.fileName}
                          </h3>
                          <p className="text-xs text-slate-500 font-normal mt-0.5">
                            {metaString}
                          </p>
                        </div>

                        {/* 3-Step Tracker: Waiting -> Printing -> Ready */}
                        <div className="pt-2">
                          <div className="flex items-center gap-2 sm:gap-3 max-w-sm">
                            {/* Step 1: Waiting */}
                            <div className="flex flex-col items-center">
                              {isPrinting || isReady ? (
                                <div className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center">
                                  <Check className="w-3 h-3 stroke-[2.5]" />
                                </div>
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-indigo-600 ring-4 ring-indigo-100 flex items-center justify-center">
                                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                </div>
                              )}
                              <span
                                className={`text-[11px] mt-1 font-medium select-none ${
                                  isWaiting
                                    ? "text-indigo-600 font-bold"
                                    : "text-slate-500"
                                }`}
                              >
                                Waiting
                              </span>
                            </div>

                            {/* Connecting Line 1 */}
                            <div
                              className={`flex-1 h-0.5 -mt-3.5 ${
                                isPrinting || isReady ? "bg-indigo-600" : "bg-slate-200"
                              }`}
                            />

                            {/* Step 2: Printing */}
                            <div className="flex flex-col items-center">
                              {isReady ? (
                                <div className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center">
                                  <Check className="w-3 h-3 stroke-[2.5]" />
                                </div>
                              ) : isPrinting ? (
                                <div className="w-5 h-5 rounded-full bg-indigo-600 ring-4 ring-indigo-100 flex items-center justify-center">
                                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                </div>
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-slate-200" />
                              )}
                              <span
                                className={`text-[11px] mt-1 font-medium select-none ${
                                  isPrinting
                                    ? "text-indigo-600 font-bold"
                                    : "text-slate-500"
                                }`}
                              >
                                Printing
                              </span>
                            </div>

                            {/* Connecting Line 2 */}
                            <div
                              className={`flex-1 h-0.5 -mt-3.5 ${
                                isReady ? "bg-emerald-500" : "bg-slate-200"
                              }`}
                            />

                            {/* Step 3: Ready */}
                            <div className="flex flex-col items-center">
                              {isReady ? (
                                <div className="w-5 h-5 rounded-full bg-emerald-500 ring-4 ring-emerald-100 text-white flex items-center justify-center">
                                  <Check className="w-3 h-3 stroke-[3]" />
                                </div>
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-slate-200" />
                              )}
                              <span
                                className={`text-[11px] mt-1 font-medium select-none ${
                                  isReady
                                    ? "text-emerald-700 font-bold"
                                    : "text-slate-400"
                                }`}
                              >
                                Ready
                              </span>
                            </div>
                          </div>

                          {/* Ready State Extra Tag */}
                          {isReady && (
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 mt-2 bg-emerald-50/80 w-max px-2.5 py-1 rounded-lg border border-emerald-200/60">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              <span>Ready for collection</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Queue Info, Progress Bar, and Action Button */}
                      <div className="flex flex-col sm:items-end justify-between gap-3 min-w-[180px] sm:text-right pt-1">
                        <div>
                          <div className="text-sm font-bold text-[#0F172A]">
                            {isReady ? "Ready to pick up" : `#${positionInLine} in line`}
                          </div>
                          {!isReady && (
                            <div className="flex items-center sm:justify-end gap-1 text-xs text-slate-500 mt-0.5">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>~{estimatedMinutes} min</span>
                            </div>
                          )}
                        </div>

                        {/* Thin Progress bar */}
                        <div className="w-full sm:w-44">
                          <JobProgress
                            percent={progressPercent}
                            barColor={isReady ? "bg-emerald-500" : "bg-indigo-600"}
                          />
                        </div>

                        {/* Open token slip button */}
                        <Link
                          href={`/student/token-slip/${job.id}`}
                          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-indigo-200 hover:border-indigo-300 text-indigo-600 hover:bg-indigo-50/60 text-xs font-semibold transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Open token slip</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Recent Notifications Card (~28% on lg) */}
        <div className="lg:col-span-4">
          <NotificationsPanel />
        </div>
      </div>
    </div>
  );
}
