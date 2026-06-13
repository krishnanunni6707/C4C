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

/**
 * Mark a specific notification as read by a user.
 */
export async function markNotificationRead(
  notificationId: string,
  userId: string
): Promise<void> {
  await adminDb
    .collection(COLLECTIONS.NOTIFICATIONS)
    .doc(notificationId)
    .update({
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
