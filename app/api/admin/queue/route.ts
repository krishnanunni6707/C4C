/**
 * GET /api/admin/queue
 * Returns all printJobs with Window-SJF ordering applied.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS, FirestorePrintJob } from "@/lib/firebase/collections";
import { getSettings } from "@/lib/firestore/settings";
import { applyWindowSJF } from "@/lib/firestore/sjf-queue";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const snap = await adminDb
      .collection(COLLECTIONS.PRINT_JOBS)
      .orderBy("createdAt", "asc")
      .get();

    const allJobs = snap.docs.map(
      (d) => ({ ...d.data(), id: d.id } as FirestorePrintJob)
    );

    const settings = await getSettings();
    const windowMinutes = settings.queueWindowMinutes ?? 5;

    // Apply SJF to WAITING jobs; leave other statuses untouched
    const waitingJobs = allJobs.filter((j) => j.status === "WAITING");
    const otherJobs = allJobs.filter((j) => j.status !== "WAITING");

    const orderedWaiting = applyWindowSJF(waitingJobs, windowMinutes);

    // Merge: SJF-ordered waiting first, then the rest
    const jobs = [
      ...orderedWaiting,
      ...otherJobs.map((j, i) => ({ ...j, queuePosition: orderedWaiting.length + i + 1 })),
    ];

    return NextResponse.json({ jobs });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Admin queue error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
