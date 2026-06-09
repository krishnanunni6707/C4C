/**
 * Firestore helpers for users collection.
 * Server-side only — never import in client components.
 */

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS, FirestoreUser } from "@/lib/firebase/collections";
import { hashPassword } from "@/lib/firestore/auth";

export interface CreateUserInput {
  name: string;
  admissionNumber: string;
  department: string;
  semester: number;
  email?: string;
  phone?: string;
  role: "STUDENT" | "ADMIN";
}

// Generate a random temporary password
function generateTempPassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let pass = "";
  for (let i = 0; i < 8; i++) {
    pass += chars[Math.floor(Math.random() * chars.length)];
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

export async function createUser(data: CreateUserInput): Promise<FirestoreUser> {
  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  const docRef = adminDb.collection(COLLECTIONS.USERS).doc();

  const user: Omit<FirestoreUser, "createdAt"> & { createdAt: unknown } = {
    id: docRef.id,
    admissionNumber: data.admissionNumber.trim().toUpperCase(),
    name: data.name.trim(),
    department: data.department,
    semester: data.semester,
    ...(data.email ? { email: data.email } : {}),
    ...(data.phone ? { phone: data.phone } : {}),
    passwordHash,
    role: data.role,
    firstLogin: true,
    status: "ACTIVE",
    createdAt: FieldValue.serverTimestamp(),
  };

  await docRef.set(user);
  return user as FirestoreUser;
}

export async function updateUser(
  id: string,
  data: Partial<FirestoreUser>
): Promise<void> {
  // Never allow direct passwordHash update through this function
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
 */
export async function resetUserPassword(
  id: string,
  tempPassword: string
): Promise<string> {
  const passwordHash = await hashPassword(tempPassword);
  await adminDb.collection(COLLECTIONS.USERS).doc(id).update({
    passwordHash,
    firstLogin: true,
  });
  return tempPassword;
}

export async function getUserPrintJobCount(userId: string): Promise<number> {
  const snap = await adminDb
    .collection(COLLECTIONS.PRINT_JOBS)
    .where("studentId", "==", userId)
    .count()
    .get();

  return snap.data().count;
}
