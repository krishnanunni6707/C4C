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

function Card({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-4 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
        {icon}
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
        <Link href="/admin/queue" className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 transition-colors font-medium">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Queue
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
          <Card
            title="Document"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5 text-gray-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
            }
          >
            <Row label="File Name" value={job.fileName} />
            <Row label="Total Pages" value={job.totalPages} />
            <Row label="Copies" value={job.copies} />
            <Row label="Sheets to Print" value={totalSheets} />
            <Row label="Color Mode" value={job.colorMode === "BW" ? "Black & White" : "Color"} />
            <Row label="Print Type" value={job.printType === "SINGLE" ? "Single Sided" : "Double Sided"} />
            <Row label="Paper Size" value={job.paperSize} />
            <div className="pt-2">
              {job.fileDeletedAt ? (
                <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg inline-block font-medium">
                  File removed per retention policy
                </span>
              ) : (
                <a
                  href={`/api/admin/jobs/${job.id}/file`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                  Open File
                </a>
              )}
            </div>
          </Card>

          <Card
            title="Student"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5 text-gray-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
            }
          >
            <Row label="Name" value={job.studentName} />
            <Row label="Admission No" value={job.admissionNumber} mono />
            <Row label="Student ID" value={job.studentId} mono />
          </Card>
        </div>

        {/* Right */}
        <div>
          <Card
            title="Payment"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5 text-gray-500">
                <rect width="20" height="14" x="2" y="5" rx="2" />
                <line x1="2" x2="22" y1="10" y2="10" />
              </svg>
            }
          >
            <Row label="Amount" value={`₹${job.amount}`} />
            <Row label="Payment Method" value={job.paymentMethod} />
            <Row label="Payment Status" value={job.paymentStatus} />
          </Card>

          <Card
            title="Queue Info"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5 text-gray-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
              </svg>
            }
          >
            <Row label="Token Number" value={job.tokenNumber} mono />
            <Row label="Job Status" value={job.status} />
            <Row label="Location" value={job.locationName ?? "—"} />
            <Row label="Created At" value={formatDate(job.createdAt)} />
          </Card>

          <Card
            title="Actions"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5 text-gray-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
              </svg>
            }
          >
            <JobDetailActions jobId={job.id} status={job.status} paymentStatus={job.paymentStatus} />
          </Card>
        </div>
      </div>
    </div>
  );
}
