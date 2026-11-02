/**
 * PATCH /api/admin/locations/[id]  — update name, isActive, building, floor
 *
 * SUPER_ADMIN only.
 */

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/guards";
import { updateLocation } from "@/lib/firestore/locations";
import { createActivityLog } from "@/lib/firestore/activity-logs";

export const dynamic = "force-dynamic";

import { z } from "zod";

const updateLocationSchema = z.object({
  name: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  building: z.string().optional(),
  floor: z.string().optional(),
  openTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid openTime format (HH:MM)").optional().nullable(),
  closeTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid closeTime format (HH:MM)").optional().nullable(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const guard = await requireRole("SUPER_ADMIN");
  if (!guard.ok) return guard.response;
  const session = guard.session;

  try {
    const rawBody = await req.json();
    const parsed = updateLocationSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid update data" },
        { status: 400 }
      );
    }

    const { name, isActive, building, floor, openTime, closeTime } = parsed.data;

    await updateLocation(params.id, {
      name,
      isActive,
      building,
      floor,
      openTime: openTime ?? undefined,
      closeTime: closeTime ?? undefined,
    });

    await createActivityLog({
      adminId: session.user.id,
      action: "LOCATION_UPDATED",
      targetId: params.id,
      details: `Updated location ${params.id}: ${JSON.stringify(parsed.data)}`,
    });

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
