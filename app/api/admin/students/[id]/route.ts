/**
 * GET /api/admin/students/[id]
 * Returns student profile + job stats (total jobs, total amount spent).
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserById } from "@/lib/firestore/users";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await getUserById(params.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
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

    // Strip passwordHash
    const { passwordHash: _ph, ...safeUser } = user;

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
