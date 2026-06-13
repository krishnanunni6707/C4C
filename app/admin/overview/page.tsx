import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { getLocationById } from "@/lib/firestore/locations";
import { getAllPrinters } from "@/lib/firestore/printers";
import Link from "next/link";
import BroadcastPanel from "@/components/admin/BroadcastPanel";

export const dynamic = "force-dynamic";

async function safeCount(
  collection: string,
  filters?: Array<[string, FirebaseFirestore.WhereFilterOp, unknown]>
): Promise<number> {
  try {
    let ref: FirebaseFirestore.Query = adminDb.collection(collection);
    if (filters) for (const [f, op, v] of filters) ref = ref.where(f, op, v);
    return (await ref.count().get()).data().count;
  } catch { return 0; }
}

async function safeRevenue(locationId?: string | null): Promise<number> {
  try {
    let ref: FirebaseFirestore.Query = adminDb
      .collection(COLLECTIONS.PRINT_JOBS)
      .where("paymentStatus", "==", "PAID");
    if (locationId) ref = ref.where("locationId", "==", locationId);
    const snap = await ref.get();
    return snap.docs.reduce((s, d) => s + (d.data().amount ?? 0), 0);
  } catch { return 0; }
}

async function getRecentJobs(locationId?: string | null, limit = 5) {
  try {
    let ref = adminDb
      .collection(COLLECTIONS.PRINT_JOBS)
      .where("status", "in", ["WAITING", "PRINTING", "READY"])
      .orderBy("createdAt", "asc")
      .limit(limit) as FirebaseFirestore.Query;
    if (locationId) ref = adminDb
      .collection(COLLECTIONS.PRINT_JOBS)
      .where("locationId", "==", locationId)
      .where("status", "in", ["WAITING", "PRINTING", "READY"])
      .orderBy("createdAt", "asc")
      .limit(limit);
    const snap = await ref.get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Array<{
      id: string; tokenNumber: string; studentName: string;
      fileName: string; totalPages: number; status: string; paymentStatus: string;
    }>;
  } catch { return []; }
}

const STATUS_DOT: Record<string, string> = {
  WAITING:  "bg-yellow-400",
  PRINTING: "bg-[#54b4eb]",
  READY:    "bg-green-400",
};

const STATUS_LABEL: Record<string, string> = {
  WAITING:  "Queued",
  PRINTING: "Printing...",
  READY:    "Ready",
};

export default async function AdminOverviewPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const isSuperAdmin = session.user.role === "SUPER_ADMIN";
  const locationId = session.user.role === "ADMIN" ? session.user.locationId : null;

  let locationName: string | null = null;
  if (locationId) {
    const loc = await getLocationById(locationId);
    locationName = loc?.name ?? null;
  }

  const locFilter: Array<[string, FirebaseFirestore.WhereFilterOp, unknown]> = locationId
    ? [["locationId", "==", locationId]] : [];

  const [pendingJobs, totalJobs, completedJobs, revenue, printers, recentJobs] = await Promise.all([
    safeCount(COLLECTIONS.PRINT_JOBS, [...locFilter, ["status", "in", ["WAITING", "PRINTING", "READY"]]]),
    safeCount(COLLECTIONS.PRINT_JOBS, locFilter.length ? locFilter : undefined),
    safeCount(COLLECTIONS.PRINT_JOBS, [...locFilter, ["status", "==", "COLLECTED"]]),
    safeRevenue(locationId),
    getAllPrinters(),
    getRecentJobs(locationId, 3),
  ]);

  const onlinePrinters = printers.filter((p) => p.status === "ONLINE").length;

  const stats = [
    {
      label: "PENDING JOBS",
      value: String(pendingJobs).padStart(2, "0"),
      sub: `↗ ${totalJobs} total`,
      subColor: "text-indigo-400",
    },
    {
      label: "ACTIVE PRINTERS",
      value: String(onlinePrinters).padStart(2, "0"),
      sub: `/ ${printers.length} Total`,
      subColor: "text-gray-500",
      extra: onlinePrinters > 0 ? (
        <div className="w-full mt-3 h-1.5 bg-[#1e2235] rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-400 rounded-full"
            style={{ width: `${printers.length ? (onlinePrinters / printers.length) * 100 : 0}%` }}
          />
        </div>
      ) : null,
    },
    {
      label: "COMPLETED TODAY",
      value: String(completedJobs),
      sub: "total collected",
      subColor: "text-gray-500",
    },
    {
      label: "TOTAL REVENUE",
      value: `₹${revenue.toLocaleString("en-IN")}`,
      sub: "from paid jobs",
      subColor: "text-gray-500",
    },
  ];

  return (
    <div className="p-7 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">System Overview</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {isSuperAdmin ? "All locations · Global view" : locationName ? `${locationName}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="glass-card rounded-xl px-4 py-2 flex items-center gap-2 text-xs text-gray-400">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
            SYSTEM UPTIME: 99.9%
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="glass-card rounded-2xl p-5">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{s.label}</p>
            <p className="text-4xl font-extrabold text-white mt-2 leading-none">{s.value}</p>
            <p className={`text-xs mt-1.5 font-medium ${s.subColor}`}>{s.sub}</p>
            {s.extra ?? null}
          </div>
        ))}
      </div>

      {/* Live Queue + Peak Hours */}
      <div className="grid grid-cols-3 gap-4">
        {/* Live queue */}
        <div className="col-span-2 glass-card rounded-2xl overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-bold text-white">Live Print Queue</h2>
              <span className="text-[9px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Active Stream
              </span>
            </div>
            <Link href="/admin/queue" className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-wider">
              View Full Queue →
            </Link>
          </div>

          {/* Table header */}
          <div className="grid grid-cols-5 px-5 py-2 border-b border-white/[0.06]">
            {["STUDENT", "FILENAME", "PAGES", "STATUS", "ACTION"].map((h) => (
              <p key={h} className="text-[9px] font-bold text-gray-600 uppercase tracking-wider">{h}</p>
            ))}
          </div>

          {recentJobs.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-gray-600">No active jobs</p>
            </div>
          ) : (
            recentJobs.map((job) => {
              const initials = job.studentName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
              return (
                <div key={job.id} className="grid grid-cols-5 items-center px-5 py-3.5 border-b border-white/[0.06]/50 hover:bg-white/[0.04] transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center text-indigo-400 text-[10px] font-bold flex-shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{job.studentName}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 truncate pr-2">{job.fileName}</p>
                  <p className="text-xs text-gray-300 font-mono">{job.totalPages}</p>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[job.status] ?? "bg-gray-400"}`} />
                    <span className="text-xs text-gray-300">{STATUS_LABEL[job.status] ?? job.status}</span>
                  </div>
                  <Link href={`/admin/queue/${job.id}`} className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold">
                    Manage →
                  </Link>
                </div>
              );
            })
          )}
        </div>

        {/* Printer fleet snapshot */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <h2 className="text-sm font-bold text-white">Printer Fleet Status</h2>
            <p className="text-[10px] text-gray-500 mt-0.5">Hardware node overview</p>
          </div>
          <div className="p-3 space-y-2 max-h-64 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {printers.length === 0 ? (
              <p className="text-xs text-gray-600 text-center py-6">No printers registered</p>
            ) : (
              printers.slice(0, 4).map((p) => (
                <div key={p.id} className={`rounded-xl border p-3 ${p.status === "ONLINE" ? "border-white/[0.06] bg-white/[0.03]" : "border-red-500/20 bg-red-500/5"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-white truncate pr-2">{p.name}</p>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${p.status === "ONLINE" ? "bg-emerald-400/10 text-emerald-400" : "bg-red-400/10 text-red-400"}`}>
                      {p.status}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[9px] text-gray-500">
                      <span>TONER</span><span className="text-emerald-400 font-bold">{p.inkPercentage}%</span>
                    </div>
                    <div className="h-1 bg-[#1e2235] rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${p.inkPercentage}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-[9px] text-gray-500">
                      <span>PAPER (A4)</span><span className="text-gray-400 font-bold">{p.paperPercentage}%</span>
                    </div>
                    <div className="h-1 bg-[#1e2235] rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${p.paperPercentage}%` }} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          {printers.length > 4 && (
            <div className="px-4 pb-3">
              <Link href="/admin/settings" className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold">
                View all {printers.length} printers →
              </Link>
            </div>
          )}
        </div>
      </div>
      {/* Broadcast notification panel — floating FAB for admins */}
      <BroadcastPanel />
    </div>
  );
}
