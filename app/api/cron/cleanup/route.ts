import { NextResponse } from "next/server";
import crypto from "crypto";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS, FirestorePrintJob, FirestoreUploadRecord } from "@/lib/firebase/collections";
import { getSettings } from "@/lib/firestore/settings";
import { destroyAsset } from "@/lib/storage/cloudinary";

export const dynamic = "force-dynamic";

function isAuthorized(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;

  const authHeader = req.headers.get("authorization");
  const xSecret = req.headers.get("x-cron-secret");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : xSecret?.trim();

  if (!token) return false;

  const bufProvided = Buffer.from(token);
  const bufExpected = Buffer.from(cronSecret);

  if (bufProvided.length !== bufExpected.length) return false;
  return crypto.timingSafeEqual(bufProvided, bufExpected);
}

export async function POST(req: Request) {
  return handleCleanup(req);
}

export async function GET(req: Request) {
  return handleCleanup(req);
}

async function handleCleanup(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const settings = await getSettings();
    const retentionDays = settings.fileRetentionDays ?? 7;
    const cutoffMs = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    const cutoffTimestamp = Timestamp.fromMillis(cutoffMs);

    // 1. Purge assets from print jobs older than retentionDays that have not been marked fileDeletedAt
    const oldJobsSnapshot = await adminDb
      .collection(COLLECTIONS.PRINT_JOBS)
      .where("createdAt", "<=", cutoffTimestamp)
      .get();

    let purgedJobs = 0;
    for (const doc of oldJobsSnapshot.docs) {
      const job = { id: doc.id, ...doc.data() } as FirestorePrintJob;
      if (job.fileDeletedAt) continue;

      let publicId = job.cloudinaryPublicId;
      if (!publicId && job.uploadId) {
        const uploadDoc = await adminDb
          .collection(COLLECTIONS.UPLOADS)
          .doc(job.uploadId)
          .get();
        if (uploadDoc.exists) {
          publicId = (uploadDoc.data() as FirestoreUploadRecord).cloudinaryPublicId;
        }
      }

      if (publicId) {
        await destroyAsset(publicId);
      }

      await doc.ref.update({
        fileDeletedAt: FieldValue.serverTimestamp(),
      });
      purgedJobs++;
    }

    // 2. Purge unconsumed uploads older than 24 hours
    const uploadCutoffMs = Date.now() - 24 * 60 * 60 * 1000;
    const uploadCutoffTimestamp = Timestamp.fromMillis(uploadCutoffMs);

    const expiredUploadsSnapshot = await adminDb
      .collection(COLLECTIONS.UPLOADS)
      .where("consumed", "==", false)
      .where("createdAt", "<=", uploadCutoffTimestamp)
      .get();

    let purgedUploads = 0;
    for (const doc of expiredUploadsSnapshot.docs) {
      const upload = { id: doc.id, ...doc.data() } as FirestoreUploadRecord;
      if (upload.cloudinaryPublicId) {
        await destroyAsset(upload.cloudinaryPublicId);
      }
      await doc.ref.update({
        consumed: true,
        expired: true,
        deletedAt: FieldValue.serverTimestamp(),
      });
      purgedUploads++;
    }

    return NextResponse.json({
      success: true,
      retentionDays,
      purgedJobs,
      purgedUploads,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Cleanup failed";
    console.error("[cron/cleanup] Error running retention cleanup:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
