/**
 * POST /api/payment/verify
 * Verifies a Razorpay payment signature, then creates the print job in Firestore.
 * Migrated from Prisma → Firestore.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createPrintJob } from "@/lib/firestore/print-jobs";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      printData,
    } = await req.json();

    // Verify Razorpay signature
    const sign = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(sign)
      .digest("hex");

    if (razorpay_signature !== expectedSign) {
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
    }

    const printJob = await createPrintJob({
      studentId: session.user.id,
      studentName: session.user.name,
      admissionNumber: session.user.admissionNumber,
      fileName: printData.fileName,
      fileUrl: printData.fileUrl ?? "",
      totalPages: printData.totalPages,
      copies: printData.copies,
      colorMode: printData.colorMode,
      printType: printData.printType,
      paperSize: printData.paperSize ?? "A4",
      amount: printData.amount,
      paymentMethod: "QR",
    });

    return NextResponse.json({
      success: true,
      printJob: {
        id: printJob.id,
        tokenNumber: printJob.tokenNumber,
        status: printJob.status,
      },
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    return NextResponse.json(
      { error: "Payment verification failed" },
      { status: 500 }
    );
  }
}
