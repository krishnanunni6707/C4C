/**
 * GET /api/locations
 * Returns all active print locations.
 * Requires authentication — students must be logged in to access this.
 */

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/guards";
import { getActiveLocations } from "@/lib/firestore/locations";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireRole(["STUDENT", "ADMIN", "SUPER_ADMIN"]);
  if (!guard.ok) return guard.response;

  try {
    const locations = await getActiveLocations();
    return NextResponse.json({ locations });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}
