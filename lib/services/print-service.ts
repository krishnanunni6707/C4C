/**
 * PrintService — abstraction over print job operations.
 * Implements strict transactional state machine and refund tracking.
 */

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import {
  COLLECTIONS,
  FirestorePrintJob,
  PrintJobStatus,
} from "@/lib/firebase/collections";
import { createActivityLog } from "@/lib/firestore/activity-logs";
import { destroyAsset } from "@/lib/storage/cloudinary";
import { getUploadRecord } from "@/lib/firestore/uploads";

export class JobNotFoundError extends Error {
  constructor(id: string) {
    super(`Print job not found: ${id}`);
    this.name = "JobNotFoundError";
  }
}

export class JobStateTransitionError extends Error {
  constructor(currentStatus: string, targetStatus: string) {
    super(`Cannot transition print job from ${currentStatus} to ${targetStatus}`);
    this.name = "JobStateTransitionError";
  }
}

export class JobPaymentRequiredError extends Error {
  constructor(msg = "Job must be paid before printing can start") {
    super(msg);
    this.name = "JobPaymentRequiredError";
  }
}

export const VALID_TRANSITIONS: Record<PrintJobStatus, PrintJobStatus[]> = {
  WAITING: ["PRINTING", "CANCELLED"],
  PRINTING: ["READY", "CANCELLED", "WAITING"],
  READY: ["COLLECTED"],
  COLLECTED: [],
  CANCELLED: [],
};

async function deleteJobAsset(job: FirestorePrintJob): Promise<void> {
  if (job.fileDeletedAt) return;

  let publicId = job.cloudinaryPublicId;
  if (!publicId && job.uploadId) {
    const upload = await getUploadRecord(job.uploadId);
    if (upload?.cloudinaryPublicId) {
      publicId = upload.cloudinaryPublicId;
    }
  }

  if (!publicId && job.fileUrl) {
    try {
      const url = new URL(job.fileUrl);
      if (url.hostname === "res.cloudinary.com") {
        const match = url.pathname.match(
          /\/raw\/(?:upload|authenticated)\/(?:v\d+\/)?(.+?)(?:\.[a-zA-Z0-9]+)?$/
        );
        if (match) publicId = match[1];
      }
    } catch {
      // Ignore URL parsing errors
    }
  }

  if (publicId) {
    await destroyAsset(publicId);
  }

  await adminDb
    .collection(COLLECTIONS.PRINT_JOBS)
    .doc(job.id)
    .update({
      fileDeletedAt: FieldValue.serverTimestamp(),
    });
}

class PrintService {
  /**
   * Transition job to PRINTING state within a transaction.
   * Requires paymentStatus === "PAID".
   * Atomically creates student notification.
   */
  async startJob(jobId: string, adminId: string): Promise<FirestorePrintJob> {
    const jobRef = adminDb.collection(COLLECTIONS.PRINT_JOBS).doc(jobId);
    const notifRef = adminDb.collection(COLLECTIONS.NOTIFICATIONS).doc();

    const updatedJob = await adminDb.runTransaction(async (transaction) => {
      const snap = await transaction.get(jobRef);
      if (!snap.exists) {
        throw new JobNotFoundError(jobId);
      }
      const job = { ...snap.data(), id: snap.id } as FirestorePrintJob;

      if (!VALID_TRANSITIONS[job.status]?.includes("PRINTING")) {
        throw new JobStateTransitionError(job.status, "PRINTING");
      }

      if (job.paymentStatus !== "PAID") {
        throw new JobPaymentRequiredError();
      }

      transaction.update(jobRef, {
        status: "PRINTING",
        startedAt: FieldValue.serverTimestamp(),
      });

      transaction.set(notifRef, {
        id: notifRef.id,
        studentId: job.studentId,
        isBroadcast: false,
        type: "PRINTING_STARTED",
        title: "Your document is printing",
        message: `Token #${job.tokenNumber} "${job.fileName}" is now being printed at ${job.locationName}.`,
        jobId,
        tokenNumber: job.tokenNumber,
        readBy: [],
        createdAt: FieldValue.serverTimestamp(),
      });

      return { ...job, status: "PRINTING" as const };
    });

    await createActivityLog({
      adminId,
      action: "JOB_STARTED",
      targetId: jobId,
      details: "Print job started",
    });

    return updatedJob;
  }

  /**
   * Transition job to READY state within a transaction.
   * Atomically creates student notification.
   */
  async markReady(jobId: string, adminId: string): Promise<FirestorePrintJob> {
    const jobRef = adminDb.collection(COLLECTIONS.PRINT_JOBS).doc(jobId);
    const notifRef = adminDb.collection(COLLECTIONS.NOTIFICATIONS).doc();

    const updatedJob = await adminDb.runTransaction(async (transaction) => {
      const snap = await transaction.get(jobRef);
      if (!snap.exists) {
        throw new JobNotFoundError(jobId);
      }
      const job = { ...snap.data(), id: snap.id } as FirestorePrintJob;

      if (!VALID_TRANSITIONS[job.status]?.includes("READY")) {
        throw new JobStateTransitionError(job.status, "READY");
      }

      transaction.update(jobRef, {
        status: "READY",
        readyAt: FieldValue.serverTimestamp(),
      });

      transaction.set(notifRef, {
        id: notifRef.id,
        studentId: job.studentId,
        isBroadcast: false,
        type: "PRINT_READY",
        title: "Your print is ready!",
        message: `Token #${job.tokenNumber} "${job.fileName}" is ready for collection at ${job.locationName}.`,
        jobId,
        tokenNumber: job.tokenNumber,
        readBy: [],
        createdAt: FieldValue.serverTimestamp(),
      });

      return { ...job, status: "READY" as const };
    });

    await createActivityLog({
      adminId,
      action: "JOB_READY",
      targetId: jobId,
      details: "Print job marked as ready for collection",
    });

    return updatedJob;
  }

  /**
   * Transition job from PRINTING back to WAITING on daemon print failure.
   * Records failure reason and logs activity.
   */
  async failJob(
    jobId: string,
    adminId: string,
    reason = "Printing failed"
  ): Promise<FirestorePrintJob> {
    const jobRef = adminDb.collection(COLLECTIONS.PRINT_JOBS).doc(jobId);

    const updatedJob = await adminDb.runTransaction(async (transaction) => {
      const snap = await transaction.get(jobRef);
      if (!snap.exists) {
        throw new JobNotFoundError(jobId);
      }
      const job = { ...snap.data(), id: snap.id } as FirestorePrintJob;

      if (!VALID_TRANSITIONS[job.status]?.includes("WAITING")) {
        throw new JobStateTransitionError(job.status, "WAITING");
      }

      const sanitizedReason = (reason || "Printing failed").slice(0, 500);

      transaction.update(jobRef, {
        status: "WAITING",
        lastPrintError: sanitizedReason,
        failedAt: FieldValue.serverTimestamp(),
      });

      return {
        ...job,
        status: "WAITING" as const,
        lastPrintError: sanitizedReason,
      };
    });

    await createActivityLog({
      adminId,
      action: "JOB_PRINT_FAILED",
      targetId: jobId,
      details: `Print job failed and returned to WAITING: ${(reason || "").slice(0, 200)}`,
    });

    return updatedJob;
  }

  /**
   * Transition job to COLLECTED state within a transaction.
   * Cleans up Cloudinary file assets after commit.
   */
  async markCollected(jobId: string, adminId: string): Promise<FirestorePrintJob> {
    const jobRef = adminDb.collection(COLLECTIONS.PRINT_JOBS).doc(jobId);

    const updatedJob = await adminDb.runTransaction(async (transaction) => {
      const snap = await transaction.get(jobRef);
      if (!snap.exists) {
        throw new JobNotFoundError(jobId);
      }
      const job = { ...snap.data(), id: snap.id } as FirestorePrintJob;

      if (!VALID_TRANSITIONS[job.status]?.includes("COLLECTED")) {
        throw new JobStateTransitionError(job.status, "COLLECTED");
      }

      transaction.update(jobRef, {
        status: "COLLECTED",
        collectedAt: FieldValue.serverTimestamp(),
      });

      return { ...job, status: "COLLECTED" as const };
    });

    await createActivityLog({
      adminId,
      action: "JOB_COLLECTED",
      targetId: jobId,
      details: "Print job collected by student",
    });

    await deleteJobAsset(updatedJob);
    return updatedJob;
  }

  /**
   * Cancel a job within a transaction.
   * If the job was already PAID, flags refundStatus: "REQUIRED".
   * Atomically creates student notification and deletes file asset.
   */
  async cancelJob(
    jobId: string,
    adminId: string,
    reason?: string
  ): Promise<FirestorePrintJob> {
    const jobRef = adminDb.collection(COLLECTIONS.PRINT_JOBS).doc(jobId);
    const notifRef = adminDb.collection(COLLECTIONS.NOTIFICATIONS).doc();

    const updatedJob = await adminDb.runTransaction(async (transaction) => {
      const snap = await transaction.get(jobRef);
      if (!snap.exists) {
        throw new JobNotFoundError(jobId);
      }
      const job = { ...snap.data(), id: snap.id } as FirestorePrintJob;

      if (!VALID_TRANSITIONS[job.status]?.includes("CANCELLED")) {
        throw new JobStateTransitionError(job.status, "CANCELLED");
      }

      const isPaid = job.paymentStatus === "PAID";
      const cancellationReason = reason?.trim() || "Cancelled by administrator";

      transaction.update(jobRef, {
        status: "CANCELLED",
        cancelledAt: FieldValue.serverTimestamp(),
        cancelledBy: adminId,
        cancellationReason,
        ...(isPaid
          ? {
              refundStatus: "REQUIRED",
              refundReason: cancellationReason,
              refundRequestedAt: FieldValue.serverTimestamp(),
            }
          : {}),
      });

      const refundNotice = isPaid
        ? " A refund has been flagged and will be processed by campus administration."
        : "";

      transaction.set(notifRef, {
        id: notifRef.id,
        studentId: job.studentId,
        isBroadcast: false,
        type: "PRINT_CANCELLED",
        title: "Print job cancelled",
        message: `Token #${job.tokenNumber} "${job.fileName}" has been cancelled.${refundNotice}`,
        jobId,
        tokenNumber: job.tokenNumber,
        readBy: [],
        createdAt: FieldValue.serverTimestamp(),
      });

      return {
        ...job,
        status: "CANCELLED" as const,
        refundStatus: isPaid ? ("REQUIRED" as const) : undefined,
      };
    });

    await createActivityLog({
      adminId,
      action: "JOB_CANCELLED",
      targetId: jobId,
      details: `Print job cancelled (${reason || "No reason specified"})${
        updatedJob.refundStatus === "REQUIRED" ? " — REFUND REQUIRED" : ""
      }`,
    });

    await deleteJobAsset(updatedJob);
    return updatedJob;
  }

  /**
   * Super Admin manual payment verification override within a transaction.
   */
  async verifyPayment(
    jobId: string,
    adminId: string,
    reason?: string
  ): Promise<FirestorePrintJob> {
    const jobRef = adminDb.collection(COLLECTIONS.PRINT_JOBS).doc(jobId);
    const notifRef = adminDb.collection(COLLECTIONS.NOTIFICATIONS).doc();

    const updatedJob = await adminDb.runTransaction(async (transaction) => {
      const snap = await transaction.get(jobRef);
      if (!snap.exists) {
        throw new JobNotFoundError(jobId);
      }
      const job = { ...snap.data(), id: snap.id } as FirestorePrintJob;

      if (job.paymentStatus === "PAID") {
        throw new Error("Job is already marked as paid");
      }

      transaction.update(jobRef, {
        paymentStatus: "PAID",
        verifiedBy: adminId,
        verifiedAt: FieldValue.serverTimestamp(),
        manualPaymentReason: reason || "Manual verification by Super Admin",
      });

      transaction.set(notifRef, {
        id: notifRef.id,
        studentId: job.studentId,
        isBroadcast: false,
        type: "PAYMENT_CONFIRMED",
        title: "Payment confirmed",
        message: `Payment of ₹${job.amount.toFixed(2)} for token #${job.tokenNumber} has been verified manually by administrator.`,
        jobId,
        tokenNumber: job.tokenNumber,
        readBy: [],
        createdAt: FieldValue.serverTimestamp(),
      });

      return { ...job, paymentStatus: "PAID" as const };
    });

    await createActivityLog({
      adminId,
      action: "PAYMENT_VERIFIED",
      targetId: jobId,
      details: `Manual payment override by Super Admin: ${reason || "Verified"}`,
    });

    return updatedJob;
  }

  /**
   * Super Admin payment reversal (unpay) within a transaction.
   * Disallowed if job is already printing, ready, or collected.
   */
  async revertPayment(
    jobId: string,
    adminId: string,
    reason: string
  ): Promise<FirestorePrintJob> {
    const jobRef = adminDb.collection(COLLECTIONS.PRINT_JOBS).doc(jobId);

    const updatedJob = await adminDb.runTransaction(async (transaction) => {
      const snap = await transaction.get(jobRef);
      if (!snap.exists) {
        throw new JobNotFoundError(jobId);
      }
      const job = { ...snap.data(), id: snap.id } as FirestorePrintJob;

      if (job.paymentStatus !== "PAID") {
        throw new Error("Job is not marked as paid");
      }

      if (
        job.status === "PRINTING" ||
        job.status === "READY" ||
        job.status === "COLLECTED"
      ) {
        throw new JobStateTransitionError(job.status, "PAYMENT_REVERTED");
      }

      transaction.update(jobRef, {
        paymentStatus: "PENDING",
        unpayReason: reason,
        unpayBy: adminId,
        unpayAt: FieldValue.serverTimestamp(),
      });

      return { ...job, paymentStatus: "PENDING" as const };
    });

    await createActivityLog({
      adminId,
      action: "PAYMENT_REVERTED",
      targetId: jobId,
      details: `Payment reverted to PENDING by Super Admin: ${reason}`,
    });

    return updatedJob;
  }
}

export const printService = new PrintService();

