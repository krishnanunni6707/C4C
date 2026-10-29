import { NextResponse } from "next/server";
import crypto from "crypto";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS, FirestorePrintJob, FirestoreUploadRecord } from "@/lib/firebase/collections";
import { getSettings } from "@/lib/firestore/settings";
import { destroyAsset } from "@/lib/storage/cloudinary";
import { logger } from "@/lib/logger";

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

    // 3. Purge notifications older than notificationRetentionDays (default 30 days) (P-07)
    const notifRetentionDays = settings.notificationRetentionDays ?? 30;
    const notifCutoffMs = Date.now() - notifRetentionDays * 24 * 60 * 60 * 1000;
    const notifCutoffTimestamp = Timestamp.fromMillis(notifCutoffMs);

    const oldNotifsSnapshot = await adminDb
      .collection(COLLECTIONS.NOTIFICATIONS)
      .where("createdAt", "<=", notifCutoffTimestamp)
      .limit(500)
      .get();

    let purgedNotifications = 0;
    if (!oldNotifsSnapshot.empty) {
      const batch = adminDb.batch();
      oldNotifsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      purgedNotifications = oldNotifsSnapshot.size;
    }

    // 4. Anonymise print job records older than jobRetentionDays (default 365 days / 1 year) (P-07)
    const jobRetentionDays = settings.jobRetentionDays ?? 365;
    const jobCutoffMs = Date.now() - jobRetentionDays * 24 * 60 * 60 * 1000;
    const jobCutoffTimestamp = Timestamp.fromMillis(jobCutoffMs);

    const oldJobsToAnonymize = await adminDb
      .collection(COLLECTIONS.PRINT_JOBS)
      .where("createdAt", "<=", jobCutoffTimestamp)
      .limit(500)
      .get();

    let anonymizedJobs = 0;
    for (const doc of oldJobsToAnonymize.docs) {
      const jobData = doc.data() as FirestorePrintJob;
      if (jobData.studentName !== "Anonymized Student" || (jobData as any).anonymized !== true) {
        let publicId = jobData.cloudinaryPublicId;
        if (!publicId && jobData.uploadId) {
          const uploadDoc = await adminDb
            .collection(COLLECTIONS.UPLOADS)
            .doc(jobData.uploadId)
            .get();
          if (uploadDoc.exists) {
            publicId = (uploadDoc.data() as FirestoreUploadRecord).cloudinaryPublicId;
          }
        }
        if (publicId) {
          await destroyAsset(publicId);
        }

        await doc.ref.update({
          studentName: "Anonymized Student",
          admissionNumber: "ANONYMIZED",
          fileName: "anonymized.pdf",
          fileUrl: "",
          cloudinaryPublicId: FieldValue.delete(),
          uploadId: FieldValue.delete(),
          razorpayOrderId: FieldValue.delete(),
          razorpayPaymentId: FieldValue.delete(),
          fileDeletedAt: FieldValue.serverTimestamp(),
          anonymized: true,
          anonymizedAt: FieldValue.serverTimestamp(),
        });
        anonymizedJobs++;
      }
    }

    return NextResponse.json({
      success: true,
      retentionDays,
      purgedJobs,
      purgedUploads,
      purgedNotifications,
      anonymizedJobs,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Cleanup failed";
    logger.error("[cron/cleanup] Error running retention cleanup:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
