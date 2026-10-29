/**
 * POST /api/admin/students/bulk
 * Body: Array of { admissionNumber, name, department, semester, email?, phone? }
 * Creates missing students only, skips duplicates.
 * Returns: { success: true, created, skipped, errors, credentials, credentialsCsv }
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { requireAdmin } from "@/lib/api/guards";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { generateTempPassword } from "@/lib/firestore/users";
import { hashPassword } from "@/lib/firestore/auth";
import { createActivityLog } from "@/lib/firestore/activity-logs";

export const dynamic = "force-dynamic";

const bulkStudentRowSchema = z.object({
  admissionNumber: z.string().trim().min(1, "Admission number is required").max(50),
  name: z.string().trim().min(1, "Name is required").max(100),
  department: z.string().trim().min(1, "Department is required").max(100),
  semester: z.coerce.number().int().min(1, "Semester must be >= 1").max(12, "Semester must be <= 12"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().regex(/^[0-9+ -]{7,15}$/, "Invalid phone").optional().or(z.literal("")),
});

export async function POST(req: Request) {
  const guard = await requireAdmin(true);
  if (!guard.ok) return guard.response;
  const session = guard.session;

  try {
    const rawRows = await req.json();

    if (!Array.isArray(rawRows) || rawRows.length === 0) {
      return NextResponse.json(
        { error: "Request body must be a non-empty array" },
        { status: 400 }
      );
    }

    if (rawRows.length > 1000) {
      return NextResponse.json(
        { error: "Maximum 1000 students per bulk import" },
        { status: 400 }
      );
    }

    let skipped = 0;
    const errors: string[] = [];
    const validRows: Array<z.infer<typeof bulkStudentRowSchema>> = [];
    const seenInBatch = new Set<string>();

    for (const raw of rawRows) {
      const parsed = bulkStudentRowSchema.safeParse(raw);
      if (!parsed.success) {
        errors.push(
          `Skipped invalid row (${(raw as Record<string, unknown>)?.admissionNumber || "unknown"}): ${parsed.error.issues[0]?.message}`
        );
        skipped++;
        continue;
      }

      const row = parsed.data;
      const admUpper = row.admissionNumber.toUpperCase();
      if (seenInBatch.has(admUpper)) {
        errors.push(`Duplicate admission number in import batch: ${admUpper}`);
        skipped++;
        continue;
      }

      seenInBatch.add(admUpper);
      validRows.push({ ...row, admissionNumber: admUpper });
    }

    // Check existing admission numbers in chunks of 30
    const existingSet = new Set<string>();
    for (let i = 0; i < validRows.length; i += 30) {
      const chunk = validRows.slice(i, i + 30).map((r) => r.admissionNumber);
      const snap = await adminDb
        .collection(COLLECTIONS.USERS)
        .where("admissionNumber", "in", chunk)
        .get();

      snap.docs.forEach((d) => {
        const adm = d.data().admissionNumber;
        if (adm) existingSet.add(adm.toUpperCase());
      });
    }

    const toCreate = validRows.filter((r) => {
      if (existingSet.has(r.admissionNumber)) {
        skipped++;
        return false;
      }
      return true;
    });

    const createdCredentials: Array<{
      admissionNumber: string;
      name: string;
      tempPassword: string;
    }> = [];

    // Pre-hash passwords in parallel
    const preparedUsers = await Promise.all(
      toCreate.map(async (row) => {
        const tempPassword = generateTempPassword(12);
        const passwordHash = await hashPassword(tempPassword);
        return {
          row,
          tempPassword,
          passwordHash,
        };
      })
    );

    // Commit writes in Firestore batches of 450 (Firestore limit is 500)
    for (let i = 0; i < preparedUsers.length; i += 450) {
      const batch = adminDb.batch();
      const chunk = preparedUsers.slice(i, i + 450);

      for (const item of chunk) {
        const docRef = adminDb.collection(COLLECTIONS.USERS).doc();
        const userDoc = {
          id: docRef.id,
          admissionNumber: item.row.admissionNumber,
          name: item.row.name,
          department: item.row.department,
          semester: item.row.semester,
          ...(item.row.email ? { email: item.row.email } : {}),
          ...(item.row.phone ? { phone: item.row.phone } : {}),
          passwordHash: item.passwordHash,
          role: "STUDENT" as const,
          locationId: null,
          firstLogin: true,
          status: "ACTIVE" as const,
          createdAt: FieldValue.serverTimestamp(),
        };

        batch.set(docRef, userDoc);
        createdCredentials.push({
          admissionNumber: item.row.admissionNumber,
          name: item.row.name,
          tempPassword: item.tempPassword,
        });
      }

      await batch.commit();
    }

    // Build downloadable CSV
    let credentialsCsv = "Admission Number,Name,Temporary Password\n";
    for (const cred of createdCredentials) {
      credentialsCsv += `"${cred.admissionNumber.replace(/"/g, '""')}","${cred.name.replace(/"/g, '""')}","${cred.tempPassword}"\n`;
    }

    await createActivityLog({
      adminId: session.user.id,
      action: "BULK_IMPORT",
      targetId: "users",
      details: `Bulk import: ${createdCredentials.length} created, ${skipped} skipped`,
    });

    return NextResponse.json({
      success: true,
      created: createdCredentials.length,
      skipped,
      errors,
      credentials: createdCredentials,
      credentialsCsv,
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}

