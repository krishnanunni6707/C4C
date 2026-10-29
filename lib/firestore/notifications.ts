/**
 * Firestore helpers for the notifications collection.
 * Server-side only — uses firebase-admin. Never import in client components.
 */

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import {
  COLLECTIONS,
  FirestoreNotification,
  NotificationType,
} from "@/lib/firebase/collections";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateNotificationInput {
  studentId: string;
  type: NotificationType;
  title: string;
  message: string;
  jobId?: string;
  tokenNumber?: string;
}

export interface CreateBroadcastInput {
  adminName: string;
  title: string;
  message: string;
}

// ─── Write helpers ────────────────────────────────────────────────────────────

/**
 * Create a targeted notification for a specific student.
 */
export async function createNotification(
  input: CreateNotificationInput
): Promise<string> {
  const docRef = adminDb.collection(COLLECTIONS.NOTIFICATIONS).doc();

  const data: Omit<FirestoreNotification, "createdAt" | "id"> & {
    createdAt: unknown;
  } = {
    studentId: input.studentId,
    isBroadcast: false,
    type: input.type,
    title: input.title,
    message: input.message,
    readBy: [],
    createdAt: FieldValue.serverTimestamp(),
    ...(input.jobId ? { jobId: input.jobId } : {}),
    ...(input.tokenNumber ? { tokenNumber: input.tokenNumber } : {}),
  };

  await docRef.set(data);
  return docRef.id;
}

/**
 * Create a broadcast notification visible to all users.
 */
export async function createBroadcast(
  input: CreateBroadcastInput
): Promise<string> {
  const docRef = adminDb.collection(COLLECTIONS.NOTIFICATIONS).doc();

  const data: Omit<FirestoreNotification, "createdAt" | "id"> & {
    createdAt: unknown;
  } = {
    isBroadcast: true,
    type: "BROADCAST",
    title: input.title,
    message: input.message,
    adminName: input.adminName,
    readBy: [],
    createdAt: FieldValue.serverTimestamp(),
  };

  await docRef.set(data);
  return docRef.id;
}

function toSerializableNotification(id: string, data: Record<string, any>): FirestoreNotification {
  let createdAt = null;
  if (data.createdAt) {
    if (typeof data.createdAt.seconds === "number") {
      createdAt = {
        seconds: data.createdAt.seconds,
        nanoseconds: data.createdAt.nanoseconds ?? 0,
      };
    } else if (typeof data.createdAt._seconds === "number") {
      createdAt = {
        seconds: data.createdAt._seconds,
        nanoseconds: data.createdAt._nanoseconds ?? 0,
      };
    } else if (typeof data.createdAt.toMillis === "function") {
      const ms = data.createdAt.toMillis();
      createdAt = {
        seconds: Math.floor(ms / 1000),
        nanoseconds: (ms % 1000) * 1e6,
      };
    } else if (data.createdAt instanceof Date) {
      const ms = data.createdAt.getTime();
      createdAt = {
        seconds: Math.floor(ms / 1000),
        nanoseconds: (ms % 1000) * 1e6,
      };
    }
  }

  return {
    id,
    studentId: data.studentId,
    isBroadcast: !!data.isBroadcast,
    type: data.type,
    title: data.title,
    message: data.message,
    jobId: data.jobId,
    tokenNumber: data.tokenNumber,
    adminName: data.adminName,
    readBy: Array.isArray(data.readBy) ? data.readBy : [],
    createdAt: createdAt as any,
  };
}

/**
 * Get all notifications relevant to a user (targeted + broadcasts), newest first.
 */
export async function getNotificationsForUser(
  userId: string
): Promise<FirestoreNotification[]> {
  const targetedSnap = await adminDb
    .collection(COLLECTIONS.NOTIFICATIONS)
    .where("studentId", "==", userId)
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();

  const broadcastSnap = await adminDb
    .collection(COLLECTIONS.NOTIFICATIONS)
    .where("isBroadcast", "==", true)
    .orderBy("createdAt", "desc")
    .limit(20)
    .get();

  const map = new Map<string, FirestoreNotification>();
  [...targetedSnap.docs, ...broadcastSnap.docs].forEach((doc) => {
    map.set(doc.id, toSerializableNotification(doc.id, doc.data()));
  });

  return Array.from(map.values()).sort((a, b) => {
    const aTime = a.createdAt?.seconds ?? 0;
    const bTime = b.createdAt?.seconds ?? 0;
    return bTime - aTime;
  });
}

/**
 * Mark a specific notification as read by a user.
 * Verifies that the notification is either broadcast or belongs to the requesting user.
 */
export async function markNotificationRead(
  notificationId: string,
  userId: string
): Promise<void> {
  const docRef = adminDb.collection(COLLECTIONS.NOTIFICATIONS).doc(notificationId);
  const snap = await docRef.get();
  if (!snap.exists) return;

  const data = snap.data() as FirestoreNotification;
  if (!data.isBroadcast && data.studentId !== userId) {
    throw new Error("Forbidden: Notification does not belong to user");
  }

  await docRef.update({
    readBy: FieldValue.arrayUnion(userId),
  });
}

/**
 * Mark all notifications for a user as read (targeted + broadcasts).
 * Runs in batches of 500 (Firestore batch limit).
 */
export async function markAllNotificationsRead(
  userId: string
): Promise<void> {
  // Targeted notifications
  const targetedSnap = await adminDb
    .collection(COLLECTIONS.NOTIFICATIONS)
    .where("studentId", "==", userId)
    .get();

  // Broadcasts
  const broadcastSnap = await adminDb
    .collection(COLLECTIONS.NOTIFICATIONS)
    .where("isBroadcast", "==", true)
    .get();

  const allDocs = [...targetedSnap.docs, ...broadcastSnap.docs];

  // Split into batches of 500
  for (let i = 0; i < allDocs.length; i += 500) {
    const batch = adminDb.batch();
    allDocs.slice(i, i + 500).forEach((doc) => {
      batch.update(doc.ref, { readBy: FieldValue.arrayUnion(userId) });
    });
    await batch.commit();
  }
}
