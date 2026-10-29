import { NextResponse } from "next/server";
import { adminJobGuard } from "@/lib/api/admin-job-guard";
import { getSignedAssetUrl } from "@/lib/storage/cloudinary";
import { getUploadRecord } from "@/lib/firestore/uploads";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const guard = await adminJobGuard(params.id);
  if (!guard.ok) return guard.response;

  const job = guard.job;

  if (job.fileDeletedAt) {
    return NextResponse.json(
      { error: "Print file has been deleted per retention policy." },
      { status: 410 }
    );
  }

  // 1. Resolve Cloudinary publicId
  let publicId = job.cloudinaryPublicId;
  if (!publicId && job.uploadId) {
    const upload = await getUploadRecord(job.uploadId);
    if (upload?.cloudinaryPublicId) {
      publicId = upload.cloudinaryPublicId;
    }
  }

  // Fallback: parse publicId from legacy Cloudinary fileUrl if present
  if (!publicId && job.fileUrl) {
    try {
      const url = new URL(job.fileUrl);
      if (url.hostname === "res.cloudinary.com") {
        // Match /<cloudName>/raw/(upload|authenticated)/(v\d+/)?(campus-printing/...)
        const match = url.pathname.match(
          /\/raw\/(?:upload|authenticated)\/(?:v\d+\/)?(.+?)(?:\.[a-zA-Z0-9]+)?$/
        );
        if (match) {
          publicId = match[1];
        }
      }
    } catch {
      // Invalid URL
    }
  }

  if (!publicId) {
    return NextResponse.json(
      { error: "File asset identifier not found for this job." },
      { status: 404 }
    );
  }

  try {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    if (!cloudName) {
      return NextResponse.json(
        { error: "Cloudinary cloud name is not configured." },
        { status: 500 }
      );
    }

    // 2. Generate short-lived signed delivery URL (5 minutes)
    const signedUrl = getSignedAssetUrl(publicId, 5);

    // 3. Strict SSRF host & cloud name validation
    const parsed = new URL(signedUrl);
    if (parsed.protocol !== "https:") {
      return NextResponse.json(
        { error: "Security violation: Invalid storage protocol." },
        { status: 502 }
      );
    }

    if (parsed.hostname !== "res.cloudinary.com") {
      return NextResponse.json(
        { error: "Security violation: Invalid storage host." },
        { status: 502 }
      );
    }

    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments[0] !== cloudName) {
      return NextResponse.json(
        { error: "Security violation: Storage cloud name mismatch." },
        { status: 502 }
      );
    }

    // 4. Fetch the signed asset securely
    const fileRes = await fetch(signedUrl, { cache: "no-store" });
    if (!fileRes.ok) {
      return NextResponse.json(
        { error: `Could not fetch file from storage: HTTP ${fileRes.status}` },
        { status: 502 }
      );
    }

    const contentType = fileRes.headers.get("content-type") || "application/pdf";
    const safeFileName = (job.fileName || "document.pdf").replace(/["\r\n\\]/g, "_");

    // 5. Return binary response with Cache-Control: no-store and Content-Disposition
    const arrayBuf = await fileRes.arrayBuffer();

    return new NextResponse(arrayBuf, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${safeFileName}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load print file." },
      { status: 500 }
    );
  }
}
