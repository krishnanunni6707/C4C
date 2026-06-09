/**
 * Firestore helpers for activityLogs collection.
 * Server-side only — never import in client components.
 */

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS, FirestoreActivityLog } from "@/lib/firebase/collections";

export interface ActivityLogInput {
  adminId: string;
  action: string;
  targetId: string;
  details?: string;
}

export async function createActivityLog(input: ActivityLogInput): Promise<void> {
  const docRef = adminDb.collection(COLLECTIONS.ACTIVITY_LOGS).doc();
  await docRef.set({
    id: docRef.id,
    adminId: input.adminId,
    action: input.action,
    targetId: input.targetId,
    ...(input.details ? { details: input.details } : {}),
    timestamp: FieldValue.serverTimestamp(),
  });
}

export async function getRecentActivityLogs(
  limit = 20
): Promise<(FirestoreActivityLog & { details?: string })[]> {
  const snap = await adminDb
    .collection(COLLECTIONS.ACTIVITY_LOGS)
    .orderBy("timestamp", "desc")
    .limit(limit)
    .get();

  return snap.docs.map(
    (d) => ({ ...d.data(), id: d.id } as FirestoreActivityLog & { details?: string })
  );
}
