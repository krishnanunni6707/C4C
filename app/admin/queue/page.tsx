"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePrinter, DuplexMode } from "@/lib/hooks/usePrinter";

type JobStatus = "WAITING" | "PRINTING" | "READY" | "COLLECTED" | "CANCELLED";
type FilterStatus = "ALL" | JobStatus;

interface QueueJob {
  id: string;
  tokenNumber: string;
  studentName: string;
  admissionNumber: string;
  fileName: string;
  fileUrl: string;
  totalPages: number;
  copies: number;
  colorMode: "BW" | "COLOR";
  printType: string;
  amount: number;
  paymentStatus: "PENDING" | "PAID";
  status: JobStatus;
  queuePosition: number;
  locationId?: string;
  locationName?: string;
  createdAt: { _seconds?: number } | string | null;
}

function formatDate(ts: QueueJob["createdAt"]): string {
  if (!ts) return "—";
  let d: Date;
  if (typeof ts === "object" && ts !== null && "_seconds" in ts && ts._seconds) {
    d = new Date(ts._seconds * 1000);
  } else if (typeof ts === "string") {
    d = new Date(ts);
  } else return "—";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

const STATUS_STYLE: Record<JobStatus, string> = {
  WAITING:   "bg-yellow-400/10 text-yellow-400 border-yellow-400/20",
  PRINTING:  "bg-[#54b4eb]/10 text-[#54b4eb] border-[#54b4eb]/20",
  READY:     "bg-green-400/10 text-green-400 border-green-400/20",
  COLLECTED: "bg-gray-400/10 text-gray-400 border-gray-400/20",
  CANCELLED: "bg-red-400/10 text-red-400 border-red-400/20",
};

const STATUS_DOT: Record<JobStatus, string> = {
  WAITING:   "bg-yellow-400",
  PRINTING:  "bg-[#54b4eb] animate-pulse",
  READY:     "bg-green-400",
  COLLECTED: "bg-gray-400",
  CANCELLED: "bg-red-400",
};

const FILTERS: { label: string; value: FilterStatus }[] = [
  { label: "All Tasks", value: "ALL" },
  { label: "Waiting",   value: "WAITING" },
  { label: "Printing",  value: "PRINTING" },
  { label: "Ready",     value: "READY" },
  { label: "Collected", value: "COLLECTED" },
];

export interface Printer {
  id: string;
  name: string;
  location: string;
  status: "ONLINE" | "OFFLINE";
}

export default function QueuePage() {
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";
  const { connectionStatus, handlePrint } = usePrinter();

  const [jobs, setJobs] = useState<QueueJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("ALL");
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [printers, setPrinters] = useState<Printer[]>([]);
  const [selectedPrinters, setSelectedPrinters] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/queue");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setJobs((await res.json()).jobs ?? []);
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

  useEffect(() => {
    fetch("/api/admin/printers")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.printers) setPrinters(data.printers);
      })
      .catch(() => {});
  }, []);

  async function doAction(jobId: string, endpoint: string) {
    const key = `${jobId}:${endpoint}`;
    setActionKey(key);
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/${endpoint}`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(body.error ?? "Action failed");
      }
      await fetchJobs();
    } finally {
      setActionKey(null);
    }
  }

  async function printJob(job: QueueJob) {
    const printerId = selectedPrinters[job.id];
    if (!printerId) {
      alert("Please select a printer first.");
      return;
    }

    const printerName = printers.find((p) => p.id === printerId)?.name;
    if (!printerName) {
      alert("Selected printer was not found.");
      return;
    }

    if (connectionStatus !== "connected") {
      alert("QDoc printer client is not connected. Please run the desktop client on this admin computer and keep this page open.");
      return;
    }

    const key = `${job.id}:print`;
    setActionKey(key);
    try {
      const fileRes = await fetch(`/api/admin/jobs/${job.id}/file`);
      const fileData = await fileRes.json().catch(() => ({}));
      if (!fileRes.ok || !fileData.base64Data) {
        throw new Error(fileData.error ?? "Failed to load uploaded file.");
      }

      const duplex: DuplexMode = job.printType === "DOUBLE" ? "duplex" : "single";
      const dispatched = handlePrint(String(fileData.base64Data), {
        targetPrinter: printerName,
        copies: job.copies,
        duplex,
      });

      if (!dispatched) {
        throw new Error("Could not send the job to the QDoc printer client.");
      }

      if (job.paymentStatus === "PENDING") {
        const paidRes = await fetch(`/api/admin/jobs/${job.id}/payment`, { method: "POST" });
        if (!paidRes.ok) throw new Error("Printed locally, but payment update failed.");
      }

      if (job.status === "WAITING") {
        const startRes = await fetch(`/api/admin/jobs/${job.id}/start`, { method: "POST" });
        if (!startRes.ok) throw new Error("Printed locally, but job status update failed.");
      }

      await fetchJobs();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Print action failed.");
    } finally {
      setActionKey(null);
    }
  }

  const displayed = (filter === "ALL" ? jobs : jobs.filter((j) => j.status === filter)).filter((j) => {
    const q = search.toLowerCase();
    return (
      !q ||
      j.studentName.toLowerCase().includes(q) ||
      j.admissionNumber.toLowerCase().includes(q) ||
      j.tokenNumber.toLowerCase().includes(q) ||
      j.fileName.toLowerCase().includes(q)
    );
  });
  const counts: Record<FilterStatus, number> = {
    ALL:       jobs.length,
    WAITING:   jobs.filter((j) => j.status === "WAITING").length,
    PRINTING:  jobs.filter((j) => j.status === "PRINTING").length,
    READY:     jobs.filter((j) => j.status === "READY").length,
    COLLECTED: jobs.filter((j) => j.status === "COLLECTED").length,
    CANCELLED: jobs.filter((j) => j.status === "CANCELLED").length,
  };

  return (
    <div className="p-7 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Queue Management</h1>
          <p className="text-xs text-gray-500 mt-0.5">Window-SJF · auto-refreshes every 15s</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="glass-card rounded-xl px-4 py-2 flex items-center gap-2 text-xs text-gray-400">
            <span className={`w-1.5 h-1.5 rounded-full inline-block ${connectionStatus === "connected" ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
            QDOC CLIENT: {connectionStatus === "connected" ? "CONNECTED" : "OFFLINE"}
          </div>
          <button
            onClick={fetchJobs}
            className="glass-card hover:border-indigo-500/40 text-gray-400 hover:text-white rounded-xl px-3 py-2 text-xs font-semibold transition-colors"
          >
            ↺ Refresh
          </button>
          <button className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-4 py-2 text-xs font-bold transition-colors flex items-center gap-1.5">
            + Manual Entry
          </button>
        </div>
      </div>

      {/* Stat chips */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "TOTAL QUEUE",    value: String(counts.ALL).padStart(3, "0"),     sub: "+12% vs avg",  subColor: "text-indigo-400" },
          { label: "WAITING",        value: String(counts.WAITING).padStart(2, "0"), sub: "in queue",     subColor: "text-gray-500" },
          { label: "PRINTING",       value: String(counts.PRINTING).padStart(2, "0"),sub: "active",       subColor: "text-[#54b4eb]" },
          { label: "READY",          value: String(counts.READY).padStart(2, "0"),   sub: "for pickup",   subColor: "text-green-400" },
        ].map((s) => (
          <div key={s.label} className="glass-card rounded-2xl p-5">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{s.label}</p>
            <p className="text-4xl font-extrabold text-white mt-2 leading-none">{s.value}</p>
            <p className={`text-xs mt-1.5 font-medium ${s.subColor}`}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-1 glass-card rounded-xl p-1">
          {FILTERS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === value
                  ? "bg-indigo-600 text-white shadow"
                  : "text-gray-400 hover:text-gray-200 hover:bg-white/[0.05]"
              }`}
            >
              {label}
              {value !== "ALL" && (
                <span className={`ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full ${filter === value ? "bg-indigo-500 text-white" : "bg-[#1e2235] text-gray-500"}`}>
                  {counts[value]}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search queue..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-56 bg-[#111322] border border-[#1e2235] hover:border-indigo-500/40 text-white placeholder-gray-600 text-xs rounded-xl px-3.5 py-2 outline-none transition-all"
          />
          <button className="flex items-center gap-1.5 text-xs text-gray-400 border border-[#1e2235] bg-[#111322] hover:border-indigo-500/40 rounded-xl px-3 py-2 transition-colors">
            ⚙ Advanced Filters
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-xs font-mono">
          ⚠ {error}
        </div>
      )}

      {/* Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[80px_1fr_1.1fr_1fr_120px_140px] gap-4 px-5 py-3 glass-header">
          {["ID", "STUDENT", "FILE DETAILS", "PAGES / TYPE", "STATUS", "ACTIONS"].map((h) => (
            <p key={h} className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{h}</p>
          ))}
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-gray-600 mt-3">Loading queue…</p>
          </div>
        ) : displayed.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-3xl mb-3">📭</p>
            <p className="text-sm text-gray-600">{filter === "ALL" ? "No jobs in queue" : `No ${filter.toLowerCase()} jobs`}</p>
          </div>
        ) : (
          displayed.map((job) => {
            const busy = actionKey !== null;
            const isThisBusy = (ep: string) => actionKey === `${job.id}:${ep}`;
            const terminal = job.status === "COLLECTED" || job.status === "CANCELLED";
            const initials = job.studentName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

            return (
              <div
                key={job.id}
                className="grid grid-cols-[80px_1fr_1.1fr_1fr_120px_140px] gap-4 items-center px-5 py-4 border-b border-white/[0.06]/60 hover:bg-white/[0.04] transition-colors"
              >
                {/* ID / token */}
                <div>
                  <p className="text-xs font-bold text-indigo-400 font-mono">#{job.tokenNumber}</p>
                  {job.status === "WAITING" && (
                    <p className="text-[9px] text-gray-600 font-mono mt-0.5">pos {job.queuePosition}</p>
                  )}
                </div>

                {/* Student */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center text-indigo-400 text-[10px] font-bold flex-shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{job.studentName}</p>
                    <p className="text-[10px] text-gray-500 font-mono">{job.admissionNumber}</p>
                  </div>
                </div>

                {/* File details */}
                <div className="min-w-0">
                  <p className="text-xs text-gray-200 truncate font-mono" title={job.fileName}>{job.fileName}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {job.colorMode === "COLOR" ? "Color" : "B&W"} • {job.printType === "DOUBLE" ? "Double-sided" : "Single"}
                    {isSuperAdmin && job.locationName && ` • ${job.locationName}`}
                  </p>
                </div>

                {/* Pages / type */}
                <div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {job.totalPages * job.copies} Pages
                  </span>
                  <p className="text-[10px] text-gray-500 mt-1">
                    {job.colorMode === "COLOR" ? "Full Color" : "B&W"} • {job.copies > 1 ? `×${job.copies}` : "Single copy"}
                  </p>
                </div>

                {/* Status */}
                <div>
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold ${STATUS_STYLE[job.status]}`}>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[job.status]}`} />
                    {job.status}
                  </div>
                  <p className="text-[9px] text-gray-600 mt-1">{formatDate(job.createdAt)}</p>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1.5">
                  <Link href={`/admin/queue/${job.id}`} className="text-[10px] text-center border border-[#1e2235] hover:border-indigo-500/40 text-gray-400 hover:text-white px-2 py-1 rounded-lg transition-colors">
                    View
                  </Link>
                  {!terminal && !isSuperAdmin && (
                    <>
                      {(job.paymentStatus === "PENDING" || (job.paymentStatus === "PAID" && job.status === "WAITING")) && (
                        <div className="flex flex-col gap-1">
                          <select
                            value={selectedPrinters[job.id] || ""}
                            onChange={(e) => setSelectedPrinters((prev) => ({ ...prev, [job.id]: e.target.value }))}
                            className="text-[10px] bg-white/[0.04] border border-white/[0.08] hover:border-indigo-500/40 text-gray-300 rounded px-1.5 py-1 outline-none transition-colors"
                          >
                            <option value="" disabled>Select Printer</option>
                            {printers.map((p) => (
                              <option key={p.id} value={p.id} className="bg-[#0f111a]">
                                {p.name} ({p.status})
                              </option>
                            ))}
                          </select>
                          <button
                            disabled={busy}
                            onClick={() => printJob(job)}
                            className="text-[10px] bg-blue-600/80 hover:bg-blue-600 text-white px-2 py-1 rounded-lg disabled:opacity-40 transition-colors"
                          >
                            {isThisBusy("print") ? "Sending..." : "Print"}
                          </button>
                        </div>
                      )}
                      {job.paymentStatus === "PAID" && (
                        <button disabled={busy} onClick={() => doAction(job.id, "unpay")}
                          className="text-[9px] border border-orange-500/25 hover:border-orange-500 text-orange-400 hover:text-white px-2 py-0.5 rounded-lg disabled:opacity-40 transition-colors">
                          {isThisBusy("unpay") ? "…" : "Mark Unpaid"}
                        </button>
                      )}
                      {job.status === "PRINTING" && (
                        <button disabled={busy} onClick={() => doAction(job.id, "ready")}
                          className="text-[10px] bg-purple-600/80 hover:bg-purple-600 text-white px-2 py-1 rounded-lg disabled:opacity-40 transition-colors">
                          {isThisBusy("ready") ? "…" : "Ready"}
                        </button>
                      )}
                      {job.status === "READY" && (
                        <button disabled={busy} onClick={() => doAction(job.id, "collect")}
                          className="text-[10px] bg-gray-600/80 hover:bg-gray-600 text-white px-2 py-1 rounded-lg disabled:opacity-40 transition-colors">
                          {isThisBusy("collect") ? "…" : "Collect"}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Footer */}
        {displayed.length > 0 && (
          <div className="px-5 py-3 flex items-center justify-between border-t border-white/[0.06]">
            <p className="text-[10px] text-gray-500">Showing {displayed.length} of {jobs.length} items in queue</p>
          </div>
        )}
      </div>
    </div>
  );
}
