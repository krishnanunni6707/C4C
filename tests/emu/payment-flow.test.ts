/**
 * Firestore emulator integration test for payment flow and idempotent fulfillment.
 * Run via: npm run test:emu
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { initializeApp, getApps, deleteApp, App } from "firebase-admin/app";
import { getFirestore, Firestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { COLLECTIONS } from "@/lib/firebase/collections";
import {
  createPendingOrder,
  fulfillPaidOrder,
  getPendingOrder,
} from "@/lib/firestore/pending-orders";
import { createUploadRecord } from "@/lib/firestore/uploads";

let app: App;
let db: Firestore;

beforeAll(() => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error(
      "FIRESTORE_EMULATOR_HOST is not set. Run this test with: npm run test:emu"
    );
  }
  if (!getApps().length) {
    app = initializeApp({ projectId: "demo-test-project" }, "payment-emu-test");
  } else {
    app = getApps()[0]!;
  }
  db = getFirestore(app);
});

afterAll(async () => {
  if (app && app.name === "payment-emu-test") {
    await deleteApp(app);
  }
});

describe("Payment Flow Emulator Integration (P-01)", () => {
  const studentId = "stu-emu-p01";
  const locationId = "loc-emu-main";

  beforeAll(async () => {
    // Seed location
    await db.collection(COLLECTIONS.LOCATIONS).doc(locationId).set({
      id: locationId,
      name: "Campus Print Hub",
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  it("creates upload record and pending order, then idempotently fulfills payment", async () => {
    // 1. Create upload record
    const upload = await createUploadRecord({
      ownerId: studentId,
      cloudinaryPublicId: "raw/test-doc-123",
      fileUrl: "https://res.cloudinary.com/demo/raw/upload/test-doc-123.pdf",
      fileName: "Lecture_Notes.pdf",
      pages: 4,
      size: 10240,
      mime: "application/pdf",
    });

    expect(upload.id).toBeDefined();
    expect(upload.consumed).toBe(false);

    // 2. Create pending order
    const orderId = `order_emu_${Date.now()}`;
    const amountPaise = 800; // 4 pages * 200 = 800 paise

    const pendingOrder = await createPendingOrder({
      orderId,
      studentId,
      studentName: "Emu Student",
      admissionNumber: "ADM999",
      uploadId: upload.id,
      fileName: upload.fileName,
      fileUrl: upload.fileUrl,
      cloudinaryPublicId: upload.cloudinaryPublicId,
      totalPages: upload.pages,
      copies: 1,
      colorMode: "BW",
      printType: "SINGLE",
      paperSize: "A4",
      locationId,
      locationName: "Campus Print Hub",
      amountPaise,
    });

    expect(pendingOrder.status).toBe("CREATED");

    // 3. Fulfill paid order
    const paymentId = `pay_emu_${Date.now()}`;
    const result1 = await fulfillPaidOrder({
      orderId,
      razorpayPaymentId: paymentId,
      amountPaise,
      paymentStatus: "captured",
    });

    expect(result1.success).toBe(true);
    expect(result1.alreadyFulfilled).toBe(false);
    expect(result1.printJob.paymentStatus).toBe("PAID");
    expect(result1.printJob.status).toBe("WAITING");
    expect(result1.printJob.amountPaise).toBe(amountPaise);
    expect(result1.printJob.amount).toBe(amountPaise / 100);

    // Verify pending order doc updated to CONSUMED
    const updatedOrder = await getPendingOrder(orderId);
    expect(updatedOrder?.status).toBe("CONSUMED");
    expect(updatedOrder?.jobId).toBe(result1.printJob.id);

    // Verify upload marked consumed
    const uploadDoc = await db.collection(COLLECTIONS.UPLOADS).doc(upload.id).get();
    expect(uploadDoc.data()?.consumed).toBe(true);

    // 4. Test IDEMPOTENCY: calling fulfill again with same payment ID / order ID returns existing job
    const result2 = await fulfillPaidOrder({
      orderId,
      razorpayPaymentId: paymentId,
      amountPaise,
      paymentStatus: "captured",
    });

    expect(result2.success).toBe(true);
    expect(result2.alreadyFulfilled).toBe(true);
    expect(result2.printJob.id).toBe(result1.printJob.id);

    // Verify no duplicate job created
    const jobsSnap = await db
      .collection(COLLECTIONS.PRINT_JOBS)
      .where("razorpayPaymentId", "==", paymentId)
      .get();
    expect(jobsSnap.size).toBe(1);
  });

  it("rejects fulfillment when payment amount does not match pending order", async () => {
    const orderId = `order_mismatch_${Date.now()}`;
    await createPendingOrder({
      orderId,
      studentId,
      studentName: "Emu Student",
      admissionNumber: "ADM999",
      fileName: "Test.pdf",
      fileUrl: "https://example.com/test.pdf",
      totalPages: 2,
      copies: 1,
      colorMode: "BW",
      printType: "SINGLE",
      paperSize: "A4",
      locationId,
      locationName: "Campus Print Hub",
      amountPaise: 400,
    });

    await expect(
      fulfillPaidOrder({
        orderId,
        razorpayPaymentId: `pay_mismatch_${Date.now()}`,
        amountPaise: 200, // mismatch: expected 400
        paymentStatus: "captured",
      })
    ).rejects.toThrow(/Amount mismatch/);
  });

  it("rejects fulfillment when payment status is not captured", async () => {
    const orderId = `order_failed_${Date.now()}`;
    await createPendingOrder({
      orderId,
      studentId,
      studentName: "Emu Student",
      admissionNumber: "ADM999",
      fileName: "Test.pdf",
      fileUrl: "https://example.com/test.pdf",
      totalPages: 1,
      copies: 1,
      colorMode: "BW",
      printType: "SINGLE",
      paperSize: "A4",
      locationId,
      locationName: "Campus Print Hub",
      amountPaise: 200,
    });

    await expect(
      fulfillPaidOrder({
        orderId,
        razorpayPaymentId: `pay_failed_${Date.now()}`,
        amountPaise: 200,
        paymentStatus: "failed",
      })
    ).rejects.toThrow(/expected 'captured'/);
  });
});
