/**
 * GET  /api/admin/students  — list all users with job stats
 * POST /api/admin/students  — create a new student
 */

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/guards";
import { getAllUsers, createUser } from "@/lib/firestore/users";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS, FirestoreUser } from "@/lib/firebase/collections";
import { createActivityLog } from "@/lib/firestore/activity-logs";
import { hashPassword } from "@/lib/firestore/auth";

import { toPublicUser } from "@/lib/mappers";

export const dynamic = "force-dynamic";

// ── GET — list all users with job stats ───────────────────────────────────────

export async function GET(req: Request) {
  const guard = await requireAdmin(true);
  if (!guard.ok) return guard.response;

  try {
    const url = new URL(req.url);
    const limitParam = parseInt(url.searchParams.get("limit") || "50", 10);
    const limit = Math.min(Math.max(isNaN(limitParam) ? 50 : limitParam, 1), 100);
    const cursor = url.searchParams.get("startAfter") || url.searchParams.get("cursor");

    let query = adminDb
      .collection(COLLECTIONS.USERS)
      .where("role", "==", "STUDENT")
      .orderBy("name", "asc");

    if (cursor) {
      const cursorDoc = await adminDb.collection(COLLECTIONS.USERS).doc(cursor).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc) as typeof query;
      }
    }

    const snap = await query.limit(limit + 1).get();
    const docs = snap.docs;
    const hasMore = docs.length > limit;
    const pagedDocs = hasMore ? docs.slice(0, limit) : docs;
    const lastDoc = pagedDocs[pagedDocs.length - 1];
    const lastDocId = lastDoc ? lastDoc.id : null;

    const students = pagedDocs.map((d) => ({ ...d.data(), id: d.id } as FirestoreUser));

    // Fetch jobs only for paged students to avoid unbounded collection scan
    const studentIds = students.map((s) => s.id);
    const jobCountMap: Record<string, number> = {};
    const amountMap: Record<string, number> = {};

    if (studentIds.length > 0) {
      for (let i = 0; i < studentIds.length; i += 30) {
        const chunk = studentIds.slice(i, i + 30);
        const jobsSnap = await adminDb
          .collection(COLLECTIONS.PRINT_JOBS)
          .where("studentId", "in", chunk)
          .get();

        for (const doc of jobsSnap.docs) {
          const d = doc.data();
          const sid = d.studentId as string;
          if (!sid) continue;
          jobCountMap[sid] = (jobCountMap[sid] ?? 0) + 1;
          if (d.paymentStatus === "PAID") {
            amountMap[sid] = (amountMap[sid] ?? 0) + (d.amount ?? 0);
          }
        }
      }
    }

    // Map through toPublicUser to strip internal fields and attach stats
    const safe = students.map((u) => toPublicUser({
      ...u,
      totalJobs: jobCountMap[u.id] ?? 0,
      totalAmountSpent: amountMap[u.id] ?? 0,
    }));

    return NextResponse.json({
      users: safe,
      hasMore,
      lastDocId,
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500, headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  }
}

// ── POST — create student ─────────────────────────────────────────────────────

import { z } from "zod";

const createStudentSchema = z.object({
  name: z.string().trim().min(1, "name is required").max(100),
  admissionNumber: z.string().trim().min(1, "admissionNumber is required").max(50),
  department: z.string().trim().min(1, "department is required").max(100),
  semester: z.coerce.number().int().min(1, "semester must be at least 1").max(12, "semester must be at most 12"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().regex(/^[0-9+ -]{7,15}$/, "Invalid phone number").optional().or(z.literal("")),
  password: z.string().min(10, "Password must be at least 10 characters").optional().or(z.literal("")),
  role: z.enum(["STUDENT", "ADMIN", "SUPER_ADMIN"]).optional(),
  locationId: z.string().trim().optional().nullable(),
});

export async function POST(req: Request) {
  const guard = await requireAdmin(true);
  if (!guard.ok) return guard.response;
  const session = guard.session;

  try {
    const rawBody = await req.json();
    const parsed = createStudentSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const {
      name,
      admissionNumber,
      department,
      semester,
      email,
      phone,
      password,
      role,
      locationId,
    } = parsed.data;

    const targetRole = role ?? "STUDENT";

    // Non-super-admins can only create STUDENT accounts
    if (session.user.role !== "SUPER_ADMIN" && targetRole !== "STUDENT") {
      return NextResponse.json(
        { error: "Only a Super Admin can create admin accounts" },
        { status: 403 }
      );
    }

    // ADMIN role requires a locationId
    if (targetRole === "ADMIN" && !locationId) {
      return NextResponse.json(
        { error: "locationId is required when creating an ADMIN account" },
        { status: 400 }
      );
    }

    // Password must not match admission number
    if (password && password.trim().toLowerCase() === admissionNumber.trim().toLowerCase()) {
      return NextResponse.json(
        { error: "Password cannot be identical to admission number" },
        { status: 400 }
      );
    }

    // Check for duplicate admissionNumber
    const existing = await adminDb
      .collection(COLLECTIONS.USERS)
      .where("admissionNumber", "==", admissionNumber.trim().toUpperCase())
      .limit(1)
      .get();

    if (!existing.empty) {
      return NextResponse.json(
        { error: `Admission number ${admissionNumber.toUpperCase()} already exists` },
        { status: 409 }
      );
    }

    // Single-write user creation with secure password generation/hashing
    const { user, tempPassword } = await createUser({
      name,
      admissionNumber,
      department,
      semester,
      email: email || undefined,
      phone: phone || undefined,
      role: targetRole,
      locationId: targetRole === "ADMIN" ? (locationId ?? null) : null,
      customPassword: password || undefined,
    });

    await createActivityLog({
      adminId: session.user.id,
      action: "USER_CREATED",
      targetId: user.id,
      details: `Created ${targetRole} ${admissionNumber.toUpperCase()} — ${name}`,
    });

    return NextResponse.json(
      { user: { ...toPublicUser(user), tempPassword } },
      { status: 201 }
    );
  } catch (e: unknown) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}
