import { getPrintJobById } from "@/lib/firestore/print-jobs";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Timestamp } from "firebase-admin/firestore";
import JobDetailActions from "@/components/admin/JobDetailActions";

function formatDate(ts: Timestamp | undefined): string {
  if (!ts) return "—";
  const d = typeof ts.toDate === "function" ? ts.toDate() : new Date(ts as unknown as string);
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "long", timeStyle: "short" }).format(d);
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-4 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</h3>
      </div>
      <div className="px-5 py-4 space-y-3">{children}</div>
    </div>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string | number; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm font-medium text-gray-900 ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

const STATUS_BADGE: Record<string, string> = {
  WAITING:   "badge-waiting",
  PRINTING:  "badge-printing",
  READY:     "badge-ready",
  COLLECTED: "badge-collected",
  CANCELLED: "badge-cancelled",
};

export default async function JobDetailPage({ params }: { params: { jobId: string } }) {
  const job = await getPrintJobById(params.jobId);
  if (!job) notFound();

  const totalSheets = job.printType === "DOUBLE"
    ? Math.ceil((job.totalPages * job.copies) / 2)
    : job.totalPages * job.copies;

  return (
    <div className="p-6 max-w-4xl bg-[#F8FAFC] min-h-screen">
      {/* Breadcrumb + title */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Link href="/admin/queue" className="text-sm text-indigo-600 hover:text-indigo-700 transition-colors font-medium">
          ← Queue
        </Link>
        <span className="text-gray-300">›</span>
        <h1 className="text-2xl font-semibold text-gray-900">Job {job.tokenNumber}</h1>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_BADGE[job.status] ?? "badge-collected"}`}>
          {job.status}
        </span>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${job.paymentStatus === "PAID" ? "badge-ready" : "badge-cancelled"}`}>
          {job.paymentStatus}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left */}
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
                className="inline-flex items-center gap-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors font-medium">
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

        {/* Right */}
        <div>
          <Card title="💳 Payment">
            <Row label="Amount" value={`₹${job.amount}`} />
            <Row label="Payment Method" value={job.paymentMethod} />
            <Row label="Payment Status" value={job.paymentStatus} />
          </Card>

          <Card title="📊 Queue Info">
            <Row label="Token Number" value={job.tokenNumber} mono />
            <Row label="Job Status" value={job.status} />
            <Row label="Location" value={job.locationName ?? "—"} />
            <Row label="Created At" value={formatDate(job.createdAt)} />
          </Card>

          <Card title="⚡ Actions">
            <JobDetailActions jobId={job.id} status={job.status} paymentStatus={job.paymentStatus} />
          </Card>
        </div>
      </div>
    </div>
  );
}
