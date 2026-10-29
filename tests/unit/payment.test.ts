import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";
import { POST as verifyPost } from "@/app/api/payment/razorpay/verify/route";
import { POST as webhookPost } from "@/app/api/payment/razorpay/webhook/route";
import { POST as createJobPost } from "@/app/api/print-jobs/create/route";

// Mock getServerSession
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

// Mock pending-orders firestore module
vi.mock("@/lib/firestore/pending-orders", () => ({
  getPendingOrder: vi.fn(),
  fulfillPaidOrder: vi.fn(),
}));

import { getServerSession } from "next-auth";
import {
  getPendingOrder,
  fulfillPaidOrder,
} from "@/lib/firestore/pending-orders";

describe("Payment Security & Binding (P-01)", () => {
  const SECRET = "test_razorpay_secret_1234567890";
  const WEBHOOK_SECRET = "test_webhook_secret_9876543210";

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RAZORPAY_KEY_ID = "rzp_test_key";
    process.env.RAZORPAY_KEY_SECRET = SECRET;
    process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;
    delete process.env.PAYMENT_TEST_MODE;
  });

  describe("Direct Job Creation Blocker", () => {
    it("strictly rejects direct calls to /api/print-jobs/create with 400", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "student-123", role: "STUDENT" },
      } as any);
      const res = await createJobPost();
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/Direct print job creation is disabled/);
    });
  });

  describe("POST /api/payment/razorpay/verify", () => {
    const studentUser = {
      id: "student-123",
      name: "Alice",
      admissionNumber: "ADM001",
      role: "STUDENT",
    };

    it("rejects unauthenticated requests with 401", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const req = new Request("http://localhost/api/payment/razorpay/verify", {
        method: "POST",
        body: JSON.stringify({
          razorpay_order_id: "order_123",
          razorpay_payment_id: "pay_123",
          razorpay_signature: "sig_123",
        }),
      });

      const res = await verifyPost(req);
      expect(res.status).toBe(401);
    });

    it("rejects when order belongs to a different student with 403", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: studentUser,
      } as any);

      vi.mocked(getPendingOrder).mockResolvedValueOnce({
        id: "order_123",
        orderId: "order_123",
        studentId: "different-student-456",
        amountPaise: 1000,
      } as any);

      const req = new Request("http://localhost/api/payment/razorpay/verify", {
        method: "POST",
        body: JSON.stringify({
          razorpay_order_id: "order_123",
          razorpay_payment_id: "pay_123",
          razorpay_signature: "sig_123",
        }),
      });

      const res = await verifyPost(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toMatch(/belongs to another student/);
    });

    it("rejects tampered signature with 400", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: studentUser,
      } as any);

      vi.mocked(getPendingOrder).mockResolvedValueOnce({
        id: "order_123",
        orderId: "order_123",
        studentId: "student-123",
        amountPaise: 1000,
      } as any);

      const tamperedSignature = "bad_signature_deadbeef";

      const req = new Request("http://localhost/api/payment/razorpay/verify", {
        method: "POST",
        body: JSON.stringify({
          razorpay_order_id: "order_123",
          razorpay_payment_id: "pay_123",
          razorpay_signature: tamperedSignature,
        }),
      });

      const res = await verifyPost(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/Invalid payment signature/);
    });

    it("rejects valid signature when Razorpay payment is not captured", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: studentUser,
      } as any);

      vi.mocked(getPendingOrder).mockResolvedValueOnce({
        id: "order_123",
        orderId: "order_123",
        studentId: "student-123",
        amountPaise: 1000,
      } as any);

      const orderId = "order_123";
      const paymentId = "pay_valid_123";
      const validSignature = crypto
        .createHmac("sha256", SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");

      // Mock global fetch for Razorpay API returning payment with status 'failed'
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: paymentId,
          order_id: orderId,
          status: "failed",
          amount: 1000,
          currency: "INR",
        }),
      } as any);

      const req = new Request("http://localhost/api/payment/razorpay/verify", {
        method: "POST",
        body: JSON.stringify({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: validSignature,
        }),
      });

      const res = await verifyPost(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/Payment not captured/);

      global.fetch = originalFetch;
    });

    it("rejects when payment amount does not match stored amountPaise", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: studentUser,
      } as any);

      vi.mocked(getPendingOrder).mockResolvedValueOnce({
        id: "order_123",
        orderId: "order_123",
        studentId: "student-123",
        amountPaise: 1000, // expected 1000 paise (Rs 10)
      } as any);

      const orderId = "order_123";
      const paymentId = "pay_underpaid_123";
      const validSignature = crypto
        .createHmac("sha256", SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");

      const originalFetch = global.fetch;
      // Gateway received only 500 paise
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: paymentId,
          order_id: orderId,
          status: "captured",
          amount: 500, // mismatch!
          currency: "INR",
        }),
      } as any);

      const req = new Request("http://localhost/api/payment/razorpay/verify", {
        method: "POST",
        body: JSON.stringify({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: validSignature,
        }),
      });

      const res = await verifyPost(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/Payment amount mismatch/);

      global.fetch = originalFetch;
    });

    it("rejects mock payment IDs when in production", async () => {
      const prevEnv = process.env.NODE_ENV;
      // @ts-expect-error mutating NODE_ENV for test
      process.env.NODE_ENV = "production";
      process.env.PAYMENT_TEST_MODE = "1";

      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: studentUser,
      } as any);

      vi.mocked(getPendingOrder).mockResolvedValueOnce({
        id: "order_123",
        orderId: "order_123",
        studentId: "student-123",
        amountPaise: 1000,
      } as any);

      const req = new Request("http://localhost/api/payment/razorpay/verify", {
        method: "POST",
        body: JSON.stringify({
          razorpay_order_id: "order_123",
          razorpay_payment_id: "pay_rzp_mock_12345",
          razorpay_signature: "mock_sig",
        }),
      });

      const res = await verifyPost(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/Mock payments are forbidden/);

      // @ts-expect-error restore
      process.env.NODE_ENV = prevEnv;
    });

    it("successfully verifies valid captured payment and fulfills order", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: studentUser,
      } as any);

      vi.mocked(getPendingOrder).mockResolvedValueOnce({
        id: "order_123",
        orderId: "order_123",
        studentId: "student-123",
        amountPaise: 1000,
      } as any);

      const orderId = "order_123";
      const paymentId = "pay_valid_123";
      const validSignature = crypto
        .createHmac("sha256", SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");

      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: paymentId,
          order_id: orderId,
          status: "captured",
          amount: 1000,
          currency: "INR",
        }),
      } as any);

      vi.mocked(fulfillPaidOrder).mockResolvedValueOnce({
        success: true,
        printJob: {
          id: "job-001",
          tokenNumber: "RP1001",
          status: "WAITING",
          paymentStatus: "PAID",
        } as any,
        alreadyFulfilled: false,
      });

      const req = new Request("http://localhost/api/payment/razorpay/verify", {
        method: "POST",
        body: JSON.stringify({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: validSignature,
        }),
      });

      const res = await verifyPost(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.printJob.tokenNumber).toBe("RP1001");
      expect(fulfillPaidOrder).toHaveBeenCalledWith({
        orderId,
        razorpayPaymentId: paymentId,
        amountPaise: 1000,
        paymentStatus: "captured",
      });

      global.fetch = originalFetch;
    });
  });

  describe("POST /api/payment/razorpay/webhook", () => {
    it("rejects webhook with bad signature with 400", async () => {
      const rawPayload = JSON.stringify({
        event: "payment.captured",
        payload: {},
      });

      const req = new Request("http://localhost/api/payment/razorpay/webhook", {
        method: "POST",
        headers: {
          "x-razorpay-signature": "tampered_signature_123",
        },
        body: rawPayload,
      });

      const res = await webhookPost(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/Invalid webhook signature/);
    });

    it("processes valid payment.captured webhook and fulfills order", async () => {
      const payload = {
        event: "payment.captured",
        payload: {
          payment: {
            entity: {
              id: "pay_wh_123",
              order_id: "order_wh_123",
              amount: 1200,
              status: "captured",
            },
          },
        },
      };

      const rawPayload = JSON.stringify(payload);
      const validSignature = crypto
        .createHmac("sha256", WEBHOOK_SECRET)
        .update(rawPayload)
        .digest("hex");

      vi.mocked(fulfillPaidOrder).mockResolvedValueOnce({
        success: true,
        printJob: { id: "job-wh-01" } as any,
        alreadyFulfilled: false,
      });

      const req = new Request("http://localhost/api/payment/razorpay/webhook", {
        method: "POST",
        headers: {
          "x-razorpay-signature": validSignature,
        },
        body: rawPayload,
      });

      const res = await webhookPost(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe("ok");
      expect(fulfillPaidOrder).toHaveBeenCalledWith({
        orderId: "order_wh_123",
        razorpayPaymentId: "pay_wh_123",
        amountPaise: 1200,
        paymentStatus: "captured",
      });
    });

    it("returns 200 on duplicate webhook when order is already consumed", async () => {
      const payload = {
        event: "payment.captured",
        payload: {
          payment: {
            entity: {
              id: "pay_wh_duplicate",
              order_id: "order_wh_duplicate",
              amount: 1200,
              status: "captured",
            },
          },
        },
      };

      const rawPayload = JSON.stringify(payload);
      const validSignature = crypto
        .createHmac("sha256", WEBHOOK_SECRET)
        .update(rawPayload)
        .digest("hex");

      // Simulate already consumed error
      vi.mocked(fulfillPaidOrder).mockRejectedValueOnce(
        new Error("Cannot fulfill order: order already CONSUMED")
      );

      const req = new Request("http://localhost/api/payment/razorpay/webhook", {
        method: "POST",
        headers: {
          "x-razorpay-signature": validSignature,
        },
        body: rawPayload,
      });

      const res = await webhookPost(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe("ok");
      expect(json.duplicate).toBe(true);
    });
  });
});
