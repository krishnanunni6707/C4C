/**
 * GET /api/locations
 * Returns all active print locations.
 * Requires authentication — students must be logged in to access this.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getActiveLocations } from "@/lib/firestore/locations";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
