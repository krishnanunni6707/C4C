/**
 * GET  /api/admin/locations  — list all locations
 * POST /api/admin/locations  — create a new location
 *
 * SUPER_ADMIN only.
 */

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/guards";
import { getAllLocations, createLocation } from "@/lib/firestore/locations";
import { createActivityLog } from "@/lib/firestore/activity-logs";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireRole("SUPER_ADMIN");
  if (!guard.ok) return guard.response;

  try {
    const locations = await getAllLocations();
    return NextResponse.json({ locations });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

import { z } from "zod";

const createLocationSchema = z.object({
  name: z.string().min(1, "name is required"),
  building: z.string().optional(),
  floor: z.string().optional(),
  openTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid openTime format (HH:MM)").optional().nullable(),
  closeTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid closeTime format (HH:MM)").optional().nullable(),
});

export async function POST(req: Request) {
  const guard = await requireRole("SUPER_ADMIN");
  if (!guard.ok) return guard.response;
  const session = guard.session;

  try {
    const rawBody = await req.json();
    const parsed = createLocationSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid location data" },
        { status: 400 }
      );
    }

    const { name, building, floor, openTime, closeTime } = parsed.data;

    const location = await createLocation({
      name,
      building,
      floor,
      openTime: openTime ?? undefined,
      closeTime: closeTime ?? undefined,
    });

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
