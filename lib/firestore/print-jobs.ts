/**
 * Firestore helpers for printJobs collection.
 * Server-side only — never import in client components.
 */

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS, FirestorePrintJob } from "@/lib/firebase/collections";

// ─── Token number generation ──────────────────────────────────────────────────

/**
 * Generate the next sequential token number (e.g. RP1001 → RP1002) atomically.
 * Uses counters/printJobs in a transaction to prevent race conditions.
 */
export async function generateTokenNumber(
  transaction?: FirebaseFirestore.Transaction
): Promise<string> {
  const counterRef = adminDb.collection(COLLECTIONS.COUNTERS).doc("printJobs");

  if (transaction) {
    const snap = await transaction.get(counterRef);
    let nextNum = 1001;
    if (snap.exists) {
      const data = snap.data();
      const current = typeof data?.current === "number" ? data.current : NaN;
      if (!isNaN(current) && current >= 1000) {
        nextNum = current + 1;
      }
    }
    transaction.set(
      counterRef,
      { current: nextNum, updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );
    return `RP${nextNum}`;
  }

  return await adminDb.runTransaction(async (t) => {
    const snap = await t.get(counterRef);
    let nextNum = 1001;
    if (snap.exists) {
      const data = snap.data();
      const current = typeof data?.current === "number" ? data.current : NaN;
      if (!isNaN(current) && current >= 1000) {
        nextNum = current + 1;
      }
    }
    t.set(
      counterRef,
      { current: nextNum, updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );
    return `RP${nextNum}`;
  });
}

// ─── Queue position ───────────────────────────────────────────────────────────

/**
 * Count active (non-terminal) jobs to determine next queue position.
 * Uses Firestore aggregation count() to avoid fetching document bodies.
 * Pass locationId to scope to a single location.
 */
export async function getNextQueuePosition(locationId?: string): Promise<number> {
  let query = adminDb
    .collection(COLLECTIONS.PRINT_JOBS)
    .where("status", "in", ["WAITING", "PRINTING"]);

  if (locationId) {
    query = query.where("locationId", "==", locationId) as typeof query;
  }

  const snap = await query.count().get();
  return snap.data().count + 1;
}

// ─── Create ───────────────────────────────────────────────────────────────────

export interface CreatePrintJobInput {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  fileName: string;
  fileUrl: string;
  totalPages: number;
  copies: number;
  colorMode: "BW" | "COLOR";
  printType: "SINGLE" | "DOUBLE";
  paperSize: "A4";
  amount: number;
  paymentMethod: "RAZORPAY";
  paymentStatus?: "PENDING" | "PAID";
  locationId: string;
  locationName: string;
}

export async function createPrintJob(
  input: CreatePrintJobInput
): Promise<FirestorePrintJob & { id: string }> {
  return await adminDb.runTransaction(async (transaction) => {
    const tokenNumber = await generateTokenNumber(transaction);
    const docRef = adminDb.collection(COLLECTIONS.PRINT_JOBS).doc();

    const job: Omit<FirestorePrintJob, "createdAt"> & { createdAt: unknown } = {
      id: docRef.id,
      tokenNumber,
      studentId: input.studentId,
      studentName: input.studentName,
      admissionNumber: input.admissionNumber,
      fileName: input.fileName,
      fileUrl: input.fileUrl,
      totalPages: input.totalPages,
      copies: input.copies,
      colorMode: input.colorMode,
      printType: input.printType,
      paperSize: input.paperSize,
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      paymentStatus: input.paymentStatus ?? "PENDING",
      status: "WAITING",
      locationId: input.locationId,
      locationName: input.locationName,
      createdAt: FieldValue.serverTimestamp(),
    };

    transaction.set(docRef, job);
    return { ...job, id: docRef.id } as FirestorePrintJob & { id: string };
  });
}

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Get all jobs for a specific student, newest first.
 */
export async function getPrintJobsByStudent(
  studentId: string
): Promise<FirestorePrintJob[]> {
  const snap = await adminDb
    .collection(COLLECTIONS.PRINT_JOBS)
    .where("studentId", "==", studentId)
    .orderBy("createdAt", "desc")
    .get();

  return snap.docs.map((d) => ({ ...d.data(), id: d.id } as FirestorePrintJob));
}

/**
 * Get all active queue jobs (WAITING + PRINTING), oldest first.
 * Pass locationId to scope to a single location; omit for SUPER_ADMIN global view.
 */
export async function getActiveQueue(locationId?: string): Promise<FirestorePrintJob[]> {
  let query = adminDb
    .collection(COLLECTIONS.PRINT_JOBS)
    .where("status", "in", ["WAITING", "PRINTING"]);

  if (locationId) {
    query = query.where("locationId", "==", locationId) as typeof query;
  }

  const snap = await query.orderBy("createdAt", "asc").get();
  return snap.docs.map((d) => ({ ...d.data(), id: d.id } as FirestorePrintJob));
}

/**
 * Get a single print job by document ID.
 */
export async function getPrintJobById(
  id: string
): Promise<FirestorePrintJob | null> {
  const doc = await adminDb.collection(COLLECTIONS.PRINT_JOBS).doc(id).get();
  if (!doc.exists) return null;
  return { ...doc.data(), id: doc.id } as FirestorePrintJob;
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updatePrintJobStatus(
  id: string,
  status: FirestorePrintJob["status"]
): Promise<void> {
  await adminDb.collection(COLLECTIONS.PRINT_JOBS).doc(id).update({ status });
}

export async function updatePaymentStatus(
  id: string,
  paymentStatus: "PENDING" | "PAID",
  verifiedBy?: string
): Promise<void> {
  await adminDb
    .collection(COLLECTIONS.PRINT_JOBS)
    .doc(id)
    .update({
      paymentStatus,
      ...(verifiedBy ? { verifiedBy } : {}),
    });
}
