import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/guards";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { createActivityLog } from "@/lib/firestore/activity-logs";
import { destroyAsset } from "@/lib/storage/cloudinary";
import { FieldValue } from "firebase-admin/firestore";
import bcrypt from "bcryptjs";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  target: z.enum(["printJobs", "notifications", "students", "uploadedFiles", "all"]),
  password: z.string().min(1, "Password is required"),
  confirmation: z.string().min(1, "Confirmation phrase is required"),
});

async function clearCollection(collectionName: string) {
  const collectionRef = adminDb.collection(collectionName);
  while (true) {
    const snapshot = await collectionRef.limit(500).get();
    if (snapshot.size === 0) break;
    const batch = adminDb.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
}

async function clearStudentsOnly() {
  const collectionRef = adminDb.collection(COLLECTIONS.USERS);
  while (true) {
    const snapshot = await collectionRef.where("role", "==", "STUDENT").limit(500).get();
    if (snapshot.size === 0) break;
    const batch = adminDb.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
}

export async function POST(req: Request) {
  // 1. Strictly blocked in production builds
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // 2. Requires ALLOW_DB_CLEAR=1 in environment
  if (process.env.ALLOW_DB_CLEAR !== "1") {
    return NextResponse.json(
      { error: "Database clearing is disabled in this environment (ALLOW_DB_CLEAR!=1)" },
      { status: 403 }
    );
  }

  // 3. Super Admin role required
  const guard = await requireRole("SUPER_ADMIN");
  if (!guard.ok) return guard.response;
  const session = guard.session;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
  }

  const { target, password, confirmation } = parsed.data;

  // 4. Require confirmation string
  const expectedConfirmation = `DELETE ${target}`;
  if (confirmation !== expectedConfirmation && confirmation !== "DELETE") {
    return NextResponse.json(
      { error: `Confirmation mismatch. Must type "DELETE" or "${expectedConfirmation}".` },
      { status: 400 }
    );
  }

  // 5. Verify Super Admin password
  const userDoc = await adminDb.collection(COLLECTIONS.USERS).doc(session.user.id).get();
  if (!userDoc.exists) {
    return NextResponse.json({ error: "Super Admin account not found" }, { status: 404 });
  }

  const passwordHash = userDoc.data()?.passwordHash;
  if (!passwordHash) {
    return NextResponse.json({ error: "No password set for this account" }, { status: 403 });
  }

  const isPasswordValid = await bcrypt.compare(password, passwordHash);
  if (!isPasswordValid) {
    return NextResponse.json({ error: "Invalid password confirmation" }, { status: 403 });
  }

  try {
    let details = "";

    if (target === "printJobs") {
      await clearCollection(COLLECTIONS.PRINT_JOBS);
      await clearCollection(COLLECTIONS.TRANSACTIONS);
      details = "Cleared all print jobs and transactions.";
    } else if (target === "uploadedFiles") {
      const jobsSnap = await adminDb.collection(COLLECTIONS.PRINT_JOBS).get();
      let purgedFiles = 0;
      for (const doc of jobsSnap.docs) {
        const data = doc.data();
        if (!data.fileDeletedAt) {
          let publicId = data.cloudinaryPublicId;
          if (!publicId && data.uploadId) {
            const uDoc = await adminDb.collection(COLLECTIONS.UPLOADS).doc(data.uploadId).get();
            if (uDoc.exists) publicId = uDoc.data()?.cloudinaryPublicId;
          }
          if (publicId) await destroyAsset(publicId);
          await doc.ref.update({
            fileDeletedAt: FieldValue.serverTimestamp(),
            fileDeletedBy: session.user.id,
            fileDeletedByName: session.user.name || "Super Admin",
            fileUrl: "",
          });
          purgedFiles++;
        }
      }

      const uploadsSnap = await adminDb.collection(COLLECTIONS.UPLOADS).where("consumed", "==", false).get();
      for (const uDoc of uploadsSnap.docs) {
        const uData = uDoc.data();
        if (uData?.cloudinaryPublicId) await destroyAsset(uData.cloudinaryPublicId);
        await uDoc.ref.update({
          consumed: true,
          deletedAt: FieldValue.serverTimestamp(),
          deletedBy: session.user.id,
        });
      }
      details = `Permanently deleted all user uploaded files from storage (${purgedFiles} print files purged).`;
    } else if (target === "notifications") {
      await clearCollection(COLLECTIONS.NOTIFICATIONS);
      details = "Cleared all notifications.";
    } else if (target === "students") {
      await clearStudentsOnly();
      details = "Cleared all student accounts.";
    } else if (target === "all") {
      // Purge assets from storage first
      const jobsSnap = await adminDb.collection(COLLECTIONS.PRINT_JOBS).get();
      for (const doc of jobsSnap.docs) {
        const data = doc.data();
        let publicId = data.cloudinaryPublicId;
        if (publicId) await destroyAsset(publicId);
      }
      await clearCollection(COLLECTIONS.PRINT_JOBS);
      await clearCollection(COLLECTIONS.TRANSACTIONS);
      await clearCollection(COLLECTIONS.NOTIFICATIONS);
      await clearCollection(COLLECTIONS.UPLOADS);
      await clearStudentsOnly();
      details = "Cleared all print jobs, transactions, notifications, uploaded files, and student accounts.";
    }

    // 6. Audit log the database clear operation
    await createActivityLog({
      adminId: session.user.id,
      action: "DATABASE_CLEARED",
      targetId: target,
      details,
    });

    return NextResponse.json({ success: true, message: details });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}
