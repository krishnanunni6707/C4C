/**
 * Shared guard for admin job action routes.
 * Verifies the caller is an authenticated ADMIN or SUPER_ADMIN,
 * then checks that the job belongs to the admin's assigned location.
 *
 * SUPER_ADMIN can act on any job regardless of location.
 * ADMIN can only act on jobs assigned to their locationId.
 */

import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getPrintJobById } from "@/lib/firestore/print-jobs";
import type { FirestorePrintJob } from "@/lib/firebase/collections";

type GuardResult =
  | { ok: true; adminId: string; job: FirestorePrintJob }
  | { ok: false; response: NextResponse };

export async function adminJobGuard(jobId: string): Promise<GuardResult> {
  const session = await getServerSession(authOptions);

  if (
    !session?.user?.id ||
    (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")
  ) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const job = await getPrintJobById(jobId);
  if (!job) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Job not found" }, { status: 404 }),
    };
  }

  // ADMIN can only act on jobs in their own location
  if (
    session.user.role === "ADMIN" &&
    job.locationId !== session.user.locationId
  ) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Forbidden — this job belongs to a different location" },
        { status: 403 }
      ),
    };
  }

  return { ok: true, adminId: session.user.id, job };
}
