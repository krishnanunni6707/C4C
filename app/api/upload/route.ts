/**
 * POST /api/upload
 * Uploads file to Cloudinary and returns fileName, fileUrl, pages, fileSize.
 *
 * TROUBLESHOOTING:
 * If you see "Upload error: cloud_name mismatch":
 *   1. Go to https://cloudinary.com/console
 *   2. Copy the Cloud Name from the top of the dashboard (it's case-sensitive, usually all lowercase)
 *   3. Update NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME in .env.local
 *   4. Restart the dev server
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { v2 as cloudinary } from "cloudinary";


// ── Extract a readable message from any error shape ───────────────────────────
function extractErrorMessage(error: unknown): string {
  if (!error) return "Unknown error";
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (typeof error === "object") {
    const e = error as Record<string, unknown>;
    // Cloudinary SDK wraps errors as { error: { message, http_code } }
    if (e.error && typeof e.error === "object") {
      const inner = e.error as Record<string, unknown>;
      return `Cloudinary ${inner.http_code ?? ""}: ${inner.message ?? JSON.stringify(inner)}`;
    }
    if (typeof e.message === "string") return e.message;
    return JSON.stringify(error);
  }
  return String(error);
}

/** Rough page count estimation by file type + size */
function estimatePages(fileSize: number, fileType: string): number {
  if (fileType === "pdf")  return Math.max(1, Math.ceil(fileSize / 51200));
  if (fileType === "docx") return Math.max(1, Math.ceil(fileSize / 30720));
  if (fileType === "pptx") return Math.max(1, Math.ceil(fileSize / 102400));
  return 1;
}

export async function POST(req: Request) {
  // ── Validate env vars before doing anything ────────────────────────────────
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey    = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    const missing = [
      !cloudName && "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME",
      !apiKey    && "CLOUDINARY_API_KEY",
      !apiSecret && "CLOUDINARY_API_SECRET",
    ].filter(Boolean);
    console.error("Upload route: missing Cloudinary env vars:", missing.join(", "));
    return NextResponse.json(
      { error: `Server misconfiguration: missing env vars: ${missing.join(", ")}` },
      { status: 500 }
    );
  }

  // Log which cloud name is being used (helps diagnose mismatch)
  console.log(`[upload] Using Cloudinary cloud_name="${cloudName}"`);

  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const fileType = file.name.split(".").pop()?.toLowerCase() ?? "";
    const allowedTypes = ["pdf", "docx", "pptx"];
    if (!allowedTypes.includes(fileType)) {
      return NextResponse.json(
        { error: "Only PDF, DOCX, and PPTX files are allowed" },
        { status: 400 }
      );
    }

    console.log(`[upload] Uploading "${file.name}" (${(file.size / 1024).toFixed(1)} KB) for user ${session.user.id}`);

    // Convert to buffer → base64 → data URI for Cloudinary
    const bytes  = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64  = buffer.toString("base64");
    const dataUri = `data:application/octet-stream;base64,${base64}`;

    const uploadResult = await cloudinary.uploader.upload(dataUri, {
      folder: `campus-printing/${session.user.id}`,
      public_id: `${Date.now()}-${file.name.replace(/\.[^/.]+$/, "").replace(/\s+/g, "_")}`,
      resource_type: "raw",
      use_filename: true,
      unique_filename: true,
    });

    console.log(`[upload] Success — secure_url: ${uploadResult.secure_url}`);

    const estimatedPages = estimatePages(file.size, fileType);

    return NextResponse.json({
      success: true,
      fileName: file.name,
      fileUrl: uploadResult.secure_url,
      fileSize: file.size,
      pages: estimatedPages,
    });

  } catch (error: unknown) {
    const msg = extractErrorMessage(error);
    console.error("[upload] Error:", msg);
    if (error && typeof error === "object") {
      console.error("[upload] Full error:", JSON.stringify(error, null, 2));
    }
    return NextResponse.json(
      { error: "Upload failed", details: msg },
      { status: 500 }
    );
  }
}
