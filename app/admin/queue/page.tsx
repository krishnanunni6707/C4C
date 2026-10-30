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
  lastPrintError?: string;
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

const STATUS_BADGE: Record<JobStatus, string> = {
  WAITING:   "badge-waiting",
  PRINTING:  "badge-printing",
  READY:     "badge-ready",
  COLLECTED: "badge-collected",
  CANCELLED: "badge-cancelled",
};

const STATUS_DOT: Record<JobStatus, string> = {
  WAITING:   "bg-amber-400",
  PRINTING:  "bg-blue-400 animate-pulse",
  READY:     "bg-green-500",
  COLLECTED: "bg-gray-400",
  CANCELLED: "bg-red-400",
};

const FILTERS: { label: string; value: FilterStatus }[] = [
  { label: "All",       value: "ALL" },
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
  const { connectionStatus, handlePrint, printFile } = usePrinter();

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
      .then((data) => { if (data?.printers) setPrinters(data.printers); })
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
    } finally { setActionKey(null); }
  }

  async function printJob(job: QueueJob) {
    const printerId = selectedPrinters[job.id];
    if (!printerId) { alert("Please select a printer first."); return; }
    const printerName = printers.find((p) => p.id === printerId)?.name;
    if (!printerName) { alert("Selected printer was not found."); return; }
    if (connectionStatus !== "connected") {
      alert("QDoc printer client is not connected. Please run the desktop client on this admin computer and keep this page open.");
      return;
    }
    const key = `${job.id}:print`;
    setActionKey(key);
    try {
      // 1. Mark status as PRINTING if currently WAITING
      if (job.status === "WAITING") {
        const startRes = await fetch(`/api/admin/jobs/${job.id}/start`, { method: "POST" });
        if (!startRes.ok) {
          const errJson = await startRes.json().catch(() => ({}));
          throw new Error(errJson.error ?? "Failed to mark job as PRINTING on server.");
        }
      }

      // 2. Fetch authenticated binary file stream
      const fileRes = await fetch(`/api/admin/jobs/${job.id}/file`);
      if (!fileRes.ok) {
        const errJson = await fileRes.json().catch(() => ({}));
        throw new Error(errJson.error ?? `Failed to load uploaded file (HTTP ${fileRes.status}).`);
      }
      const blob = await fileRes.blob();
      let base64Data: string | undefined = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const res = reader.result as string;
          resolve(res.includes(",") ? res.split(",")[1] : res);
        };
        reader.onerror = () => reject(new Error("Failed to read file data into memory."));
        reader.readAsDataURL(blob);
      });

      const duplex: DuplexMode = job.printType === "DOUBLE" ? "duplex" : "single";

      try {
        // 3. Dispatch to local daemon and wait for spooler confirmation
        const result = await printFile({
          base64Data,
          targetPrinter: printerName,
          copies: job.copies,
          duplex,
          jobId: job.id,
        });

        // 4. Memory cleanup
        base64Data = undefined;

        if (!result.success) {
          throw new Error(result.message || "Print failed on physical daemon.");
        }

        // 5. Confirm success back to server: PRINTING -> READY
        const readyRes = await fetch(`/api/admin/jobs/${job.id}/ready`, { method: "POST" });
        if (!readyRes.ok) {
          console.warn("Spooler completed but mark ready failed:", await readyRes.text());
        }
      } catch (printErr: unknown) {
        base64Data = undefined;
        const errMsg = printErr instanceof Error ? printErr.message : "Print execution failed";

        // 6. Return job to WAITING with error note on failure!
        await fetch(`/api/admin/jobs/${job.id}/fail`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: errMsg }),
        }).catch(() => {});

        throw printErr;
      }

      await fetchJobs();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Print action failed.");
      await fetchJobs();
    } finally { setActionKey(null); }
  }

  const displayed = (filter === "ALL" ? jobs : jobs.filter((j) => j.status === filter)).filter((j) => {
    const q = search.toLowerCase();
    return !q || j.studentName.toLowerCase().includes(q) || j.admissionNumber.toLowerCase().includes(q) || j.tokenNumber.toLowerCase().includes(q) || j.fileName.toLowerCase().includes(q);
  });

  const counts: Record<FilterStatus, number> = {
    ALL: jobs.length,
    WAITING: jobs.filter((j) => j.status === "WAITING").length,
    PRINTING: jobs.filter((j) => j.status === "PRINTING").length,
    READY: jobs.filter((j) => j.status === "READY").length,
    COLLECTED: jobs.filter((j) => j.status === "COLLECTED").length,
    CANCELLED: jobs.filter((j) => j.status === "CANCELLED").length,
  };

  return (
    <div className="p-6 space-y-5 bg-[#F8FAFC] min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Queue Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Window-SJF · auto-refreshes every 15s</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 flex items-center gap-2 text-xs text-gray-600 shadow-sm">
            <span className={`w-1.5 h-1.5 rounded-full inline-block ${connectionStatus === "connected" ? "bg-green-500 animate-pulse" : "bg-red-400"}`} />
            QDoc Client: {connectionStatus === "connected" ? "Connected" : "Offline"}
          </div>
          <button onClick={fetchJobs} className="bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg px-3 py-2 text-xs font-medium transition-colors shadow-sm">
            ↺ Refresh
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Queue",  value: counts.ALL,      color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Waiting",      value: counts.WAITING,  color: "text-amber-600",  bg: "bg-amber-50" },
          { label: "Printing",     value: counts.PRINTING, color: "text-blue-600",   bg: "bg-blue-50" },
          { label: "Ready",        value: counts.READY,    color: "text-green-600",  bg: "bg-green-50" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <p className="text-xs text-gray-500 font-medium">{s.label}</p>
            <p className={`text-3xl font-semibold mt-1 ${s.color}`}>{String(s.value).padStart(2, "0")}</p>
          </div>
        ))}
      </div>

      {/* Filters + Search */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
          {FILTERS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                filter === value ? "bg-indigo-600 text-white shadow-sm" : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
              }`}
            >
              {label}
              {value !== "ALL" && (
                <span className={`ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full ${filter === value ? "bg-indigo-500 text-white" : "bg-gray-100 text-gray-500"}`}>
                  {counts[value]}
                </span>
              )}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search by name, token, file…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-60 bg-white border border-gray-200 text-gray-800 placeholder-gray-400 text-xs rounded-lg px-3.5 py-2 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all shadow-sm"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-xs flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-red-600 flex-shrink-0">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="grid grid-cols-[90px_1fr_1.2fr_1fr_130px_150px] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-200">
          {["Token", "Student", "File Details", "Pages / Type", "Status", "Actions"].map((h) => (
            <p key={h} className="text-xs font-medium text-gray-500">{h}</p>
          ))}
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-gray-400 mt-3">Loading queue…</p>
          </div>
        ) : displayed.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H6.911a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661Z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">{filter === "ALL" ? "No jobs in queue" : `No ${filter.toLowerCase()} jobs`}</p>
          </div>
        ) : (
          displayed.map((job) => {
            const busy = actionKey !== null;
            const isThisBusy = (ep: string) => actionKey === `${job.id}:${ep}`;
            const terminal = job.status === "COLLECTED" || job.status === "CANCELLED";
            const initials = job.studentName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

            return (
              <div key={job.id} className="grid grid-cols-[90px_1fr_1.2fr_1fr_130px_150px] gap-4 items-center px-5 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                {/* Token */}
                <div>
                  <p className="text-xs font-semibold text-indigo-600 font-mono">#{job.tokenNumber}</p>
                  {job.status === "WAITING" && <p className="text-[9px] text-gray-400 font-mono mt-0.5">pos {job.queuePosition}</p>}
                </div>

                {/* Student */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-[10px] font-semibold flex-shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{job.studentName}</p>
                    <p className="text-xs text-gray-400 font-mono">{job.admissionNumber}</p>
                  </div>
                </div>

                {/* File details */}
                <div className="min-w-0">
                  <p className="text-xs text-gray-700 truncate" title={job.fileName}>{job.fileName}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {job.colorMode === "COLOR" ? "Color" : "B&W"} · {job.printType === "DOUBLE" ? "Double-sided" : "Single"}
                    {isSuperAdmin && job.locationName && ` · ${job.locationName}`}
                  </p>
                </div>

                {/* Pages */}
                <div>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {job.totalPages * job.copies} pages
                  </span>
                  <p className="text-xs text-gray-400 mt-1">{job.copies > 1 ? `×${job.copies} copies` : "1 copy"}</p>
                </div>

                {/* Status */}
                <div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[job.status]}`}>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[job.status]}`} />
                    {job.status}
                  </span>
                  {job.lastPrintError && (
                    <p className="text-[10px] text-amber-600 mt-0.5 line-clamp-1 flex items-center gap-1" title={job.lastPrintError}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3 text-amber-600 flex-shrink-0">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                      </svg>
                      <span>{job.lastPrintError}</span>
                    </p>
                  )}
                  <p className="text-[10px] text-gray-400 mt-1">{formatDate(job.createdAt)}</p>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1.5">
                  <Link href={`/admin/queue/${job.id}`} className="text-[10px] text-center bg-white border border-gray-200 hover:border-indigo-300 hover:text-indigo-600 text-gray-600 px-2 py-1.5 rounded-lg transition-colors font-medium">
                    View Details
                  </Link>
                  {!terminal && !isSuperAdmin && (
                    <>
                      {job.paymentStatus === "PAID" && job.status === "WAITING" && (
                        <div className="flex flex-col gap-1">
                          <select
                            value={selectedPrinters[job.id] || ""}
                            onChange={(e) => setSelectedPrinters((prev) => ({ ...prev, [job.id]: e.target.value }))}
                            className="text-[10px] bg-white border border-gray-200 text-gray-700 rounded px-1.5 py-1 outline-none focus:border-indigo-400 transition-colors"
                          >
                            <option value="" disabled>Select Printer</option>
                            {printers.map((p) => (
                              <option key={p.id} value={p.id}>{p.name} ({p.status})</option>
                            ))}
                          </select>
                          <button disabled={busy} onClick={() => printJob(job)}
                            className="text-[10px] bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded-lg disabled:opacity-40 transition-colors font-medium flex items-center justify-center gap-1">
                            {isThisBusy("print") ? (
                              "Sending…"
                            ) : (
                              <>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 9V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v5" />
                                </svg>
                                <span>Print</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                      {job.status === "PRINTING" && (
                        <button disabled={busy} onClick={() => doAction(job.id, "ready")}
                          className="text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 rounded-lg disabled:opacity-40 transition-colors font-medium">
                          {isThisBusy("ready") ? "…" : "Mark Ready"}
                        </button>
                      )}
                      {job.status === "READY" && (
                        <button disabled={busy} onClick={() => doAction(job.id, "collect")}
                          className="text-[10px] bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded-lg disabled:opacity-40 transition-colors font-medium">
                          {isThisBusy("collect") ? "…" : "Collected"}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}

        {displayed.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-400">Showing {displayed.length} of {jobs.length} jobs</p>
          </div>
        )}
      </div>
    </div>
  );
}
