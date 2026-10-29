/**
 * Firestore helpers for uploads collection.
 * Server-side only — never import in client components.
 */

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS, FirestoreUploadRecord } from "@/lib/firebase/collections";

export interface CreateUploadRecordInput {
  id?: string;
  ownerId: string;
  cloudinaryPublicId: string;
  fileUrl: string;
  fileName: string;
  pages: number;
  size: number;
  mime: string;
}

export async function createUploadRecord(
  input: CreateUploadRecordInput
): Promise<FirestoreUploadRecord> {
  const docRef = input.id
    ? adminDb.collection(COLLECTIONS.UPLOADS).doc(input.id)
    : adminDb.collection(COLLECTIONS.UPLOADS).doc();

  const record: Omit<FirestoreUploadRecord, "createdAt"> & {
    createdAt: unknown;
  } = {
    id: docRef.id,
    ownerId: input.ownerId,
    cloudinaryPublicId: input.cloudinaryPublicId,
    fileUrl: input.fileUrl,
    fileName: input.fileName,
    pages: input.pages,
    size: input.size,
    mime: input.mime,
    consumed: false,
    createdAt: FieldValue.serverTimestamp(),
  };

  await docRef.set(record);
  return {
    ...record,
    createdAt: Timestamp.now(),
  } as FirestoreUploadRecord;
}

export async function getUploadRecord(
  id: string
): Promise<FirestoreUploadRecord | null> {
  const doc = await adminDb.collection(COLLECTIONS.UPLOADS).doc(id).get();
  if (!doc.exists) return null;
  return { ...doc.data(), id: doc.id } as FirestoreUploadRecord;
}

export async function markUploadConsumed(id: string): Promise<void> {
  await adminDb.collection(COLLECTIONS.UPLOADS).doc(id).update({
    consumed: true,
    consumedAt: FieldValue.serverTimestamp(),
  });
}
