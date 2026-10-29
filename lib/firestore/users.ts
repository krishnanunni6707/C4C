/**
 * Firestore helpers for users collection.
 * Server-side only — never import in client components.
 */

import crypto from "crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS, FirestoreUser, UserRole } from "@/lib/firebase/collections";
import { hashPassword } from "@/lib/firestore/auth";

export interface CreateUserInput {
  name: string;
  admissionNumber: string;
  department: string;
  semester: number;
  email?: string;
  phone?: string;
  role: UserRole;
  /** Required when role is ADMIN. */
  locationId?: string | null;
  /** Optional custom password. If provided, must be >= 10 chars. */
  customPassword?: string;
}

// Safe alphabet avoiding visually ambiguous characters: 0, O, o, 1, l, I
export const SAFE_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%*";

/**
 * Generate a cryptographically secure random temporary password (>= 12 chars).
 */
export function generateTempPassword(length = 12): string {
  const actualLength = Math.max(12, length);
  let pass = "";
  for (let i = 0; i < actualLength; i++) {
    const idx = crypto.randomInt(0, SAFE_ALPHABET.length);
    pass += SAFE_ALPHABET[idx];
  }
  return pass;
}

export async function getAllUsers(): Promise<FirestoreUser[]> {
  const snap = await adminDb
    .collection(COLLECTIONS.USERS)
    .orderBy("name", "asc")
    .get();

  return snap.docs.map((d) => ({ ...d.data(), id: d.id } as FirestoreUser));
}

export async function getUserById(id: string): Promise<FirestoreUser | null> {
  const doc = await adminDb.collection(COLLECTIONS.USERS).doc(id).get();
  if (!doc.exists) return null;
  return { ...doc.data(), id: doc.id } as FirestoreUser;
}

/**
 * Single-write user creation with secure password hashing.
 * Returns the created user object and the plaintext temporary/custom password.
 */
export async function createUser(
  data: CreateUserInput
): Promise<{ user: FirestoreUser; tempPassword: string }> {
  let passwordToUse: string;

  if (data.customPassword && data.customPassword.trim()) {
    const trimmed = data.customPassword.trim();
    if (trimmed.length < 10) {
      throw new Error("Password must be at least 10 characters long");
    }
    if (trimmed.toLowerCase() === data.admissionNumber.trim().toLowerCase()) {
      throw new Error("Password cannot be identical to admission number");
    }
    passwordToUse = trimmed;
  } else {
    passwordToUse = generateTempPassword(12);
  }

  const passwordHash = await hashPassword(passwordToUse);
  const docRef = adminDb.collection(COLLECTIONS.USERS).doc();

  const user: FirestoreUser = {
    id: docRef.id,
    admissionNumber: data.admissionNumber.trim().toUpperCase(),
    name: data.name.trim(),
    department: data.department.trim(),
    semester: Number(data.semester),
    ...(data.email ? { email: data.email.trim() } : {}),
    ...(data.phone ? { phone: data.phone.trim() } : {}),
    passwordHash,
    role: data.role,
    locationId: data.role === "ADMIN" ? (data.locationId ?? null) : null,
    firstLogin: true,
    status: "ACTIVE",
    createdAt: FieldValue.serverTimestamp() as unknown as Timestamp,
  };

  await docRef.set(user);
  return { user, tempPassword: passwordToUse };
}

export async function updateUser(
  id: string,
  data: Partial<FirestoreUser>
): Promise<void> {
  // Never allow direct passwordHash update through this function
  // eslint-disable-next-line no-unused-vars
  const { passwordHash: _ph, id: _id, createdAt: _ca, ...safeData } = data;
  await adminDb.collection(COLLECTIONS.USERS).doc(id).update(safeData);
}

export async function setUserStatus(
  id: string,
  status: "ACTIVE" | "DISABLED"
): Promise<void> {
  await adminDb.collection(COLLECTIONS.USERS).doc(id).update({ status });
}

export async function deleteUser(id: string): Promise<void> {
  await adminDb.collection(COLLECTIONS.USERS).doc(id).delete();
}

/**
 * Hash and save a new temp password. Returns the plain-text temp password.
 * Also sets firstLogin = true and updates passwordChangedAt to invalidate existing sessions.
 */
export async function resetUserPassword(
  id: string,
  tempPassword?: string
): Promise<string> {
  const finalPassword =
    tempPassword && tempPassword.trim().length >= 10
      ? tempPassword.trim()
      : generateTempPassword(12);
  const passwordHash = await hashPassword(finalPassword);
  await adminDb.collection(COLLECTIONS.USERS).doc(id).update({
    passwordHash,
    firstLogin: true,
    passwordChangedAt: FieldValue.serverTimestamp(),
  });
  return finalPassword;
}

export async function getUserPrintJobCount(userId: string): Promise<number> {
  const snap = await adminDb
    .collection(COLLECTIONS.PRINT_JOBS)
    .where("studentId", "==", userId)
    .count()
    .get();

  return snap.data().count;
}
