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

export async function GET(req: Request) {
  const guard = await requireAdmin(true);
  if (!guard.ok) return guard.response;

  const session = guard.session;
  try {
    const url = new URL(req.url);
    const limitParam = parseInt(url.searchParams.get("limit") || "50", 10);
    const limit = Math.min(Math.max(isNaN(limitParam) ? 50 : limitParam, 1), 100);
    const cursor = url.searchParams.get("startAfter") || url.searchParams.get("cursor");
    const statusParam = url.searchParams.get("status");

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

    if (statusParam) {
      query = query.where("status", "==", statusParam) as typeof query;
    }

    if (cursor) {
      const cursorDoc = await adminDb.collection(COLLECTIONS.PRINT_JOBS).doc(cursor).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc) as typeof query;
      }
    }

    const snap = await query.limit(limit + 1).get();
    const docs = snap.docs;
    const hasMore = docs.length > limit;
    const pagedDocs = hasMore ? docs.slice(0, limit) : docs;
    const lastDoc = pagedDocs[pagedDocs.length - 1];
    const lastDocId = lastDoc ? lastDoc.id : null;

    const allJobs = pagedDocs.map(
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

    return NextResponse.json({
      jobs,
      hasMore,
      lastDocId,
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error("Admin queue error:", msg);
    return NextResponse.json(
      { error: msg },
      { status: 500, headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  }
}
