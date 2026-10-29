/**
 * GET /api/print-jobs/queue
 *
 * Hardened queue endpoint (P-05):
 * - Students: see only anonymized queue metadata (token number, status, position).
 *   Never names, admission numbers, file names, or file URLs.
 * - Admins: strictly scoped to their assigned locationId.
 * - Super Admins: global queue access.
 */

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/guards";
import { getActiveQueue } from "@/lib/firestore/print-jobs";
import { applyWindowSJF } from "@/lib/firestore/sjf-queue";
import { getSettings } from "@/lib/firestore/settings";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const guard = await requireRole(["STUDENT", "ADMIN", "SUPER_ADMIN"]);
  if (!guard.ok) return guard.response;

  try {
    const { session } = guard;
    const role = session.user.role;
    const url = new URL(req.url);
    const locationParam = url.searchParams.get("locationId");

    let locationIdToFilter: string | undefined = undefined;

    if (role === "ADMIN") {
      if (!session.user.locationId) {
        return NextResponse.json(
          { error: "Admin has no assigned location" },
          { status: 403 }
        );
      }
      locationIdToFilter = session.user.locationId;
    } else if (role === "SUPER_ADMIN") {
      locationIdToFilter = locationParam || undefined;
    } else if (role === "STUDENT") {
      locationIdToFilter = locationParam || undefined;
    }

    const allJobs = await getActiveQueue(locationIdToFilter);
    const settings = await getSettings();
    const windowMinutes = settings.queueWindowMinutes ?? 5;

    const printingJobs = allJobs.filter((j) => j.status === "PRINTING");
    const waitingJobs = allJobs.filter((j) => j.status === "WAITING");
    const otherJobs = allJobs.filter(
      (j) => j.status !== "PRINTING" && j.status !== "WAITING"
    );

    const orderedWaiting = applyWindowSJF(waitingJobs, windowMinutes, 15);

    const orderedQueue = [
      ...printingJobs.map((j, i) => ({ ...j, queuePosition: i + 1 })),
      ...orderedWaiting.map((j, i) => ({
        ...j,
        queuePosition: printingJobs.length + i + 1,
      })),
      ...otherJobs.map((j, i) => ({
        ...j,
        queuePosition: printingJobs.length + orderedWaiting.length + i + 1,
      })),
    ];

    if (role === "STUDENT") {
      // Return strictly anonymized queue data for student tracking
      const studentQueue = orderedQueue.map((job) => ({
        id: job.id,
        tokenNumber: job.tokenNumber,
        status: job.status,
        queuePosition: job.queuePosition,
        locationId: job.locationId,
        createdAt: job.createdAt,
      }));

      return NextResponse.json({ printJobs: studentQueue });
    }

    // Admins and Super Admins see full administrative queue data
    return NextResponse.json({ printJobs: orderedQueue });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to fetch queue";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
