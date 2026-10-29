/**
 * POST /api/print-jobs/draft
 * Validates print job parameters, verifies upload record & active location,
 * calculates price server-side, creates a Razorpay order, and persists a pending order.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { computeAmount } from "@/lib/pricing";
import { getSettings } from "@/lib/firestore/settings";
import { getLocationById } from "@/lib/firestore/locations";
import { getUploadRecord } from "@/lib/firestore/uploads";
import { createPendingOrder } from "@/lib/firestore/pending-orders";
import { ColorMode, PrintType, PaperSize } from "@/lib/firebase/collections";

const draftSchema = z.object({
  uploadId: z.string().min(1),
  copies: z.number().int().min(1).max(50),
  colorMode: z.enum(["BW", "COLOR"]),
  printType: z.enum(["SINGLE", "DOUBLE", "single-sided", "double-sided"]),
  paperSize: z.enum(["A4", "Letter"]).optional().default("A4"),
  locationId: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = draftSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { uploadId, copies, colorMode, printType, paperSize, locationId } =
      parsed.data;

    // 1. Fetch & validate upload record from server-stored uploads
    const upload = await getUploadRecord(uploadId);
    if (!upload) {
      return NextResponse.json(
        { error: "Upload record not found or expired" },
        { status: 404 }
      );
    }

    if (upload.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden: upload record belongs to another user" },
        { status: 403 }
      );
    }

    if (upload.consumed) {
      return NextResponse.json(
        { error: "Upload record has already been consumed by a job" },
        { status: 400 }
      );
    }

    // 2. Validate location exists and is active
    const location = await getLocationById(locationId);
    if (!location || !location.isActive) {
      return NextResponse.json(
        { error: "Selected print location is invalid or currently inactive" },
        { status: 400 }
      );
    }

    // 3. Load pricing settings and compute server-side amount
    const settings = await getSettings();
    const pricingResult = computeAmount({
      pages: upload.pages,
      copies,
      colorMode,
      printType,
      settings,
    });

    const amountPaise = pricingResult.totalPaise;

    // 4. Create Razorpay order
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    let razorpayOrderId: string;

    if (!keyId || !keySecret) {
      // Allow mock order only when PAYMENT_TEST_MODE=1 and NOT in production
      if (
        process.env.PAYMENT_TEST_MODE === "1" &&
        process.env.NODE_ENV !== "production"
      ) {
        razorpayOrderId = `order_mock_${Date.now()}_${Math.random()
          .toString(36)
          .substring(2, 9)}`;
      } else {
        return NextResponse.json(
          { error: "Payment service is not configured" },
          { status: 503 }
        );
      }
    } else {
      const authHeader =
        "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");
      const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({
          amount: amountPaise,
          currency: "INR",
          receipt: `rcpt_${Date.now()}`,
          notes: {
            studentId: session.user.id,
            uploadId,
            locationId,
            fileName: upload.fileName,
          },
        }),
      });

      const rzpData = await rzpRes.json();
      if (!rzpRes.ok) {
        return NextResponse.json(
          { error: rzpData.error?.description || "Razorpay order creation failed" },
          { status: rzpRes.status }
        );
      }
      razorpayOrderId = rzpData.id;
    }

    // 5. Normalize printType for storage
    const normalizedPrintType: PrintType =
      printType === "DOUBLE" || printType === "double-sided"
        ? "DOUBLE"
        : "SINGLE";

    // 6. Persist pending order in Firestore
    await createPendingOrder({
      orderId: razorpayOrderId,
      studentId: session.user.id,
      studentName: session.user.name,
      admissionNumber: session.user.admissionNumber,
      uploadId: upload.id,
      fileName: upload.fileName,
      fileUrl: upload.fileUrl,
      cloudinaryPublicId: upload.cloudinaryPublicId,
      totalPages: upload.pages,
      copies,
      colorMode: colorMode as ColorMode,
      printType: normalizedPrintType,
      paperSize: (paperSize === "Letter" ? "A4" : paperSize) as PaperSize,
      locationId: location.id,
      locationName: location.name,
      amountPaise,
    });

    return NextResponse.json({
      success: true,
      orderId: razorpayOrderId,
      amount: amountPaise,
      amountRupees: amountPaise / 100,
      currency: "INR",
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || keyId,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[print-jobs/draft] Error:", msg);
    return NextResponse.json(
      { error: "Failed to create print job draft", details: msg },
      { status: 500 }
    );
  }
}
