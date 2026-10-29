/**
 * POST /api/payment/razorpay/verify
 * Verifies Razorpay HMAC signature, validates payment state via Razorpay API,
 * ensures order ownership & amount match, and atomically creates the paid print job.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import crypto from "crypto";
import { authOptions } from "@/lib/auth";
import {
  getPendingOrder,
  fulfillPaidOrder,
} from "@/lib/firestore/pending-orders";

function timingSafeCheck(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, "utf8");
    const bufB = Buffer.from(b, "utf8");
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: {
      razorpay_order_id?: string;
      razorpay_payment_id?: string;
      razorpay_signature?: string;
    };

    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: "Missing required payment fields" },
        { status: 400 }
      );
    }

    // 1. Fetch pending order from Firestore
    const pendingOrder = await getPendingOrder(razorpay_order_id);
    if (!pendingOrder) {
      return NextResponse.json(
        { error: "Pending order not found or expired" },
        { status: 404 }
      );
    }

    // 2. Verify order belongs to the authenticated student
    if (pendingOrder.studentId !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden: order belongs to another student" },
        { status: 403 }
      );
    }

    const isMock = razorpay_payment_id.startsWith("pay_rzp_mock_");

    // 3. Handle mock payments vs live Razorpay payments
    if (isMock) {
      if (
        process.env.NODE_ENV === "production" ||
        process.env.PAYMENT_TEST_MODE !== "1"
      ) {
        return NextResponse.json(
          { error: "Mock payments are forbidden" },
          { status: 400 }
        );
      }

      // Fulfill mock in non-prod test mode
      const result = await fulfillPaidOrder({
        orderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        amountPaise: pendingOrder.amountPaise,
        paymentStatus: "captured",
      });

      return NextResponse.json({
        success: true,
        printJob: {
          id: result.printJob.id,
          tokenNumber: result.printJob.tokenNumber,
          status: result.printJob.status,
          paymentStatus: result.printJob.paymentStatus,
        },
      });
    }

    // 4. Live Razorpay validation
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret || !keyId) {
      return NextResponse.json(
        { error: "Payment service is not configured" },
        { status: 503 }
      );
    }

    // Verify HMAC SHA256 signature
    const generatedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (!timingSafeCheck(generatedSignature, razorpay_signature)) {
      return NextResponse.json(
        { error: "Invalid payment signature" },
        { status: 400 }
      );
    }

    // 5. Fetch payment from Razorpay API
    const authHeader =
      "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");

    const rzpRes = await fetch(
      `https://api.razorpay.com/v1/payments/${encodeURIComponent(razorpay_payment_id)}`,
      {
        method: "GET",
        headers: {
          Authorization: authHeader,
        },
      }
    );

    if (!rzpRes.ok) {
      const errData = await rzpRes.json().catch(() => ({}));
      return NextResponse.json(
        {
          error:
            errData.error?.description || "Failed to fetch payment details from gateway",
        },
        { status: 400 }
      );
    }

    const payment = await rzpRes.json();

    // If status is 'authorized', attempt capture
    let finalStatus = payment.status;
    if (finalStatus === "authorized") {
      const captureRes = await fetch(
        `https://api.razorpay.com/v1/payments/${encodeURIComponent(razorpay_payment_id)}/capture`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
          },
          body: JSON.stringify({
            amount: pendingOrder.amountPaise,
            currency: "INR",
          }),
        }
      );
      if (captureRes.ok) {
        const captured = await captureRes.json();
        finalStatus = captured.status;
      }
    }

    if (finalStatus !== "captured") {
      return NextResponse.json(
        { error: `Payment not captured (status: ${finalStatus})` },
        { status: 400 }
      );
    }

    // Verify payment fields
    if (payment.order_id !== razorpay_order_id) {
      return NextResponse.json(
        { error: "Payment order ID mismatch" },
        { status: 400 }
      );
    }

    if (payment.amount !== pendingOrder.amountPaise) {
      return NextResponse.json(
        {
          error: `Payment amount mismatch: expected ${pendingOrder.amountPaise}, got ${payment.amount}`,
        },
        { status: 400 }
      );
    }

    if (payment.currency !== "INR") {
      return NextResponse.json(
        { error: "Invalid payment currency: INR required" },
        { status: 400 }
      );
    }

    // 6. Atomically fulfill order in Firestore
    const result = await fulfillPaidOrder({
      orderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      amountPaise: payment.amount,
      paymentStatus: finalStatus,
    });

    return NextResponse.json({
      success: true,
      printJob: {
        id: result.printJob.id,
        tokenNumber: result.printJob.tokenNumber,
        status: result.printJob.status,
        paymentStatus: result.printJob.paymentStatus,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[razorpay/verify] Verification error:", msg);
    return NextResponse.json(
      { error: "Payment verification failed", details: msg },
      { status: 500 }
    );
  }
}
