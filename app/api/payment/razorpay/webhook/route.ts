/**
 * POST /api/payment/razorpay/webhook
 * Verifies Razorpay webhook signature against the raw body and fulfills paid orders idempotently.
 */

import { NextResponse } from "next/server";
import crypto from "crypto";
import { fulfillPaidOrder } from "@/lib/firestore/pending-orders";

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
    const signature = req.headers.get("x-razorpay-signature");
    if (!signature) {
      return NextResponse.json(
        { error: "Missing webhook signature header" },
        { status: 400 }
      );
    }

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("[razorpay/webhook] RAZORPAY_WEBHOOK_SECRET is not configured");
      return NextResponse.json(
        { error: "Webhook secret is not configured" },
        { status: 500 }
      );
    }

    const rawBody = await req.text();
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    if (!timingSafeCheck(expectedSignature, signature)) {
      console.warn("[razorpay/webhook] Invalid webhook signature");
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 400 }
      );
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const event = payload?.event;

    if (event === "payment.captured") {
      const payment = payload?.payload?.payment?.entity;
      if (payment?.order_id && payment?.id) {
        await fulfillPaidOrder({
          orderId: payment.order_id,
          razorpayPaymentId: payment.id,
          amountPaise: payment.amount,
          paymentStatus: payment.status,
        });
      }
    } else if (event === "order.paid") {
      const order = payload?.payload?.order?.entity;
      const payment = payload?.payload?.payment?.entity;
      if (order?.id && payment?.id) {
        await fulfillPaidOrder({
          orderId: order.id,
          razorpayPaymentId: payment.id,
          amountPaise: payment.amount,
          paymentStatus: payment.status,
        });
      }
    }

    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[razorpay/webhook] Webhook handling error:", msg);
    // If order already consumed or duplicate, return 200 to acknowledge webhook
    if (msg.includes("already") || msg.includes("CONSUMED")) {
      return NextResponse.json({ status: "ok", duplicate: true }, { status: 200 });
    }
    return NextResponse.json(
      { error: "Webhook processing error", details: msg },
      { status: 500 }
    );
  }
}
