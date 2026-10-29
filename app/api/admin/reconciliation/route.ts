/**
 * GET /api/admin/reconciliation
 * SUPER_ADMIN only endpoint to detect payment and job reconciliation anomalies:
 * 1. Pending orders >10 min old with captured payments and no job
 * 2. Print jobs with missing or invalid payment records
 */

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/guards";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS, FirestorePendingOrder, FirestorePrintJob } from "@/lib/firebase/collections";
import { safeErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const guard = await requireRole("SUPER_ADMIN");
    if (!guard.ok) return guard.response;
    const session = guard.session;

    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const authHeader =
      keyId && keySecret
        ? "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64")
        : null;

    const anomalies: Array<{
      type: "CAPTURED_PAYMENT_NO_JOB" | "JOB_WITHOUT_PAYMENT_ID" | "JOB_PAYMENT_NOT_CAPTURED";
      id: string;
      details: Record<string, unknown>;
    }> = [];

    // 1. Scan old CREATED pending orders
    const pendingSnap = await adminDb
      .collection(COLLECTIONS.PENDING_ORDERS)
      .where("status", "==", "CREATED")
      .get();

    for (const doc of pendingSnap.docs) {
      const order = { ...doc.data(), id: doc.id } as FirestorePendingOrder;
      const createdAtMs =
        order.createdAt && typeof (order.createdAt as any).toMillis === "function"
          ? (order.createdAt as any).toMillis()
          : 0;

      if (createdAtMs > tenMinutesAgo) continue;

      // Check if Razorpay received a captured payment for this order
      if (authHeader) {
        try {
          const rzpRes = await fetch(
            `https://api.razorpay.com/v1/orders/${encodeURIComponent(order.orderId)}/payments`,
            { headers: { Authorization: authHeader } }
          );

          if (rzpRes.ok) {
            const data = await rzpRes.json();
            const capturedPayment = data.items?.find((p: any) => p.status === "captured");
            if (capturedPayment) {
              // Check if a job exists
              const jobSnap = await adminDb
                .collection(COLLECTIONS.PRINT_JOBS)
                .where("razorpayOrderId", "==", order.orderId)
                .limit(1)
                .get();

              if (jobSnap.empty) {
                anomalies.push({
                  type: "CAPTURED_PAYMENT_NO_JOB",
                  id: order.orderId,
                  details: {
                    orderId: order.orderId,
                    studentId: order.studentId,
                    amountPaise: order.amountPaise,
                    paymentId: capturedPayment.id,
                    createdAt: order.createdAt,
                  },
                });
              }
            }
          }
        } catch (fetchErr) {
          console.warn("[reconciliation] Failed to query Razorpay for order:", order.orderId, fetchErr);
        }
      }
    }

    // 2. Scan recent print jobs for missing or unconfirmed payment
    const jobsSnap = await adminDb
      .collection(COLLECTIONS.PRINT_JOBS)
      .where("paymentMethod", "==", "RAZORPAY")
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    for (const doc of jobsSnap.docs) {
      const job = { ...doc.data(), id: doc.id } as FirestorePrintJob;

      if (!job.razorpayPaymentId || !job.razorpayOrderId) {
        anomalies.push({
          type: "JOB_WITHOUT_PAYMENT_ID",
          id: job.id,
          details: {
            jobId: job.id,
            studentId: job.studentId,
            tokenNumber: job.tokenNumber,
            paymentStatus: job.paymentStatus,
          },
        });
      } else if (authHeader) {
        try {
          const rzpRes = await fetch(
            `https://api.razorpay.com/v1/payments/${encodeURIComponent(job.razorpayPaymentId)}`,
            { headers: { Authorization: authHeader } }
          );
          if (rzpRes.ok) {
            const payment = await rzpRes.json();
            if (payment.status !== "captured") {
              anomalies.push({
                type: "JOB_PAYMENT_NOT_CAPTURED",
                id: job.id,
                details: {
                  jobId: job.id,
                  paymentId: job.razorpayPaymentId,
                  actualStatus: payment.status,
                },
              });
            }
          }
        } catch (fetchErr) {
          console.warn("[reconciliation] Failed to query payment:", job.razorpayPaymentId, fetchErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      anomaliesCount: anomalies.length,
      anomalies,
      checkedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    return safeErrorResponse(error, {
      status: 500,
      publicMessage: "Failed to run reconciliation.",
    });
  }
}
