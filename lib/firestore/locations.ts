/**
 * Firestore helpers for locations collection.
 * Server-side only — never import in client components.
 */

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS, FirestoreLocation } from "@/lib/firebase/collections";

// ─── The default location used for backward-compatibility migration ────────────

export const DEFAULT_LOCATION_ID = "DEFAULT";
export const DEFAULT_LOCATION_NAME = "Main Print Room";

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getAllLocations(): Promise<FirestoreLocation[]> {
  const snap = await adminDb
    .collection(COLLECTIONS.LOCATIONS)
    .get();

  const locations = snap.docs.map((d) => ({ ...d.data(), id: d.id } as FirestoreLocation));

  return locations.sort((a, b) => {
    const aTime = a.createdAt && typeof (a.createdAt as any).toDate === "function"
      ? (a.createdAt as any).toDate().getTime()
      : 0;
    const bTime = b.createdAt && typeof (b.createdAt as any).toDate === "function"
      ? (b.createdAt as any).toDate().getTime()
      : 0;
    return aTime - bTime;
  });
}

export async function getActiveLocations(): Promise<FirestoreLocation[]> {
  // Note: no orderBy here to avoid requiring a composite Firestore index
  // on (isActive, createdAt). Results are sorted in-memory instead.
  const snap = await adminDb
    .collection(COLLECTIONS.LOCATIONS)
    .where("isActive", "==", true)
    .get();

  const locations = snap.docs.map((d) => ({ ...d.data(), id: d.id } as FirestoreLocation));

  // Sort by createdAt ascending in-memory
  return locations.sort((a, b) => {
    const aTime = a.createdAt && typeof (a.createdAt as any).toDate === "function"
      ? (a.createdAt as any).toDate().getTime()
      : 0;
    const bTime = b.createdAt && typeof (b.createdAt as any).toDate === "function"
      ? (b.createdAt as any).toDate().getTime()
      : 0;
    return aTime - bTime;
  });
}

export async function getLocationById(
  id: string
): Promise<FirestoreLocation | null> {
  const doc = await adminDb.collection(COLLECTIONS.LOCATIONS).doc(id).get();
  if (!doc.exists) return null;
  return { ...doc.data(), id: doc.id } as FirestoreLocation;
}

// ─── Create ───────────────────────────────────────────────────────────────────

export interface CreateLocationInput {
  name: string;
  building?: string;
  floor?: string;
}

export async function createLocation(
  input: CreateLocationInput
): Promise<FirestoreLocation> {
  const docRef = adminDb.collection(COLLECTIONS.LOCATIONS).doc();

  const location: Omit<FirestoreLocation, "createdAt"> & { createdAt: unknown } =
    {
      id: docRef.id,
      name: input.name.trim(),
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
      ...(input.building ? { building: input.building.trim() } : {}),
      ...(input.floor ? { floor: input.floor.trim() } : {}),
    };

  await docRef.set(location);
  return location as FirestoreLocation;
}

/**
 * Ensure the default location exists. Used during migration and initial setup.
 * Idempotent — safe to call multiple times.
 */
export async function ensureDefaultLocation(): Promise<FirestoreLocation> {
  const existing = await adminDb
    .collection(COLLECTIONS.LOCATIONS)
    .doc(DEFAULT_LOCATION_ID)
    .get();

  if (existing.exists) {
    return { ...existing.data(), id: existing.id } as FirestoreLocation;
  }

  const location = {
    id: DEFAULT_LOCATION_ID,
    name: DEFAULT_LOCATION_NAME,
    isActive: true,
    createdAt: FieldValue.serverTimestamp(),
  };

  await adminDb
    .collection(COLLECTIONS.LOCATIONS)
    .doc(DEFAULT_LOCATION_ID)
    .set(location);

  return location as FirestoreLocation;
}

// ─── Update ───────────────────────────────────────────────────────────────────

export interface UpdateLocationInput {
  name?: string;
  isActive?: boolean;
  building?: string;
  floor?: string;
}

export async function updateLocation(
  id: string,
  data: UpdateLocationInput
): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (data.name !== undefined) updates.name = data.name.trim();
  if (data.isActive !== undefined) updates.isActive = data.isActive;
  if (data.building !== undefined) updates.building = data.building.trim();
  if (data.floor !== undefined) updates.floor = data.floor.trim();

  if (Object.keys(updates).length > 0) {
    await adminDb.collection(COLLECTIONS.LOCATIONS).doc(id).update(updates);
  }
}

export async function setLocationActive(
  id: string,
  isActive: boolean
): Promise<void> {
  await adminDb
    .collection(COLLECTIONS.LOCATIONS)
    .doc(id)
    .update({ isActive });
}
