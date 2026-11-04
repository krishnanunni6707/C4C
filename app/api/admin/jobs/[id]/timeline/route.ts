/**
 * GET /api/admin/jobs/[id]/timeline
 * Returns timeline events and activity logs for a specific print job.
 * Guarded by adminJobGuard (checks session role and location scoping).
 */

import { NextResponse } from "next/server";
import { adminJobGuard } from "@/lib/api/admin-job-guard";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS, FirestoreActivityLog } from "@/lib/firebase/collections";
import { getUserById } from "@/lib/firestore/users";

export const dynamic = "force-dynamic";

export interface TimelineEvent {
  action: string;
  adminName: string;
  timestamp: string | null;
  details?: string;
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const guard = await adminJobGuard(params.id);
  if (!guard.ok) return guard.response;

  const job = guard.job;

  try {
    // 1. Fetch all activity logs targeting this job
    const snap = await adminDb
      .collection(COLLECTIONS.ACTIVITY_LOGS)
      .where("targetId", "==", params.id)
      .get();

    const logs = snap.docs.map(
      (d) => ({ ...d.data(), id: d.id } as FirestoreActivityLog & { details?: string })
    );

    // 2. Fetch admin user names in batch/cache
    const userIds = Array.from(new Set(logs.map((l) => l.adminId).filter(Boolean)));
    const userNameMap = new Map<string, string>();

    await Promise.all(
      userIds.map(async (uid) => {
        if (uid === job.studentId) {
          userNameMap.set(uid, job.studentName || "Student");
          return;
        }
        try {
          const user = await getUserById(uid);
          if (user?.name) {
            userNameMap.set(uid, user.name);
          }
        } catch {
          // ignore lookup errors
        }
      })
    );

    // 3. Map logs into clean TimelineEvent objects
    const timeline: TimelineEvent[] = logs
      .map((log) => {
        let timestampStr: string | null = null;
        if (log.timestamp) {
          const date =
            typeof log.timestamp.toDate === "function"
              ? log.timestamp.toDate()
              : new Date(log.timestamp as unknown as string);
          timestampStr = date.toISOString();
        }

        const adminName = userNameMap.get(log.adminId) || "Admin";

        return {
          action: log.action,
          adminName,
          timestamp: timestampStr,
          details: log.details,
        };
      })
      .sort((a, b) => {
        if (!a.timestamp) return -1;
        if (!b.timestamp) return 1;
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      });

    return NextResponse.json({ timeline });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load timeline" },
      { status: 500 }
    );
  }
}
