import { getPrintJobById } from "@/lib/firestore/print-jobs";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Timestamp } from "firebase-admin/firestore";
import JobDetailActions from "@/components/admin/JobDetailActions";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(ts: Timestamp | undefined): string {
  if (!ts) return "—";
  const d = typeof ts.toDate === "function" ? ts.toDate() : new Date(ts as unknown as string);
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(d);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-card rounded-2xl mb-4 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-white/[0.06]">
        <h3 className="font-bold text-white text-xs uppercase tracking-wider">{title}</h3>
      </div>
      <div className="px-5 py-4 space-y-3">{children}</div>
    </div>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string | number; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-white/[0.04] last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-xs font-semibold text-white ${mono ? "font-mono" : ""}`}>
        {value}
      </span>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  WAITING:   "bg-yellow-400/10 text-yellow-400 border border-yellow-400/20",
  PRINTING:  "bg-[#54b4eb]/10 text-[#54b4eb] border border-[#54b4eb]/20",
  READY:     "bg-green-400/10 text-green-400 border border-green-400/20",
  COLLECTED: "bg-gray-400/10 text-gray-400 border border-gray-400/20",
  CANCELLED: "bg-red-400/10 text-red-400 border border-red-400/20",
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function JobDetailPage({
  params,
}: {
  params: { jobId: string };
}) {
  const job = await getPrintJobById(params.jobId);
  if (!job) notFound();

  const totalSheets =
    job.printType === "DOUBLE"
      ? Math.ceil((job.totalPages * job.copies) / 2)
      : job.totalPages * job.copies;

  return (
    <div className="p-7 max-w-4xl">
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Link href="/admin/queue" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
          ← Queue
        </Link>
        <span className="text-gray-700">›</span>
        <h1 className="text-xl font-bold text-white">Job {job.tokenNumber}</h1>
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${STATUS_COLORS[job.status] ?? "bg-gray-400/10 text-gray-400"}`}>
          {job.status}
        </span>
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${job.paymentStatus === "PAID" ? "bg-green-400/10 text-green-400 border border-green-400/20" : "bg-red-400/10 text-red-400 border border-red-400/20"}`}>
          {job.paymentStatus}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Left column ─── */}
        <div>
          <Card title="📄 Document">
            <Row label="File Name" value={job.fileName} />
            <Row label="Total Pages" value={job.totalPages} />
            <Row label="Copies" value={job.copies} />
            <Row label="Sheets to Print" value={totalSheets} />
            <Row label="Color Mode" value={job.colorMode === "BW" ? "Black & White" : "Color"} />
            <Row label="Print Type" value={job.printType === "SINGLE" ? "Single Sided" : "Double Sided"} />
            <Row label="Paper Size" value={job.paperSize} />
            <div className="pt-2">
              <a href={job.fileUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs bg-indigo-600/80 hover:bg-indigo-600 text-white px-4 py-2 rounded-xl transition-colors font-bold">
                ↗ Open File
              </a>
            </div>
          </Card>

          <Card title="👤 Student">
            <Row label="Name" value={job.studentName} />
            <Row label="Admission No" value={job.admissionNumber} mono />
            <Row label="Student ID" value={job.studentId} mono />
          </Card>
        </div>

        {/* ── Right column ─── */}
        <div>
          <Card title="💳 Payment">
            <Row label="Amount" value={`₹${job.amount}`} />
            <Row label="Payment Method" value={job.paymentMethod} />
            <Row
              label="Payment Status"
              value={job.paymentStatus}
            />
          </Card>

          <Card title="📊 Queue Info">
            <Row label="Token Number" value={job.tokenNumber} mono />
            <Row label="Job Status" value={job.status} />
            <Row label="Location" value={job.locationName ?? "—"} />
            <Row label="Created At" value={formatDate(job.createdAt)} />
          </Card>

          <Card title="⚡ Actions">
            <JobDetailActions
              jobId={job.id}
              status={job.status}
              paymentStatus={job.paymentStatus}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
