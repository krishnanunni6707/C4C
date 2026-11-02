"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Calendar,
  ChevronDown,
  FileText,
  RotateCw,
  Search,
} from "lucide-react";
import PageHeader from "../shared/PageHeader";
import StatusPill from "../shared/StatusPill";
import Pagination from "../shared/Pagination";
import EmptyState from "../shared/EmptyState";
import type { PrintJob } from "@/app/student/page";

export interface HistoryTabProps {
  allJobs: PrintJob[];
  onReprint?: (job: PrintJob) => void;
  onBackToHome?: () => void;
}

type DateRangeFilter = "7d" | "30d" | "90d" | "semester" | "all";
type StatusFilter = "ALL" | "COLLECTED" | "CANCELLED";

const DATE_RANGE_LABELS: Record<DateRangeFilter, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  semester: "This semester",
  all: "All time",
};

function formatHistoryDateTime(ts: unknown): string {
  if (!ts) return "—";
  if (typeof ts === "string" && ts.includes("•")) {
    return ts;
  }
  let date: Date;
  if (typeof ts === "object" && ts !== null && "seconds" in ts) {
    date = new Date((ts as { seconds: number }).seconds * 1000);
  } else if (typeof ts === "object" && ts !== null && "_seconds" in ts) {
    date = new Date((ts as { _seconds: number })._seconds * 1000);
  } else if (typeof ts === "string" || typeof ts === "number") {
    date = new Date(ts as string | number);
  } else {
    return "—";
  }

  if (isNaN(date.getTime())) return "—";

  const datePart = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(date);

  const timePart = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(date);

  return `${datePart} • ${timePart}`;
}

export default function HistoryTab({
  allJobs,
  onReprint,
  onBackToHome,
}: HistoryTabProps) {
  const [dateRange, setDateRange] = useState<DateRangeFilter>("30d");
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const dateDropdownRef = useRef<HTMLDivElement>(null);
  const pageSize = 5;

  // Debounce search query 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dateDropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(e.target as Node)) {
        setDateDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dateDropdownOpen]);

  // Toast auto-clear
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Filtering
  const filteredJobs = useMemo(() => {
    const now = Date.now();
    let cutoff = 0;
    if (dateRange === "7d") cutoff = now - 7 * 86400 * 1000;
    else if (dateRange === "30d") cutoff = now - 30 * 86400 * 1000;
    else if (dateRange === "90d") cutoff = now - 90 * 86400 * 1000;
    else if (dateRange === "semester") cutoff = now - 120 * 86400 * 1000;

    return allJobs.filter((job) => {
      // Date filter
      if (cutoff > 0 && job.createdAt) {
        let tsMs = 0;
        if (typeof job.createdAt === "object" && job.createdAt !== null && "seconds" in job.createdAt) {
          tsMs = (job.createdAt as { seconds: number }).seconds * 1000;
        } else if (typeof job.createdAt === "object" && job.createdAt !== null && "_seconds" in job.createdAt) {
          tsMs = (job.createdAt as { _seconds: number })._seconds * 1000;
        } else if (typeof job.createdAt === "string" || typeof job.createdAt === "number") {
          tsMs = new Date(job.createdAt).getTime();
        }
        const isExplicitFormatted = typeof job.createdAt === "string" && job.createdAt.includes("•");
        if (!isExplicitFormatted && tsMs > 0 && tsMs < cutoff) return false;
      }

      // Status chip filter
      if (statusFilter === "COLLECTED" && job.status !== "COLLECTED") return false;
      if (statusFilter === "CANCELLED" && job.status !== "CANCELLED") return false;

      // Search query
      if (debouncedQuery.trim()) {
        const q = debouncedQuery.toLowerCase().trim();
        const matchesToken = job.tokenNumber?.toLowerCase().includes(q);
        const matchesFile = job.fileName?.toLowerCase().includes(q);
        if (!matchesToken && !matchesFile) return false;
      }

      return true;
    });
  }, [allJobs, dateRange, statusFilter, debouncedQuery]);

  // Pagination slice
  const paginatedJobs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredJobs.slice(start, start + pageSize);
  }, [filteredJobs, currentPage, pageSize]);

  const handleReprintClick = (job: PrintJob) => {
    if (onReprint) {
      onReprint(job);
    } else {
      setToastMessage("File no longer available for automatic re-spooling. Please upload again.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Announcement */}
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-50 bg-[#0F172A] text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-xl animate-in slide-in-from-bottom duration-200"
        >
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <PageHeader
        title="Print History"
        subtitle="View your past print jobs."
        onBackToHome={onBackToHome}
      />

      {/* Filters Row */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* 1. Date Range Dropdown */}
          <div className="relative" ref={dateDropdownRef}>
            <button
              type="button"
              onClick={() => setDateDropdownOpen((o) => !o)}
              className="h-10 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-2 transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              aria-haspopup="listbox"
              aria-expanded={dateDropdownOpen}
            >
              <Calendar className="w-4 h-4 text-slate-400 stroke-[2]" />
              <span>{DATE_RANGE_LABELS[dateRange]}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {dateDropdownOpen && (
              <div
                role="listbox"
                className="absolute left-0 top-full mt-1.5 w-44 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-30 animate-in fade-in zoom-in-95 duration-100"
              >
                {(["7d", "30d", "90d", "semester", "all"] as DateRangeFilter[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setDateRange(key);
                      setDateDropdownOpen(false);
                      setCurrentPage(1);
                    }}
                    className={`w-full px-3.5 py-2 text-left text-xs font-medium transition-colors ${
                      dateRange === key
                        ? "bg-indigo-50 text-indigo-700 font-bold"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {DATE_RANGE_LABELS[key]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2. Status Chips */}
          <div className="flex items-center gap-1.5" role="group" aria-label="Status filter">
            <button
              type="button"
              onClick={() => {
                setStatusFilter("ALL");
                setCurrentPage(1);
              }}
              aria-pressed={statusFilter === "ALL"}
              className={`h-10 px-4 rounded-xl text-xs font-bold transition-all ${
                statusFilter === "ALL"
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              All
            </button>

            <button
              type="button"
              onClick={() => {
                setStatusFilter("COLLECTED");
                setCurrentPage(1);
              }}
              aria-pressed={statusFilter === "COLLECTED"}
              className={`h-10 px-3.5 rounded-xl text-xs font-semibold transition-all ${
                statusFilter === "COLLECTED"
                  ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20"
                  : "bg-emerald-50/70 border border-emerald-200/60 text-emerald-700 hover:bg-emerald-100/60"
              }`}
            >
              Collected
            </button>

            <button
              type="button"
              onClick={() => {
                setStatusFilter("CANCELLED");
                setCurrentPage(1);
              }}
              aria-pressed={statusFilter === "CANCELLED"}
              className={`h-10 px-3.5 rounded-xl text-xs font-semibold transition-all ${
                statusFilter === "CANCELLED"
                  ? "bg-rose-600 text-white shadow-sm shadow-rose-600/20"
                  : "bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Cancelled
            </button>
          </div>
        </div>

        {/* 3. Search Input */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 stroke-[2]" />
          <input
            type="text"
            placeholder="Search by token or file..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-3.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-sm transition-colors"
          />
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {filteredJobs.length === 0 ? (
          <EmptyState
            title="No print jobs yet"
            description="No matching print records found for the selected time range or filter."
            className="my-6 border-0 shadow-none"
          />
        ) : (
          <>
            {/* Desktop Table View (≥768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/60 text-[11px] font-bold text-slate-500 uppercase tracking-wider sticky top-0">
                    <th scope="col" className="py-3.5 px-6">
                      Date &amp; Time
                    </th>
                    <th scope="col" className="py-3.5 px-6">
                      File Name
                    </th>
                    <th scope="col" className="py-3.5 px-6">
                      Pages
                    </th>
                    <th scope="col" className="py-3.5 px-6">
                      Amount
                    </th>
                    <th scope="col" className="py-3.5 px-6">
                      Status
                    </th>
                    <th scope="col" className="py-3.5 px-6 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {paginatedJobs.map((job) => (
                    <tr
                      key={job.id}
                      className="h-14 hover:bg-slate-50/70 transition-colors"
                    >
                      {/* Date & Time */}
                      <td className="py-3.5 px-6 font-medium text-slate-600 whitespace-nowrap">
                        {formatHistoryDateTime(job.createdAt)}
                      </td>

                      {/* File Name */}
                      <td className="py-3.5 px-6 font-semibold text-[#0F172A] truncate max-w-[220px]">
                        <span title={job.fileName}>{job.fileName}</span>
                      </td>

                      {/* Pages */}
                      <td className="py-3.5 px-6 font-mono tabular-nums text-slate-600">
                        {job.totalPages}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-6 font-mono font-bold text-[#0F172A] tabular-nums">
                        ₹{job.amount.toFixed(2)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-6">
                        <StatusPill status={job.status} />
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-6 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <Link
                            href={`/student/token-slip/${job.id}`}
                            className="px-2.5 py-1.5 rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                          >
                            Receipt
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleReprintClick(job)}
                            className="px-2.5 py-1.5 rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                          >
                            Reprint
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Cards View (<768px) */}
            <div className="md:hidden divide-y divide-slate-100">
              {paginatedJobs.map((job) => (
                <div key={job.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-indigo-600 font-mono bg-indigo-50 px-2 py-0.5 rounded">
                        #{job.tokenNumber}
                      </span>
                      <h4 className="font-bold text-sm text-[#0F172A] mt-1 line-clamp-1">
                        {job.fileName}
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {formatHistoryDateTime(job.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-[#0F172A] font-mono tabular-nums">
                        ₹{job.amount.toFixed(2)}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {job.totalPages} pgs
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <StatusPill status={job.status} />

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/student/token-slip/${job.id}`}
                        className="px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50 text-xs font-semibold"
                      >
                        Receipt
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleReprintClick(job)}
                        className="px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50 text-xs font-semibold"
                      >
                        Reprint
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Footer */}
            <Pagination
              currentPage={currentPage}
              totalItems={filteredJobs.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>
    </div>
  );
}
