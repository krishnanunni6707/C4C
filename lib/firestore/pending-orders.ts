/**
 * Firestore helpers for pending orders and idempotent payment fulfillment.
 * Server-side only — never import in client components.
 */

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import {
  COLLECTIONS,
  ColorMode,
  PrintType,
  PaperSize,
  FirestorePendingOrder,
  FirestorePrintJob,
} from "@/lib/firebase/collections";
import { generateTokenNumber } from "@/lib/firestore/print-jobs";

export interface CreatePendingOrderInput {
  orderId: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  uploadId?: string;
  fileName: string;
  fileUrl: string;
  cloudinaryPublicId?: string;
  totalPages: number;
  copies: number;
  colorMode: ColorMode;
  printType: PrintType;
  paperSize: PaperSize;
  locationId: string;
  locationName: string;
  amountPaise: number;
}

export async function createPendingOrder(
  input: CreatePendingOrderInput
): Promise<FirestorePendingOrder> {
  const docRef = adminDb.collection(COLLECTIONS.PENDING_ORDERS).doc(input.orderId);

  const expiresAt = Timestamp.fromMillis(Date.now() + 30 * 60 * 1000); // 30 minutes

  const pendingOrder: Omit<FirestorePendingOrder, "createdAt"> & {
    createdAt: unknown;
  } = {
    id: input.orderId,
    orderId: input.orderId,
    studentId: input.studentId,
    studentName: input.studentName,
    admissionNumber: input.admissionNumber,
    uploadId: input.uploadId,
    fileName: input.fileName,
    fileUrl: input.fileUrl,
    cloudinaryPublicId: input.cloudinaryPublicId,
    totalPages: input.totalPages,
    copies: input.copies,
    colorMode: input.colorMode,
    printType: input.printType,
    paperSize: input.paperSize,
    locationId: input.locationId,
    locationName: input.locationName,
    amountPaise: input.amountPaise,
    status: "CREATED",
    createdAt: FieldValue.serverTimestamp(),
    expiresAt,
  };

  await docRef.set(pendingOrder);

  return {
    ...pendingOrder,
    createdAt: Timestamp.now(),
  } as FirestorePendingOrder;
}

export async function getPendingOrder(
  orderId: string
): Promise<FirestorePendingOrder | null> {
  const doc = await adminDb
    .collection(COLLECTIONS.PENDING_ORDERS)
    .doc(orderId)
    .get();

  if (!doc.exists) return null;
  return { ...doc.data(), id: doc.id } as FirestorePendingOrder;
}

export interface FulfillPaidOrderInput {
  orderId: string;
  razorpayPaymentId: string;
  amountPaise: number;
  paymentStatus: string;
}

export interface FulfillPaidOrderResult {
  success: boolean;
  printJob: FirestorePrintJob;
  alreadyFulfilled: boolean;
}

/**
 * Idempotently fulfills a paid Razorpay order into a WAITING print job.
 * Guaranteed: One Razorpay payment ID produces at most ONE print job.
 */
export async function fulfillPaidOrder({
  orderId,
  razorpayPaymentId,
  amountPaise,
  paymentStatus,
}: FulfillPaidOrderInput): Promise<FulfillPaidOrderResult> {
  if (paymentStatus !== "captured") {
    throw new Error(`Cannot fulfill order: payment status is '${paymentStatus}', expected 'captured'`);
  }

  // Check if a job with this razorpayPaymentId already exists (anti-replay check)
  const existingJobSnap = await adminDb
    .collection(COLLECTIONS.PRINT_JOBS)
    .where("razorpayPaymentId", "==", razorpayPaymentId)
    .limit(1)
    .get();

  if (!existingJobSnap.empty) {
    const job = {
      ...existingJobSnap.docs[0].data(),
      id: existingJobSnap.docs[0].id,
    } as FirestorePrintJob;
    return {
      success: true,
      printJob: job,
      alreadyFulfilled: true,
    };
  }

  // Pre-generate token number before transaction
  const tokenNumber = await generateTokenNumber();
  const newJobRef = adminDb.collection(COLLECTIONS.PRINT_JOBS).doc();
  const txRef = adminDb.collection(COLLECTIONS.TRANSACTIONS).doc();

  return await adminDb.runTransaction(async (transaction) => {
    const orderRef = adminDb.collection(COLLECTIONS.PENDING_ORDERS).doc(orderId);
    const orderDoc = await transaction.get(orderRef);

    if (!orderDoc.exists) {
      throw new Error(`Pending order '${orderId}' not found`);
    }

    const orderData = orderDoc.data() as FirestorePendingOrder;

    // If order was already consumed, return the created job
    if (orderData.status === "CONSUMED" && orderData.jobId) {
      const jobDoc = await transaction.get(
        adminDb.collection(COLLECTIONS.PRINT_JOBS).doc(orderData.jobId)
      );
      if (jobDoc.exists) {
        return {
          success: true,
          printJob: { ...jobDoc.data(), id: jobDoc.id } as FirestorePrintJob,
          alreadyFulfilled: true,
        };
      }
    }

    // Verify amount matches server-calculated amount
    if (orderData.amountPaise !== amountPaise) {
      throw new Error(
        `Amount mismatch: order requires ${orderData.amountPaise} paise, but payment is ${amountPaise} paise`
      );
    }

    const jobData: Omit<FirestorePrintJob, "createdAt"> & {
      createdAt: unknown;
    } = {
      id: newJobRef.id,
      tokenNumber,
      studentId: orderData.studentId,
      studentName: orderData.studentName,
      admissionNumber: orderData.admissionNumber,
      fileName: orderData.fileName,
      fileUrl: orderData.fileUrl,
      totalPages: orderData.totalPages,
      copies: orderData.copies,
      colorMode: orderData.colorMode,
      printType: orderData.printType,
      paperSize: orderData.paperSize,
      amount: orderData.amountPaise / 100,
      amountPaise: orderData.amountPaise,
      paymentMethod: "RAZORPAY",
      paymentStatus: "PAID",
      status: "WAITING",
      locationId: orderData.locationId,
      locationName: orderData.locationName,
      razorpayOrderId: orderId,
      razorpayPaymentId,
      uploadId: orderData.uploadId,
      createdAt: FieldValue.serverTimestamp(),
    };

    // 1. Create print job
    transaction.set(newJobRef, jobData);

    // 2. Mark pending order CONSUMED
    transaction.update(orderRef, {
      status: "CONSUMED",
      jobId: newJobRef.id,
      razorpayPaymentId,
      consumedAt: FieldValue.serverTimestamp(),
    });

    // 3. Mark upload consumed if uploadId exists
    if (orderData.uploadId) {
      const uploadRef = adminDb.collection(COLLECTIONS.UPLOADS).doc(orderData.uploadId);
      transaction.update(uploadRef, {
        consumed: true,
        consumedAt: FieldValue.serverTimestamp(),
      });
    }

    // 4. Create transaction log
    transaction.set(txRef, {
      id: txRef.id,
      printJobId: newJobRef.id,
      studentId: orderData.studentId,
      amount: orderData.amountPaise / 100,
      paymentMethod: "RAZORPAY",
      paymentStatus: "PAID",
      createdAt: FieldValue.serverTimestamp(),
    });

    const createdJob = {
      ...jobData,
      createdAt: Timestamp.now(),
    } as FirestorePrintJob;

    return {
      success: true,
      printJob: createdJob,
      alreadyFulfilled: false,
    };
  });
}
