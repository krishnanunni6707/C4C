import Link from "next/link";

export default function JobDetailPage() {
  return (
    <div className="p-8">
      <Link href="/admin/overview" className="text-blue-600 hover:underline text-sm">
        ← Back to Overview
      </Link>
      <div className="mt-8 bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
        <span className="text-5xl">📋</span>
        <p className="mt-4 text-gray-400">Job details will be available in Phase 2.</p>
      </div>
    </div>
  );
}
