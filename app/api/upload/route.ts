/**
 * POST /api/upload
 * Validates magic bytes, enforces size and page limits, counts PDF pages with pdf-lib,
 * uploads to Cloudinary via upload_stream, and persists the upload record in Firestore.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import path from "path";
import { authOptions } from "@/lib/auth";
import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import { PDFDocument } from "pdf-lib";
import { createUploadRecord } from "@/lib/firestore/uploads";
import { getSettings } from "@/lib/firestore/settings";

function validateMagicBytes(buffer: Buffer, extension: string): boolean {
  if (buffer.length < 4) return false;

  switch (extension) {
    case "pdf":
      // %PDF- (0x25, 0x50, 0x44, 0x46)
      return (
        buffer[0] === 0x25 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x44 &&
        buffer[3] === 0x46
      );
    case "png":
      // 0x89, 0x50, 0x4E, 0x47
      return (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47
      );
    case "jpg":
    case "jpeg":
      // 0xFF, 0xD8, 0xFF
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    default:
      return false;
  }
}

export function sanitizeFileName(rawName: string): string {
  const base = path.basename(rawName).trim();
  const sanitized = base
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .substring(0, 100);
  return sanitized || "document.pdf";
}

export async function POST(req: Request) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      { error: "Server misconfiguration: Cloudinary service is not configured" },
      { status: 500 }
    );
  }

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

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

    // Guidance for Office documents
    if (["docx", "doc", "pptx"].includes(ext)) {
      return NextResponse.json(
        {
          error:
            "Office documents (.docx, .doc, .pptx) are not accepted. Please save or export your document as a PDF before uploading.",
        },
        { status: 400 }
      );
    }

    const allowedTypes = ["pdf", "png", "jpg", "jpeg"];
    if (!allowedTypes.includes(ext)) {
      return NextResponse.json(
        { error: "Only PDF, PNG, and JPEG files are allowed" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 1. Magic bytes validation against extension
    if (!validateMagicBytes(buffer, ext)) {
      return NextResponse.json(
        { error: `File content does not match expected format for .${ext}` },
        { status: 400 }
      );
    }

    // 2. Size validation
    const settings = await getSettings();
    const maxFileSizeMB = settings.maxFileSizeMB || 15;
    const maxFileSizeBytes = maxFileSizeMB * 1024 * 1024;

    if (buffer.length > maxFileSizeBytes) {
      return NextResponse.json(
        {
          error: `File size (${(buffer.length / (1024 * 1024)).toFixed(1)} MB) exceeds maximum allowed limit of ${maxFileSizeMB} MB`,
        },
        { status: 400 }
      );
    }

    // 3. Page count & corruption/encryption check
    let pages = 1;
    if (ext === "pdf") {
      let pdfDoc: PDFDocument;
      try {
        pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: false });
        if (pdfDoc.isEncrypted) {
          return NextResponse.json(
            { error: "Encrypted or password-protected PDFs are not supported" },
            { status: 400 }
          );
        }
        pages = pdfDoc.getPageCount();
      } catch (loadErr: unknown) {
        const msg = loadErr instanceof Error ? loadErr.message : String(loadErr);
        if (
          msg.toLowerCase().includes("encrypt") ||
          msg.toLowerCase().includes("password")
        ) {
          return NextResponse.json(
            { error: "Encrypted or password-protected PDFs are not supported" },
            { status: 400 }
          );
        }
        return NextResponse.json(
          { error: "Corrupted or unreadable PDF file" },
          { status: 400 }
        );
      }

      if (pages <= 0) {
        return NextResponse.json(
          { error: "PDF contains no pages" },
          { status: 400 }
        );
      }

      const maxPages = settings.maxPagesPerJob || 200;
      if (pages > maxPages) {
        return NextResponse.json(
          {
            error: `Document has ${pages} pages, which exceeds the maximum limit of ${maxPages} pages`,
          },
          { status: 400 }
        );
      }
    }

    // 4. Sanitize file name and create public_id
    const sanitizedFileName = sanitizeFileName(file.name);
    const publicId = `${Date.now()}-${sanitizedFileName.replace(/\.[^/.]+$/, "")}`;

    // 5. Upload via upload_stream with type: "authenticated" (not public)
    const uploadResult = await new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `campus-printing/${session.user.id}`,
          public_id: publicId,
          resource_type: "raw",
          type: "authenticated",
          use_filename: false,
          unique_filename: true,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result!);
        }
      );
      uploadStream.end(buffer);
    });

    // 6. Create upload record in Firestore (store only publicId, do not store public delivery URL)
    const uploadRecord = await createUploadRecord({
      ownerId: session.user.id,
      cloudinaryPublicId: uploadResult.public_id,
      fileName: sanitizedFileName,
      pages,
      size: buffer.length,
      mime: file.type || (ext === "pdf" ? "application/pdf" : `image/${ext}`),
    });

    return NextResponse.json({
      success: true,
      uploadId: uploadRecord.id,
      fileName: sanitizedFileName,
      publicId: uploadResult.public_id,
      fileSize: buffer.length,
      pages,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: "Upload processing failed", details: msg },
      { status: 500 }
    );
  }
}
