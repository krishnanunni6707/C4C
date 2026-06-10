/**
 * POST /api/admin/bootstrap-super-admin
 *
 * One-time utility that promotes a user to SUPER_ADMIN by admission number.
 * Protected by a secret token so it cannot be called by random users.
 *
 * Body: { admissionNumber: string, secret: string }
 *
 * The secret must match the BOOTSTRAP_SECRET environment variable.
 * Set it in .env.local before calling this route, then remove it after use.
 *
 * DELETE OR DISABLE THIS ROUTE after first use.
 */

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { admissionNumber, secret } = body;

    // Guard — must supply the secret from .env.local
    const expectedSecret = process.env.BOOTSTRAP_SECRET;
    if (!expectedSecret) {
      return NextResponse.json(
        { error: "BOOTSTRAP_SECRET is not set in environment variables." },
        { status: 500 }
      );
    }
    if (secret !== expectedSecret) {
      return NextResponse.json({ error: "Invalid secret." }, { status: 403 });
    }

    if (!admissionNumber) {
      return NextResponse.json(
        { error: "admissionNumber is required." },
        { status: 400 }
      );
    }

    // Find the user document
    const snap = await adminDb
      .collection(COLLECTIONS.USERS)
      .where("admissionNumber", "==", admissionNumber.trim().toUpperCase())
      .limit(1)
      .get();

    if (snap.empty) {
      return NextResponse.json(
        { error: `No user found with admissionNumber ${admissionNumber.toUpperCase()}` },
        { status: 404 }
      );
    }

    const doc = snap.docs[0];
    const currentRole = doc.data().role;

    if (currentRole === "SUPER_ADMIN") {
      return NextResponse.json({
        message: `${admissionNumber.toUpperCase()} is already SUPER_ADMIN. No change made.`,
        role: currentRole,
      });
    }

    // Promote to SUPER_ADMIN and clear locationId (not needed for super admin)
    await doc.ref.update({
      role: "SUPER_ADMIN",
      locationId: null,
    });

    return NextResponse.json({
      success: true,
      message: `${admissionNumber.toUpperCase()} promoted from ${currentRole} to SUPER_ADMIN.`,
      previousRole: currentRole,
      newRole: "SUPER_ADMIN",
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Bootstrap error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
