/**
 * Firestore authentication helpers
 * All user lookups and password operations go through this module.
 * Never import this in client components.
 */

import { compare, hash } from "bcryptjs";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS, FirestoreUser } from "@/lib/firebase/collections";

const BCRYPT_ROUNDS = 12;

// ─── Lookup ───────────────────────────────────────────────────────────────────

/**
 * Find a user by admissionNumber.
 * Returns null if not found.
 */
export async function getUserByAdmissionNumber(
  admissionNumber: string
): Promise<(FirestoreUser & { docId: string }) | null> {
  const snap = await adminDb
    .collection(COLLECTIONS.USERS)
    .where("admissionNumber", "==", admissionNumber.trim().toUpperCase())
    .limit(1)
    .get();

  if (snap.empty) return null;

  const doc = snap.docs[0];
  return { ...(doc.data() as FirestoreUser), docId: doc.id };
}

/**
 * Find a user by Firestore document ID.
 */
export async function getUserById(
  id: string
): Promise<FirestoreUser | null> {
  const doc = await adminDb.collection(COLLECTIONS.USERS).doc(id).get();
  if (!doc.exists) return null;
  return doc.data() as FirestoreUser;
}

// ─── Password ─────────────────────────────────────────────────────────────────

/**
 * Verify a plain-text password against a bcrypt hash.
 */
export async function verifyPassword(
  plainPassword: string,
  passwordHash: string
): Promise<boolean> {
  return compare(plainPassword, passwordHash);
}

/**
 * Hash a plain-text password with bcrypt.
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  return hash(plainPassword, BCRYPT_ROUNDS);
}

/**
 * Update a user's passwordHash and set firstLogin = false in one write.
 */
export async function setNewPassword(
  userId: string,
  newPlainPassword: string
): Promise<void> {
  const passwordHash = await hashPassword(newPlainPassword);
  await adminDb.collection(COLLECTIONS.USERS).doc(userId).update({
    passwordHash,
    firstLogin: false,
  });
}

// ─── Seed helpers ─────────────────────────────────────────────────────────────

/**
 * Create a user document. Used only by the seed route.
 * Skips creation if admissionNumber already exists.
 */
export async function createUserIfNotExists(
  data: Omit<FirestoreUser, "id" | "createdAt"> & { id?: string }
): Promise<{ created: boolean; id: string }> {
  const existing = await getUserByAdmissionNumber(data.admissionNumber);
  if (existing) return { created: false, id: existing.docId };

  const { FieldValue } = await import("firebase-admin/firestore");
  const docRef = adminDb.collection(COLLECTIONS.USERS).doc();

  await docRef.set({
    ...data,
    id: docRef.id,
    createdAt: FieldValue.serverTimestamp(),
  });

  return { created: true, id: docRef.id };
}
