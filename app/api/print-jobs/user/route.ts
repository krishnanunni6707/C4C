/**
 * GET /api/print-jobs/user
 * Returns all print jobs for the currently logged-in student (P-05).
 * Student-facing job payloads omit fileUrl, cloudinaryPublicId, and internal secrets.
 */

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/guards";
import { getPrintJobsByStudent } from "@/lib/firestore/print-jobs";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireRole(["STUDENT", "ADMIN", "SUPER_ADMIN"]);
  if (!guard.ok) return guard.response;

  try {
    const rawJobs = await getPrintJobsByStudent(guard.session.user.id);

    // Strip sensitive storage identifiers and raw URLs from student payload
    const printJobs = rawJobs.map((job) => {
      const safeJob = { ...(job as any) };
      delete safeJob.fileUrl;
      delete safeJob.cloudinaryPublicId;
      return safeJob;
    });

    return NextResponse.json({ printJobs });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to fetch print jobs";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
