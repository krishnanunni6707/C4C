import { NextResponse } from "next/server";
import { adminJobGuard } from "@/lib/api/admin-job-guard";
import { requireRole } from "@/lib/api/guards";
import { getSignedAssetUrl, destroyAsset } from "@/lib/storage/cloudinary";
import { getUploadRecord } from "@/lib/firestore/uploads";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS, FirestorePrintJob, FirestoreUploadRecord } from "@/lib/firebase/collections";
import { createActivityLog } from "@/lib/firestore/activity-logs";
import { FieldValue } from "firebase-admin/firestore";

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

/**
 * DELETE /api/admin/jobs/[id]/file
 * Allows a SUPER_ADMIN to permanently delete the uploaded file from Cloudinary storage.
 * Retains the print job record, student info, and payment history for auditing and accounting.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  // 1. Super Admin role required
  const guard = await requireRole("SUPER_ADMIN");
  if (!guard.ok) return guard.response;
  const session = guard.session;

  try {
    const jobDoc = await adminDb.collection(COLLECTIONS.PRINT_JOBS).doc(params.id).get();
    if (!jobDoc.exists) {
      return NextResponse.json({ error: "Print job not found." }, { status: 404 });
    }

    const job = { id: jobDoc.id, ...jobDoc.data() } as FirestorePrintJob;

    if (job.fileDeletedAt) {
      return NextResponse.json(
        { error: "File has already been deleted from storage." },
        { status: 400 }
      );
    }

    // 2. Resolve Cloudinary publicId
    let publicId = job.cloudinaryPublicId;
    if (!publicId && job.uploadId) {
      const uploadDoc = await adminDb.collection(COLLECTIONS.UPLOADS).doc(job.uploadId).get();
      if (uploadDoc.exists) {
        publicId = (uploadDoc.data() as FirestoreUploadRecord).cloudinaryPublicId;
      }
    }

    if (!publicId && job.fileUrl) {
      try {
        const url = new URL(job.fileUrl);
        if (url.hostname === "res.cloudinary.com") {
          const match = url.pathname.match(
            /\/raw\/(?:upload|authenticated)\/(?:v\d+\/)?(.+?)(?:\.[a-zA-Z0-9]+)?$/
          );
          if (match) {
            publicId = match[1];
          }
        }
      } catch {
        // Ignore URL parse error
      }
    }

    // 3. Destroy asset in Cloudinary if publicId exists
    if (publicId) {
      await destroyAsset(publicId);
    }

    // 4. Update upload record if linked
    if (job.uploadId) {
      await adminDb.collection(COLLECTIONS.UPLOADS).doc(job.uploadId).update({
        deletedAt: FieldValue.serverTimestamp(),
        deletedBy: session.user.id,
        fileDeleted: true,
      }).catch(() => {});
    }

    // 5. Update print job to mark file deleted
    await jobDoc.ref.update({
      fileDeletedAt: FieldValue.serverTimestamp(),
      fileDeletedBy: session.user.id,
      fileDeletedByName: session.user.name || "Super Admin",
      fileUrl: "",
    });

    // 6. Create audit log
    await createActivityLog({
      adminId: session.user.id,
      action: "FILE_DELETED",
      targetId: params.id,
      details: `Super Admin permanently deleted uploaded file "${job.fileName}" for job token #${job.tokenNumber}`,
    });

    return NextResponse.json({
      success: true,
      message: `File "${job.fileName}" successfully deleted from storage.`,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to delete file from storage";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
