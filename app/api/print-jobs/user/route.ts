/**
 * GET /api/print-jobs/user
 * Returns all print jobs for the currently logged-in student.
 * Migrated from Prisma → Firestore.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPrintJobsByStudent } from "@/lib/firestore/print-jobs";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const printJobs = await getPrintJobsByStudent(session.user.id);

    return NextResponse.json({ printJobs });
  } catch (error) {
    console.error("Fetch user jobs error:", error);
    return NextResponse.json(
      { error: "Failed to fetch print jobs" },
      { status: 500 }
    );
  }
}
