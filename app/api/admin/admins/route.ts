/**
 * GET  /api/admin/admins  — list all ADMIN users with their location and printers
 * POST /api/admin/admins  — create a new ADMIN
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

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

    // Strip passwordHash and attach locationName and printers
    const safe = admins.map(({ passwordHash: _ph, ...u }) => ({
      ...u,
      locationName: u.locationId ? (locationMap[u.locationId] ?? "Unknown") : "—",
      printers: u.locationId ? (printersByLocation[u.locationId] ?? []) : [],
    }));

    return NextResponse.json({ users: safe });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, admissionNumber, locationId, password } = body;

    if (!name || !admissionNumber || !locationId) {
      return NextResponse.json(
        { error: "name, admissionNumber, and locationId are required" },
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

    if (password && password.trim().length >= 6) {
      // Manual password path
      const { FieldValue } = await import("firebase-admin/firestore");
      const passwordHash = await hashPassword(password.trim());
      const docRef = adminDb.collection(COLLECTIONS.USERS).doc();

      const user = {
        id: docRef.id,
        admissionNumber: admissionNumber.trim().toUpperCase(),
        name: name.trim(),
        department: "Administration",
        semester: 0,
        passwordHash,
        role: "ADMIN",
        locationId,
        firstLogin: true,
        status: "ACTIVE" as const,
        createdAt: FieldValue.serverTimestamp(),
      };

      await docRef.set(user);

      await createActivityLog({
        adminId: session.user.id,
        action: "USER_CREATED",
        targetId: docRef.id,
        details: `Created ADMIN ${admissionNumber.toUpperCase()} — ${name}`,
      });

      const { passwordHash: _ph, ...safe } = user;
      return NextResponse.json({ user: { ...safe, tempPassword: password.trim() } }, { status: 201 });
    }

    // Auto-generated password path
    const user = await createUser({
      name,
      admissionNumber,
      department: "Administration",
      semester: 0,
      role: "ADMIN",
      locationId,
    });

    await createActivityLog({
      adminId: session.user.id,
      action: "USER_CREATED",
      targetId: user.id,
      details: `Created ADMIN ${admissionNumber.toUpperCase()} — ${name}`,
    });

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
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
