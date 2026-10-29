/**
 * GET  /api/admin/admins  — list all ADMIN users with their location and printers
 * POST /api/admin/admins  — create a new ADMIN
 */

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/guards";
import { getAllUsers, createUser } from "@/lib/firestore/users";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { createActivityLog } from "@/lib/firestore/activity-logs";
import { hashPassword } from "@/lib/firestore/auth";
import { toPublicUser } from "@/lib/mappers";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireRole("SUPER_ADMIN");
  if (!guard.ok) return guard.response;
  const session = guard.session;

  try {
    const users = await getAllUsers();
    const admins = users.filter((u) => u.role === "ADMIN");

    // Fetch locations
    const locationsSnap = await adminDb.collection(COLLECTIONS.LOCATIONS).get();
    const locationMap: Record<string, string> = {};
    for (const doc of locationsSnap.docs) {
      locationMap[doc.id] = doc.data().name;
    }

    // Fetch printers
    const printersSnap = await adminDb.collection(COLLECTIONS.PRINTERS).get();
    const printersByLocation: Record<string, string[]> = {};
    for (const doc of printersSnap.docs) {
      const locId = doc.data().location as string;
      if (!locId) continue;
      if (!printersByLocation[locId]) printersByLocation[locId] = [];
      printersByLocation[locId].push(doc.data().name);
    }

    // Map through toPublicUser and attach locationName and printers
    const safe = admins.map((u) => toPublicUser({
      ...u,
      locationName: u.locationId ? (locationMap[u.locationId] ?? "Unknown") : "—",
      printers: u.locationId ? (printersByLocation[u.locationId] ?? []) : [],
    }));

    return NextResponse.json({ users: safe });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

import { z } from "zod";

const createAdminSchema = z.object({
  name: z.string().trim().min(1, "name is required").max(100),
  admissionNumber: z.string().trim().min(1, "admissionNumber is required").max(50),
  locationId: z.string().trim().min(1, "locationId is required"),
  password: z.string().min(10, "Password must be at least 10 characters").optional().or(z.literal("")),
});

export async function POST(req: Request) {
  const guard = await requireRole("SUPER_ADMIN");
  if (!guard.ok) return guard.response;
  const session = guard.session;

  try {
    const rawBody = await req.json();
    const parsed = createAdminSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { name, admissionNumber, locationId, password } = parsed.data;

    // Password must not match admission number
    if (password && password.trim().toLowerCase() === admissionNumber.trim().toLowerCase()) {
      return NextResponse.json(
        { error: "Password cannot be identical to ID" },
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
        { error: `ID ${admissionNumber.toUpperCase()} already exists` },
        { status: 409 }
      );
    }

    // Single-write user creation
    const { user, tempPassword } = await createUser({
      name,
      admissionNumber,
      department: "Administration",
      semester: 0,
      role: "ADMIN",
      locationId,
      customPassword: password || undefined,
    });

    await createActivityLog({
      adminId: session.user.id,
      action: "USER_CREATED",
      targetId: user.id,
      details: `Created ADMIN ${admissionNumber.toUpperCase()} — ${name}`,
    });

    return NextResponse.json(
      { user: { ...toPublicUser(user), tempPassword } },
      { status: 201 }
    );
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
