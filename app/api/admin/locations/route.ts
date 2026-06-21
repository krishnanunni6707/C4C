/**
 * GET  /api/admin/locations  — list all locations
 * POST /api/admin/locations  — create a new location
 *
 * SUPER_ADMIN only.
 */

import { NextResponse } from "next/server";
import { getServerSession, Session } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAllLocations, createLocation } from "@/lib/firestore/locations";
import { createActivityLog } from "@/lib/firestore/activity-logs";

export const dynamic = "force-dynamic";

function isSuperAdmin(session: Session | null) {
  return session?.user?.id && session.user.role === "SUPER_ADMIN";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isSuperAdmin(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const locations = await getAllLocations();
    return NextResponse.json({ locations });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!isSuperAdmin(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, building, floor } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }

    const location = await createLocation({ name, building, floor });

    await createActivityLog({
      adminId: session!.user.id,
      action: "LOCATION_CREATED",
      targetId: location.id,
      details: `Created location: ${name}`,
    });

    return NextResponse.json({ location }, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
