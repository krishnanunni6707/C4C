/**
 * GET /api/print-jobs/queue
 * Returns all active (WAITING + PRINTING) jobs for the admin queue view.
 * Migrated from Prisma → Firestore.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getActiveQueue } from "@/lib/firestore/print-jobs";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const printJobs = await getActiveQueue();

    return NextResponse.json({ printJobs });
  } catch (error) {
    console.error("Fetch queue error:", error);
    return NextResponse.json(
      { error: "Failed to fetch queue" },
      { status: 500 }
    );
  }
}
