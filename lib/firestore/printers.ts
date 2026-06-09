/**
 * Firestore helpers for printers collection.
 * Server-side only — never import in client components.
 */

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS, FirestorePrinter } from "@/lib/firebase/collections";

export interface CreatePrinterInput {
  name: string;
  location: string;
  inkPercentage?: number;
  paperPercentage?: number;
}

export interface UpdatePrinterInput {
  name?: string;
  location?: string;
  status?: "ONLINE" | "OFFLINE";
  inkPercentage?: number;
  paperPercentage?: number;
}

export async function getAllPrinters(): Promise<FirestorePrinter[]> {
  const snap = await adminDb
    .collection(COLLECTIONS.PRINTERS)
    .orderBy("createdAt", "asc")
    .get();

  return snap.docs.map((d) => ({ ...d.data(), id: d.id } as FirestorePrinter));
}

export async function getPrinterById(id: string): Promise<FirestorePrinter | null> {
  const doc = await adminDb.collection(COLLECTIONS.PRINTERS).doc(id).get();
  if (!doc.exists) return null;
  return { ...doc.data(), id: doc.id } as FirestorePrinter;
}

export async function createPrinter(
  data: CreatePrinterInput
): Promise<FirestorePrinter> {
  const docRef = adminDb.collection(COLLECTIONS.PRINTERS).doc();

  const printer = {
    id: docRef.id,
    name: data.name.trim(),
    location: data.location.trim(),
    status: "ONLINE" as const,
    inkPercentage: data.inkPercentage ?? 100,
    paperPercentage: data.paperPercentage ?? 100,
    createdAt: FieldValue.serverTimestamp(),
  };

  await docRef.set(printer);
  return printer as unknown as FirestorePrinter;
}

export async function updatePrinter(
  id: string,
  data: UpdatePrinterInput
): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (data.name !== undefined) updates.name = data.name.trim();
  if (data.location !== undefined) updates.location = data.location.trim();
  if (data.status !== undefined) updates.status = data.status;
  if (data.inkPercentage !== undefined) updates.inkPercentage = data.inkPercentage;
  if (data.paperPercentage !== undefined) updates.paperPercentage = data.paperPercentage;

  if (Object.keys(updates).length > 0) {
    await adminDb.collection(COLLECTIONS.PRINTERS).doc(id).update(updates);
  }
}

export async function setPrinterStatus(
  id: string,
  status: "ONLINE" | "OFFLINE"
): Promise<void> {
  await adminDb.collection(COLLECTIONS.PRINTERS).doc(id).update({ status });
}

export async function deletePrinter(id: string): Promise<void> {
  await adminDb.collection(COLLECTIONS.PRINTERS).doc(id).delete();
}
