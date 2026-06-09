/**
 * GET /api/seed-users
 * Seeds Firestore with the two required test users.
 * Safe to call multiple times — skips users that already exist.
 *
 * Test accounts:
 *   Student  → admissionNumber: S1001    password: Student@123  firstLogin: true
 *   Admin    → admissionNumber: ADMIN001 password: Admin@123    firstLogin: false
 *
 * Remove or protect this route before going to production.
 */

import { NextResponse } from "next/server";
import { hashPassword, createUserIfNotExists } from "@/lib/firestore/auth";

export async function GET() {
  try {
    const results: Record<string, { created: boolean; id: string }> = {};

    // ── Student ───────────────────────────────────────────────────────────────
    const studentHash = await hashPassword("Student@123");
    results["S1001"] = await createUserIfNotExists({
      admissionNumber: "S1001",
      name: "Test Student",
      department: "Computer Science",
      semester: 3,
      email: "student@campus.edu",
      passwordHash: studentHash,
      role: "STUDENT",
      firstLogin: true,
      status: "ACTIVE",
    });

    // ── Admin ─────────────────────────────────────────────────────────────────
    const adminHash = await hashPassword("Admin@123");
    results["ADMIN001"] = await createUserIfNotExists({
      admissionNumber: "ADMIN001",
      name: "Admin User",
      department: "Administration",
      semester: 0,
      email: "admin@campus.edu",
      passwordHash: adminHash,
      role: "ADMIN",
      firstLogin: false,
      status: "ACTIVE",
    });

    const allCreated = Object.values(results).every((r) => r.created);
    const anyCreated = Object.values(results).some((r) => r.created);

    return NextResponse.json({
      success: true,
      message: allCreated
        ? "✅ Both users created successfully."
        : anyCreated
        ? "⚠️ Some users already existed — only new ones were created."
        : "ℹ️ All users already exist — nothing changed.",
      users: {
        "S1001": {
          ...results["S1001"],
          role: "STUDENT",
          firstLogin: true,
          note: results["S1001"].created
            ? "Created — must change password on first login"
            : "Already existed",
        },
        "ADMIN001": {
          ...results["ADMIN001"],
          role: "ADMIN",
          firstLogin: false,
          note: results["ADMIN001"].created ? "Created" : "Already existed",
        },
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("seed-users error:", msg);
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
