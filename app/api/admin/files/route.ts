import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/guards";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS, FirestorePrintJob, FirestoreUploadRecord } from "@/lib/firebase/collections";
import { destroyAsset } from "@/lib/storage/cloudinary";
import { createActivityLog } from "@/lib/firestore/activity-logs";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/files
 * Super Admin endpoint to inspect user uploaded files and storage statistics.
 */
export async function GET() {
  const guard = await requireRole("SUPER_ADMIN");
  if (!guard.ok) return guard.response;

  try {
    const jobsSnapshot = await adminDb
      .collection(COLLECTIONS.PRINT_JOBS)
      .orderBy("createdAt", "desc")
      .limit(200)
      .get();

    const files = jobsSnapshot.docs.map((doc) => {
      const data = doc.data() as FirestorePrintJob;
      const createdAtDate = data.createdAt?.toDate ? data.createdAt.toDate() : null;
      const fileDeletedAtDate = data.fileDeletedAt?.toDate ? data.fileDeletedAt.toDate() : null;

      return {
        id: doc.id,
        tokenNumber: data.tokenNumber || "N/A",
        fileName: data.fileName || "document.pdf",
        totalPages: data.totalPages || 1,
        copies: data.copies || 1,
        amount: data.amount || 0,
        colorMode: data.colorMode || "BW",
        studentName: data.studentName || "Student",
        admissionNumber: data.admissionNumber || "N/A",
        status: data.status || "WAITING",
        createdAt: createdAtDate ? createdAtDate.toISOString() : null,
        fileDeleted: !!data.fileDeletedAt,
        fileDeletedAt: fileDeletedAtDate ? fileDeletedAtDate.toISOString() : null,
        fileDeletedByName: (data as any).fileDeletedByName || null,
      };
    });

    const totalUploads = files.length;
    const activeInStorage = files.filter((f) => !f.fileDeleted).length;
    const deletedFiles = files.filter((f) => f.fileDeleted).length;

    return NextResponse.json({
      files,
      stats: {
        totalUploads,
        activeInStorage,
        deletedFiles,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch files";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * POST /api/admin/files
 * Super Admin endpoint to purge uploaded files in bulk or individually.
 */
export async function POST(req: Request) {
  const guard = await requireRole("SUPER_ADMIN");
  if (!guard.ok) return guard.response;
  const session = guard.session;

  try {
    const body = await req.json().catch(() => ({}));
    const { action, jobId } = body;

    if (!action || !["purge_all", "purge_completed", "delete_job"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Allowed: 'purge_all', 'purge_completed', 'delete_job'" },
        { status: 400 }
      );
    }

    // 1. Single job file deletion
    if (action === "delete_job") {
      if (!jobId) {
        return NextResponse.json({ error: "jobId is required for delete_job" }, { status: 400 });
      }

      const jobDoc = await adminDb.collection(COLLECTIONS.PRINT_JOBS).doc(jobId).get();
      if (!jobDoc.exists) {
        return NextResponse.json({ error: "Print job not found" }, { status: 404 });
      }

      const job = jobDoc.data() as FirestorePrintJob;
      if (job.fileDeletedAt) {
        return NextResponse.json({ error: "File has already been deleted" }, { status: 400 });
      }

      let publicId = job.cloudinaryPublicId;
      if (!publicId && job.uploadId) {
        const uploadDoc = await adminDb.collection(COLLECTIONS.UPLOADS).doc(job.uploadId).get();
        if (uploadDoc.exists) {
          publicId = (uploadDoc.data() as FirestoreUploadRecord).cloudinaryPublicId;
        }
      }

      if (publicId) {
        await destroyAsset(publicId);
      }

      await jobDoc.ref.update({
        fileDeletedAt: FieldValue.serverTimestamp(),
        fileDeletedBy: session.user.id,
        fileDeletedByName: session.user.name || "Super Admin",
        fileUrl: "",
      });

      await createActivityLog({
        adminId: session.user.id,
        action: "FILE_DELETED",
        targetId: jobId,
        details: `Super Admin deleted uploaded file "${job.fileName}" for job token #${job.tokenNumber}`,
      });

      return NextResponse.json({
        success: true,
        message: `File "${job.fileName}" deleted from storage.`,
      });
    }

    // 2. Purge completed/terminal jobs
    if (action === "purge_completed") {
      const snap = await adminDb
        .collection(COLLECTIONS.PRINT_JOBS)
        .where("status", "in", ["COLLECTED", "CANCELLED", "READY"])
        .get();

      let purgedCount = 0;
      for (const doc of snap.docs) {
        const job = doc.data() as FirestorePrintJob;
        if (job.fileDeletedAt) continue;

        let publicId = job.cloudinaryPublicId;
        if (!publicId && job.uploadId) {
          const uploadDoc = await adminDb.collection(COLLECTIONS.UPLOADS).doc(job.uploadId).get();
          if (uploadDoc.exists) {
            publicId = (uploadDoc.data() as FirestoreUploadRecord).cloudinaryPublicId;
          }
        }

        if (publicId) {
          await destroyAsset(publicId);
        }

        await doc.ref.update({
          fileDeletedAt: FieldValue.serverTimestamp(),
          fileDeletedBy: session.user.id,
          fileDeletedByName: session.user.name || "Super Admin",
          fileUrl: "",
        });
        purgedCount++;
      }

      await createActivityLog({
        adminId: session.user.id,
        action: "FILES_BULK_PURGED",
        targetId: "completed_jobs",
        details: `Super Admin purged files for ${purgedCount} completed/cancelled jobs.`,
      });

      return NextResponse.json({
        success: true,
        purgedCount,
        message: `Successfully purged files for ${purgedCount} completed or cancelled print jobs.`,
      });
    }

    // 3. Purge all uploaded files
    if (action === "purge_all") {
      const snap = await adminDb.collection(COLLECTIONS.PRINT_JOBS).get();

      let purgedCount = 0;
      for (const doc of snap.docs) {
        const job = doc.data() as FirestorePrintJob;
        if (job.fileDeletedAt) continue;

        let publicId = job.cloudinaryPublicId;
        if (!publicId && job.uploadId) {
          const uploadDoc = await adminDb.collection(COLLECTIONS.UPLOADS).doc(job.uploadId).get();
          if (uploadDoc.exists) {
            publicId = (uploadDoc.data() as FirestoreUploadRecord).cloudinaryPublicId;
          }
        }

        if (publicId) {
          await destroyAsset(publicId);
        }

        await doc.ref.update({
          fileDeletedAt: FieldValue.serverTimestamp(),
          fileDeletedBy: session.user.id,
          fileDeletedByName: session.user.name || "Super Admin",
          fileUrl: "",
        });
        purgedCount++;
      }

      // Also purge any unconsumed uploads
      const uploadsSnap = await adminDb
        .collection(COLLECTIONS.UPLOADS)
        .where("consumed", "==", false)
        .get();

      for (const uDoc of uploadsSnap.docs) {
        const u = uDoc.data() as FirestoreUploadRecord;
        if (u.cloudinaryPublicId) {
          await destroyAsset(u.cloudinaryPublicId);
        }
        await uDoc.ref.update({
          consumed: true,
          deletedAt: FieldValue.serverTimestamp(),
          deletedBy: session.user.id,
        });
      }

      await createActivityLog({
        adminId: session.user.id,
        action: "FILES_BULK_PURGED",
        targetId: "all_uploads",
        details: `Super Admin executed full file storage purge for ${purgedCount} jobs.`,
      });

      return NextResponse.json({
        success: true,
        purgedCount,
        message: `Successfully purged all ${purgedCount} uploaded files from storage.`,
      });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Bulk purge failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
