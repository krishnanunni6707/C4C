/**
 * /api/admin/students/[id]
 * GET: Returns student profile + job stats (total jobs, total amount spent).
 * DELETE: Erases all student data upon request (SUPER_ADMIN only, audited) (P-07).
 */

import { NextResponse } from "next/server";
import { requireAdmin, requireRole } from "@/lib/api/guards";
import { getUserById } from "@/lib/firestore/users";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS, FirestorePrintJob, FirestoreUploadRecord } from "@/lib/firebase/collections";
import { createActivityLog } from "@/lib/firestore/activity-logs";
import { destroyAsset } from "@/lib/storage/cloudinary";
import { toPublicUser } from "@/lib/mappers";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const guard = await requireAdmin(true);
  if (!guard.ok) return guard.response;
  const session = guard.session;

  try {
    const user = await getUserById(params.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Admins can only view Student accounts
    if (session.user.role === "ADMIN" && user.role !== "STUDENT") {
      return NextResponse.json(
        { error: "Forbidden: Admins can only view student profiles" },
        { status: 403 }
      );
    }

    // Get job stats from printJobs collection
    const jobsSnap = await adminDb
      .collection(COLLECTIONS.PRINT_JOBS)
      .where("studentId", "==", params.id)
      .get();

    const totalJobs = jobsSnap.size;
    const totalAmountSpent = jobsSnap.docs
      .filter((d) => d.data().paymentStatus === "PAID")
      .reduce((sum, d) => sum + (d.data().amount ?? 0), 0);

    const safeUser = toPublicUser(user);

    return NextResponse.json({
      user: safeUser,
      stats: { totalJobs, totalAmountSpent },
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  // Only SUPER_ADMIN can execute personal data erasure requests
  const guard = await requireRole("SUPER_ADMIN");
  if (!guard.ok) return guard.response;
  const session = guard.session;

  try {
    const user = await getUserById(params.id);
    if (!user) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    if (user.role !== "STUDENT") {
      return NextResponse.json(
        { error: "Only student data may be erased through this endpoint" },
        { status: 400 }
      );
    }

    // 1. Delete and destroy all Cloudinary assets and print jobs for this student
    const jobsSnap = await adminDb
      .collection(COLLECTIONS.PRINT_JOBS)
      .where("studentId", "==", params.id)
      .get();

    for (const doc of jobsSnap.docs) {
      const job = doc.data() as FirestorePrintJob;
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
      await doc.ref.delete();
    }

    // 2. Delete all uploads belonging to this student
    const uploadsSnap = await adminDb
      .collection(COLLECTIONS.UPLOADS)
      .where("ownerId", "==", params.id)
      .get();

    for (const doc of uploadsSnap.docs) {
      const upload = doc.data() as FirestoreUploadRecord;
      if (upload.cloudinaryPublicId) {
        await destroyAsset(upload.cloudinaryPublicId);
      }
      await doc.ref.delete();
    }

    // 3. Delete all student-targeted notifications
    const notifsSnap = await adminDb
      .collection(COLLECTIONS.NOTIFICATIONS)
      .where("studentId", "==", params.id)
      .get();

    for (const doc of notifsSnap.docs) {
      await doc.ref.delete();
    }

    // 4. Delete pending orders
    const ordersSnap = await adminDb
      .collection(COLLECTIONS.PENDING_ORDERS)
      .where("studentId", "==", params.id)
      .get();

    for (const doc of ordersSnap.docs) {
      await doc.ref.delete();
    }

    // 5. Delete student user record
    await adminDb.collection(COLLECTIONS.USERS).doc(params.id).delete();

    // 6. Audit log the erasure
    await createActivityLog({
      adminId: session.user.id,
      action: "STUDENT_DATA_ERASURE",
      targetId: params.id,
      details: `Permanently erased all personal data, files, and jobs for student ${user.admissionNumber} (${user.name}) on request.`,
    });

    return NextResponse.json({
      success: true,
      message: "Student data erased successfully.",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to erase student data";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
