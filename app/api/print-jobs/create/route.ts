/**
 * POST /api/print-jobs/create
 * Creates a new print job in Firestore.
 * priority field removed — no longer used.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createPrintJob, CreatePrintJobInput } from "@/lib/firestore/print-jobs";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized - Please login" },
        { status: 401 }
      );
    }

    let body: Partial<CreatePrintJobInput>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    // Required fields — priority intentionally excluded
    const required: (keyof CreatePrintJobInput)[] = [
      "fileName",
      "fileUrl",
      "totalPages",
      "copies",
      "colorMode",
      "printType",
      "paperSize",
      "amount",
      "paymentMethod",
    ];

    const missing = required.filter(
      (k) => body[k] === undefined || body[k] === null || body[k] === ""
    );

    if (missing.length > 0) {
      return NextResponse.json(
        { error: "Missing required fields", missingFields: missing },
        { status: 400 }
      );
    }

    const printJob = await createPrintJob({
      ...(body as CreatePrintJobInput),
      studentId: session.user.id,
      studentName: session.user.name,
      admissionNumber: session.user.admissionNumber,
    });

    return NextResponse.json({
      success: true,
      printJob: {
        id: printJob.id,
        tokenNumber: printJob.tokenNumber,
        status: printJob.status,
        paymentStatus: printJob.paymentStatus,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Print job creation error:", msg);
    return NextResponse.json(
      { error: "Failed to create print job", details: msg },
      { status: 500 }
    );
  }
}
