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

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const guard = await requireRole("SUPER_ADMIN");
  if (!guard.ok) return guard.response;
  const session = guard.session;

  try {
    const body = await req.json();
    const { name, isActive, building, floor } = body;

    await updateLocation(params.id, { name, isActive, building, floor });

    await createActivityLog({
      adminId: session.user.id,
      action: "LOCATION_UPDATED",
      targetId: params.id,
      details: `Updated location ${params.id}: ${JSON.stringify({ name, isActive })}`,
    });

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
