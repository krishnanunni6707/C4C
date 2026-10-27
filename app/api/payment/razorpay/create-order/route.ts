/**
 * POST /api/payment/razorpay/create-order
 * Creates a Razorpay Order ID for standard checkout.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized - Please login" },
        { status: 401 }
      );
    }

    const { amount, notes } = await req.json();

    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid payment amount" },
        { status: 400 }
      );
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      console.error("[razorpay/create-order] RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is not set");
      return NextResponse.json(
        { error: "Payment service is not configured" },
        { status: 503 }
      );
    }

    const authHeader = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100), // amount in paise
        currency: "INR",
        receipt: `rcpt_${Date.now()}`,
        notes: notes || {},
      }),
    });

    const rzpData = await rzpRes.json();
    if (!rzpRes.ok) {
      return NextResponse.json(
        { error: rzpData.error?.description || "Razorpay API error" },
        { status: rzpRes.status }
      );
    }

    return NextResponse.json({
      success: true,
      orderId: rzpData.id,
      amount: rzpData.amount,
      currency: rzpData.currency,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Razorpay order creation error:", msg);
    return NextResponse.json(
      { error: "Failed to create Razorpay order", details: msg },
      { status: 500 }
    );
  }
}
