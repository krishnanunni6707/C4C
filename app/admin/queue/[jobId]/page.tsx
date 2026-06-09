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
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-6">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
      </div>
      <div className="px-6 py-5 space-y-3">{children}</div>
    </div>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string | number; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm font-medium text-gray-900 ${mono ? "font-mono" : ""}`}>
        {value}
      </span>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  WAITING: "bg-amber-100 text-amber-800",
  PRINTING: "bg-blue-100 text-blue-800",
  READY: "bg-green-100 text-green-800",
  COLLECTED: "bg-gray-100 text-gray-700",
  CANCELLED: "bg-red-100 text-red-700",
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
    <div className="p-8 max-w-5xl">
      {/* Breadcrumb + title */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Link
          href="/admin/queue"
          className="text-sm text-blue-600 hover:underline"
        >
          ← Queue
        </Link>
        <span className="text-gray-300">›</span>
        <h1 className="text-2xl font-bold text-gray-900">
          Job {job.tokenNumber}
        </h1>
        <span
          className={`text-xs font-semibold px-3 py-1 rounded-full ${
            STATUS_COLORS[job.status] ?? "bg-gray-100 text-gray-700"
          }`}
        >
          {job.status}
        </span>
        <span
          className={`text-xs font-semibold px-3 py-1 rounded-full ${
            job.paymentStatus === "PAID"
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
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
              <a
                href={job.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                🔗 Open File
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
