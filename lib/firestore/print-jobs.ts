/**
 * Firestore helpers for printJobs collection.
 * Server-side only — never import in client components.
 */

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS, FirestorePrintJob } from "@/lib/firebase/collections";

// ─── Token number generation ──────────────────────────────────────────────────

/**
 * Generate the next sequential token number (e.g. RP1001 → RP1002).
 * Reads the most recently created job to determine the last number.
 */
export async function generateTokenNumber(): Promise<string> {
  const snap = await adminDb
    .collection(COLLECTIONS.PRINT_JOBS)
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();

  if (snap.empty) return "RP1001";

  const last = snap.docs[0].data() as FirestorePrintJob;
  const lastNum = parseInt(last.tokenNumber.replace("RP", ""), 10);
  return `RP${isNaN(lastNum) ? 1001 : lastNum + 1}`;
}

// ─── Queue position ───────────────────────────────────────────────────────────

/**
 * Count active (non-terminal) jobs to determine next queue position.
 */
export async function getNextQueuePosition(): Promise<number> {
  const snap = await adminDb
    .collection(COLLECTIONS.PRINT_JOBS)
    .where("status", "in", ["WAITING", "PRINTING"])
    .get();

  return snap.size + 1;
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
  paymentMethod: "QR" | "CASH";
}

export async function createPrintJob(
  input: CreatePrintJobInput
): Promise<FirestorePrintJob & { id: string }> {
  const tokenNumber = await generateTokenNumber();

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
    paymentStatus: "PENDING",
    status: "WAITING",
    createdAt: FieldValue.serverTimestamp(),
  };

  await docRef.set(job);

  return { ...job, id: docRef.id } as FirestorePrintJob & { id: string };
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
 */
export async function getActiveQueue(): Promise<FirestorePrintJob[]> {
  const snap = await adminDb
    .collection(COLLECTIONS.PRINT_JOBS)
    .where("status", "in", ["WAITING", "PRINTING"])
    .orderBy("createdAt", "asc")
    .get();

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
