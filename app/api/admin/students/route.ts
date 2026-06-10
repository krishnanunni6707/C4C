/**
 * GET  /api/admin/students  — list all users with job stats
 * POST /api/admin/students  — create a new student
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAllUsers, createUser } from "@/lib/firestore/users";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { createActivityLog } from "@/lib/firestore/activity-logs";
import { hashPassword } from "@/lib/firestore/auth";

export const dynamic = "force-dynamic";

// ── GET — list all users with job stats ───────────────────────────────────────

export async function GET() {
  const session = await getServerSession(authOptions);
  if (
    !session?.user?.id ||
    (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const users = await getAllUsers();

    // Fetch all print jobs once and build a per-student map
    const jobsSnap = await adminDb.collection(COLLECTIONS.PRINT_JOBS).get();

    const jobCountMap: Record<string, number> = {};
    const amountMap: Record<string, number> = {};

    for (const doc of jobsSnap.docs) {
      const d = doc.data();
      const sid = d.studentId as string;
      if (!sid) continue;
      jobCountMap[sid] = (jobCountMap[sid] ?? 0) + 1;
      if (d.paymentStatus === "PAID") {
        amountMap[sid] = (amountMap[sid] ?? 0) + (d.amount ?? 0);
      }
    }

    // Strip passwordHash and attach stats
    const safe = users.map(({ passwordHash: _ph, ...u }) => ({
      ...u,
      totalJobs: jobCountMap[u.id] ?? 0,
      totalAmountSpent: amountMap[u.id] ?? 0,
    }));

    return NextResponse.json({ users: safe });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}

// ── POST — create student ─────────────────────────────────────────────────────

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (
    !session?.user?.id ||
    (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, admissionNumber, department, semester, email, phone, password, role, locationId } = body;

    if (!name || !admissionNumber || !department || !semester) {
      return NextResponse.json(
        { error: "name, admissionNumber, department and semester are required" },
        { status: 400 }
      );
    }

    // Only SUPER_ADMIN can create ADMIN or SUPER_ADMIN accounts
    const targetRole = role ?? "STUDENT";
    if (
      (targetRole === "ADMIN" || targetRole === "SUPER_ADMIN") &&
      session.user.role !== "SUPER_ADMIN"
    ) {
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

    // If admin provided a password, hash it directly; otherwise createUser auto-generates
    if (password && password.trim().length >= 6) {
      // Manual password path — create doc directly so we use the admin-specified password
      const { FieldValue } = await import("firebase-admin/firestore");
      const passwordHash = await hashPassword(password.trim());
      const docRef = adminDb.collection(COLLECTIONS.USERS).doc();

      const user = {
        id: docRef.id,
        admissionNumber: admissionNumber.trim().toUpperCase(),
        name: name.trim(),
        department,
        semester: Number(semester),
        ...(email ? { email } : {}),
        ...(phone ? { phone } : {}),
        passwordHash,
        role: targetRole as "STUDENT" | "ADMIN" | "SUPER_ADMIN",
        locationId: targetRole === "ADMIN" ? (locationId ?? null) : null,
        firstLogin: true,
        status: "ACTIVE" as const,
        createdAt: FieldValue.serverTimestamp(),
      };

      await docRef.set(user);

      await createActivityLog({
        adminId: session.user.id,
        action: "USER_CREATED",
        targetId: docRef.id,
        details: `Created ${targetRole} ${admissionNumber.toUpperCase()} — ${name}`,
      });

      const { passwordHash: _ph, ...safe } = user;
      return NextResponse.json({ user: { ...safe, tempPassword: password.trim() } }, { status: 201 });
    }

    // Auto-generated password path
    const user = await createUser({
      name,
      admissionNumber,
      department,
      semester: Number(semester),
      email: email || undefined,
      phone: phone || undefined,
      role: targetRole as "STUDENT" | "ADMIN" | "SUPER_ADMIN",
      locationId: targetRole === "ADMIN" ? (locationId ?? null) : null,
    });

    await createActivityLog({
      adminId: session.user.id,
      action: "USER_CREATED",
      targetId: user.id,
      details: `Created ${targetRole} ${admissionNumber.toUpperCase()} — ${name}`,
    });

    // Re-generate temp password so we can return it to the admin for handoff
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let tempPassword = "";
    for (let i = 0; i < 8; i++) {
      tempPassword += chars[Math.floor(Math.random() * chars.length)];
    }
    const newHash = await hashPassword(tempPassword);
    await adminDb.collection(COLLECTIONS.USERS).doc(user.id).update({ passwordHash: newHash });

    const { passwordHash: _ph, ...safe } = user;
    return NextResponse.json({ user: { ...safe, tempPassword } }, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}
