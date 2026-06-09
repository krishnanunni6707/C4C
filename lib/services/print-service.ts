/**
 * PrintService — abstraction over print job operations.
 * Designed to be Raspberry Pi ready: the hardware send step is a stub
 * that can be implemented once the Pi endpoint is available.
 */

import {
  updatePrintJobStatus,
  updatePaymentStatus,
} from "@/lib/firestore/print-jobs";
import { createActivityLog } from "@/lib/firestore/activity-logs";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";

class PrintService {
  /**
   * Transition job to PRINTING state.
   * Future: send job to Raspberry Pi print server.
   */
  async startJob(jobId: string, adminId: string): Promise<void> {
    await updatePrintJobStatus(jobId, "PRINTING");
    await createActivityLog({
      adminId,
      action: "JOB_STARTED",
      targetId: jobId,
      details: "Print job started",
    });
    // TODO: POST to Raspberry Pi endpoint when hardware is available
  }

  /**
   * Transition job to READY state (print complete, awaiting collection).
   */
  async markReady(jobId: string, adminId: string): Promise<void> {
    await updatePrintJobStatus(jobId, "READY");
    await createActivityLog({
      adminId,
      action: "JOB_READY",
      targetId: jobId,
      details: "Print job marked as ready for collection",
    });
  }

  /**
   * Transition job to COLLECTED state (student picked up printout).
   */
  async markCollected(jobId: string, adminId: string): Promise<void> {
    await updatePrintJobStatus(jobId, "COLLECTED");
    await createActivityLog({
      adminId,
      action: "JOB_COLLECTED",
      targetId: jobId,
      details: "Print job collected by student",
    });
  }

  /**
   * Cancel a job. Uses a string cast because CANCELLED is an extension
   * of the original status union (added in the updated collections.ts).
   */
  async cancelJob(jobId: string, adminId: string): Promise<void> {
    // Use adminDb directly to also set cancelledAt timestamp
    await adminDb
      .collection(COLLECTIONS.PRINT_JOBS)
      .doc(jobId)
      .update({
        status: "CANCELLED",
        cancelledAt: FieldValue.serverTimestamp(),
      });
    await createActivityLog({
      adminId,
      action: "JOB_CANCELLED",
      targetId: jobId,
      details: "Print job cancelled by admin",
    });
  }

  /**
   * Mark payment as PAID and log the verification.
   */
  async verifyPayment(jobId: string, adminId: string): Promise<void> {
    await updatePaymentStatus(jobId, "PAID", adminId);
    await createActivityLog({
      adminId,
      action: "PAYMENT_VERIFIED",
      targetId: jobId,
      details: "Payment verified by admin",
    });
  }
}

export const printService = new PrintService();
