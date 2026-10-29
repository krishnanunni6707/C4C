/**
 * GET /api/admin/queue
 * Returns printJobs with Window-SJF ordering applied.
 *
 * SUPER_ADMIN: sees all jobs across all locations.
 * ADMIN: sees only jobs assigned to their locationId.
 */

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/guards";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS, FirestorePrintJob } from "@/lib/firebase/collections";
import { getSettings } from "@/lib/firestore/settings";
import { applyWindowSJF } from "@/lib/firestore/sjf-queue";
import { toPublicJob } from "@/lib/mappers";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireAdmin(true);
  if (!guard.ok) return guard.response;

  const session = guard.session;
  try {

    // Build query — scope to location for ADMIN, global for SUPER_ADMIN
    let query = adminDb
      .collection(COLLECTIONS.PRINT_JOBS)
      .orderBy("createdAt", "asc");

    if (session.user.role === "ADMIN") {
      query = adminDb
        .collection(COLLECTIONS.PRINT_JOBS)
        .where("locationId", "==", session.user.locationId)
        .orderBy("createdAt", "asc") as typeof query;
    }

    const snap = await query.get();
    const allJobs = snap.docs.map(
      (d) => ({ ...d.data(), id: d.id } as FirestorePrintJob)
    );

    const settings = await getSettings();
    const windowMinutes = settings.queueWindowMinutes ?? 5;

    // Apply SJF to WAITING jobs; leave other statuses untouched
    const waitingJobs = allJobs.filter((j) => j.status === "WAITING");
    const otherJobs = allJobs.filter((j) => j.status !== "WAITING");

    const orderedWaiting = applyWindowSJF(waitingJobs, windowMinutes);

    const jobs = [
      ...orderedWaiting,
      ...otherJobs.map((j, i) => ({
        ...j,
        queuePosition: orderedWaiting.length + i + 1,
      })),
    ].map((j) => toPublicJob(j));

    return NextResponse.json({ jobs });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error("Admin queue error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
