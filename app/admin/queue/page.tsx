"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import AdminHeader from "@/components/admin/AdminHeader";

// ── Types ─────────────────────────────────────────────────────────────────────

type JobStatus = "WAITING" | "PRINTING" | "READY" | "COLLECTED" | "CANCELLED";
type PaymentStatus = "PENDING" | "PAID";
type FilterStatus = "ALL" | JobStatus;

interface QueueJob {
  id: string;
  tokenNumber: string;
  studentName: string;
  admissionNumber: string;
  fileName: string;
  totalPages: number;
  copies: number;
  colorMode: "BW" | "COLOR";
  amount: number;
  paymentStatus: PaymentStatus;
  status: JobStatus;
  queuePosition: number;
  createdAt: { _seconds?: number; toDate?: () => Date } | string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(ts: QueueJob["createdAt"]): string {
  if (!ts) return "—";
  let date: Date;
  if (typeof ts === "object" && ts !== null && "_seconds" in ts && ts._seconds) {
    date = new Date(ts._seconds * 1000);
  } else if (typeof ts === "string") {
    date = new Date(ts);
  } else {
    return "—";
  }
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

const STATUS_COLORS: Record<JobStatus, string> = {
  WAITING: "bg-amber-100 text-amber-800",
  PRINTING: "bg-blue-100 text-blue-800",
  READY: "bg-green-100 text-green-800",
  COLLECTED: "bg-gray-100 text-gray-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const FILTER_TABS: { label: string; value: FilterStatus }[] = [
  { label: "All", value: "ALL" },
  { label: "Waiting", value: "WAITING" },
  { label: "Printing", value: "PRINTING" },
  { label: "Ready", value: "READY" },
  { label: "Collected", value: "COLLECTED" },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function QueuePage() {
  const [jobs, setJobs] = useState<QueueJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("ALL");
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/queue");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setJobs(data.jobs ?? []);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load queue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
    const id = setInterval(fetchJobs, 15_000);
    return () => clearInterval(id);
  }, [fetchJobs]);

  // ── Action handler ─────────────────────────────────────────────────────────

  async function doAction(jobId: string, endpoint: string) {
    const key = `${jobId}:${endpoint}`;
    setActionKey(key);
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/${endpoint}`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(body.error ?? "Action failed");
      }
      await fetchJobs();
    } finally {
      setActionKey(null);
    }
  }

  // ── Filtered list ──────────────────────────────────────────────────────────

  const displayed =
    filter === "ALL" ? jobs : jobs.filter((j) => j.status === filter);

  // ── Counts for tab badges ──────────────────────────────────────────────────

  const counts: Record<FilterStatus, number> = {
    ALL: jobs.length,
    WAITING: jobs.filter((j) => j.status === "WAITING").length,
    PRINTING: jobs.filter((j) => j.status === "PRINTING").length,
    READY: jobs.filter((j) => j.status === "READY").length,
    COLLECTED: jobs.filter((j) => j.status === "COLLECTED").length,
    CANCELLED: jobs.filter((j) => j.status === "CANCELLED").length,
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-8">
      <AdminHeader title="Queue Management" subtitle="Window-Based SJF ordering · auto-refreshes every 15s">
        <button
          onClick={fetchJobs}
          className="text-sm border border-gray-300 bg-white text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
        >
          🔄 Refresh
        </button>
      </AdminHeader>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 mb-6 w-fit">
        {FILTER_TABS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              filter === value
                ? "bg-gray-900 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {label}
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full ${
                filter === value ? "bg-gray-700 text-gray-200" : "bg-gray-100 text-gray-500"
              }`}
            >
              {counts[value]}
            </span>
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-16 text-center">
          <p className="text-gray-400">Loading queue…</p>
        </div>
      ) : displayed.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-16 text-center">
          <span className="text-5xl">📭</span>
          <p className="mt-4 text-gray-400 text-sm">
            {filter === "ALL" ? "No jobs yet" : `No ${filter.toLowerCase()} jobs`}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">#</th>
                  <th className="px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Token</th>
                  <th className="px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Student</th>
                  <th className="px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">File</th>
                  <th className="px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide text-right">Pgs</th>
                  <th className="px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide text-right">Copies</th>
                  <th className="px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide text-right">₹</th>
                  <th className="px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Payment</th>
                  <th className="px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Created</th>
                  <th className="px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {displayed.map((job) => {
                  const busy = actionKey !== null;
                  const isThisBusy = (ep: string) => actionKey === `${job.id}:${ep}`;
                  const terminal = job.status === "COLLECTED" || job.status === "CANCELLED";

                  return (
                    <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                      {/* Queue position */}
                      <td className="px-4 py-3 text-gray-400 text-xs font-mono">
                        {job.status === "WAITING" ? job.queuePosition : "—"}
                      </td>

                      {/* Token */}
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
                          {job.tokenNumber}
                        </span>
                      </td>

                      {/* Student */}
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 text-sm">{job.studentName}</p>
                        <p className="text-gray-400 text-xs">{job.admissionNumber}</p>
                      </td>

                      {/* File */}
                      <td className="px-4 py-3 max-w-[180px]">
                        <p className="text-gray-700 truncate text-xs" title={job.fileName}>
                          {job.fileName}
                        </p>
                        <p className="text-gray-400 text-xs">
                          {job.colorMode === "COLOR" ? "🎨 Color" : "⬛ B&W"}
                        </p>
                      </td>

                      {/* Pages */}
                      <td className="px-4 py-3 text-right text-gray-700 text-sm">{job.totalPages}</td>

                      {/* Copies */}
                      <td className="px-4 py-3 text-right text-gray-700 text-sm">{job.copies}</td>

                      {/* Amount */}
                      <td className="px-4 py-3 text-right font-semibold text-gray-900 text-sm">
                        ₹{job.amount}
                      </td>

                      {/* Payment status */}
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            job.paymentStatus === "PAID"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {job.paymentStatus}
                        </span>
                      </td>

                      {/* Job status */}
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[job.status]}`}
                        >
                          {job.status}
                        </span>
                      </td>

                      {/* Created */}
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                        {formatDate(job.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 flex-wrap min-w-[160px]">
                          {/* View */}
                          <Link
                            href={`/admin/queue/${job.id}`}
                            className="text-xs border border-gray-300 text-gray-600 px-2 py-1 rounded hover:bg-gray-50 transition-colors"
                          >
                            View
                          </Link>

                          {/* Verify payment */}
                          {job.paymentStatus === "PENDING" && !terminal && (
                            <ActionBtn
                              label="Mark Paid"
                              loadingLabel="…"
                              loading={isThisBusy("payment")}
                              disabled={busy}
                              color="bg-blue-600 hover:bg-blue-700"
                              onClick={() => doAction(job.id, "payment")}
                            />
                          )}

                          {/* Start printing */}
                          {job.paymentStatus === "PAID" && job.status === "WAITING" && (
                            <ActionBtn
                              label="Start"
                              loadingLabel="…"
                              loading={isThisBusy("start")}
                              disabled={busy}
                              color="bg-green-600 hover:bg-green-700"
                              onClick={() => doAction(job.id, "start")}
                            />
                          )}

                          {/* Mark ready */}
                          {job.status === "PRINTING" && (
                            <ActionBtn
                              label="Ready"
                              loadingLabel="…"
                              loading={isThisBusy("ready")}
                              disabled={busy}
                              color="bg-purple-600 hover:bg-purple-700"
                              onClick={() => doAction(job.id, "ready")}
                            />
                          )}

                          {/* Mark collected */}
                          {job.status === "READY" && (
                            <ActionBtn
                              label="Collected"
                              loadingLabel="…"
                              loading={isThisBusy("collect")}
                              disabled={busy}
                              color="bg-gray-600 hover:bg-gray-700"
                              onClick={() => doAction(job.id, "collect")}
                            />
                          )}

                          {/* Cancel */}
                          {!terminal && (
                            <ActionBtn
                              label="Cancel"
                              loadingLabel="…"
                              loading={isThisBusy("cancel")}
                              disabled={busy}
                              color="bg-red-500 hover:bg-red-600"
                              onClick={() => {
                                if (confirm(`Cancel job ${job.tokenNumber}?`))
                                  doAction(job.id, "cancel");
                              }}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Small inline action button ─────────────────────────────────────────────────

function ActionBtn({
  label,
  loadingLabel,
  loading,
  disabled,
  color,
  onClick,
}: {
  label: string;
  loadingLabel: string;
  loading: boolean;
  disabled: boolean;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`text-xs text-white px-2 py-1 rounded transition-colors disabled:opacity-40 ${color}`}
      disabled={disabled}
      onClick={onClick}
    >
      {loading ? loadingLabel : label}
    </button>
  );
}
