import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { createActivityLog } from "@/lib/firestore/activity-logs";

export const dynamic = "force-dynamic";

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
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { target } = await req.json();

    if (!target || !["printJobs", "notifications", "students", "all"].includes(target)) {
      return NextResponse.json({ error: "Invalid target" }, { status: 400 });
    }

    let details = "";

    if (target === "printJobs") {
      await clearCollection(COLLECTIONS.PRINT_JOBS);
      await clearCollection(COLLECTIONS.TRANSACTIONS);
      details = "Cleared all print jobs and transactions.";
    } else if (target === "notifications") {
      await clearCollection(COLLECTIONS.NOTIFICATIONS);
      details = "Cleared all notifications.";
    } else if (target === "students") {
      await clearStudentsOnly();
      details = "Cleared all student accounts.";
    } else if (target === "all") {
      await clearCollection(COLLECTIONS.PRINT_JOBS);
      await clearCollection(COLLECTIONS.TRANSACTIONS);
      await clearCollection(COLLECTIONS.NOTIFICATIONS);
      await clearStudentsOnly();
      details = "Cleared all print jobs, transactions, notifications, and student accounts.";
    }

    // Log the clear activity for safety audit trail
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
