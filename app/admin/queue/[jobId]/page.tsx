import React from "react";
import Link from "next/link";
import { ArrowLeft, ShieldAlert, FileQuestion } from "lucide-react";
import { requireJobAccess } from "@/lib/api/guards";
import { getUserById } from "@/lib/firestore/users";
import JobDetailView from "@/components/admin/job/JobDetailView";

export const dynamic = "force-dynamic";

export default async function QueueJobDetailPage({
  params,
}: {
  params: { jobId: string };
}) {
  const guard = await requireJobAccess(params.jobId, "read");

  if (!guard.ok) {
    const status = guard.response.status;

    if (status === 403) {
      return (
        <div className="max-w-2xl mx-auto py-16 px-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
            This job belongs to a different location. You do not have permissions to view or manage jobs outside your assigned location.
          </p>
          <div className="mt-6">
            <Link
              href="/admin/queue"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Queue</span>
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-4">
          <FileQuestion className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Job Not Found</h2>
        <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
          The requested print job could not be found or may have been deleted.
        </p>
        <div className="mt-6">
          <Link
            href="/admin/queue"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Queue</span>
          </Link>
        </div>
      </div>
    );
  }

  const job = guard.job;

  // Fetch student details if studentId is present
  let student = null;
  if (job.studentId) {
    try {
      const u = await getUserById(job.studentId);
      if (u) {
        student = {
          name: u.name,
          department: u.department,
          semester: u.semester,
          admissionNumber: u.admissionNumber,
        };
      }
    } catch {
      // Ignore student lookup error
    }
  }

  const serializedJob = JSON.parse(JSON.stringify(job));

  return (
    <JobDetailView
      jobId={params.jobId}
      initialJob={serializedJob}
      initialStudent={student}
    />
  );
}
