/**
 * POST /api/admin/students/bulk
 * Body: Array of { admissionNumber, name, department, semester }
 * Creates missing students only, skips duplicates.
 * Returns: { created, skipped, errors }
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { createUser } from "@/lib/firestore/users";
import { createActivityLog } from "@/lib/firestore/activity-logs";

export const dynamic = "force-dynamic";

interface BulkRow {
  admissionNumber: string;
  name: string;
  department: string;
  semester: number | string;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (
    !session?.user?.id ||
    (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows: BulkRow[] = await req.json();

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: "Request body must be a non-empty array" },
        { status: 400 }
      );
    }

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const row of rows) {
      const admNo = (row.admissionNumber ?? "").trim().toUpperCase();
      const name = (row.name ?? "").trim();
      const department = (row.department ?? "").trim();
      const semester = Number(row.semester);

      // Basic validation
      if (!admNo || !name || !department || isNaN(semester)) {
        errors.push(`Skipped invalid row: ${JSON.stringify(row)}`);
        skipped++;
        continue;
      }

      // Check for existing admission number
      const existing = await adminDb
        .collection(COLLECTIONS.USERS)
        .where("admissionNumber", "==", admNo)
        .limit(1)
        .get();

      if (!existing.empty) {
        skipped++;
        continue;
      }

      try {
        await createUser({
          admissionNumber: admNo,
          name,
          department,
          semester,
          role: "STUDENT",
        });
        created++;
      } catch (e: unknown) {
        errors.push(
          `Failed to create ${admNo}: ${e instanceof Error ? e.message : String(e)}`
        );
        skipped++;
      }
    }

    await createActivityLog({
      adminId: session.user.id,
      action: "BULK_IMPORT",
      targetId: "users",
      details: `Bulk import: ${created} created, ${skipped} skipped`,
    });

    return NextResponse.json({ success: true, created, skipped, errors });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}
