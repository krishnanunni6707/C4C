/**
 * Shared guard for admin job action routes.
 * Verifies the caller is an authenticated ADMIN or SUPER_ADMIN,
 * then checks that the job belongs to the admin's assigned location.
 *
 * SUPER_ADMIN can act on any job regardless of location.
 * ADMIN can only act on jobs assigned to their locationId.
 */

import { NextResponse } from "next/server";
import { requireJobAccess } from "@/lib/api/guards";
import type { FirestorePrintJob } from "@/lib/firebase/collections";

type GuardResult =
  | { ok: true; adminId: string; job: FirestorePrintJob }
  | { ok: false; response: NextResponse };

export async function adminJobGuard(jobId: string): Promise<GuardResult> {
  const result = await requireJobAccess(jobId, "write");
  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    adminId: result.session.user.id,
    job: result.job,
  };
}
