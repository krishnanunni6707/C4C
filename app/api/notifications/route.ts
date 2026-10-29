/**
 * GET /api/notifications
 * Returns targeted and broadcast notifications for the authenticated session user (P-06).
 */

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/guards";
import { getNotificationsForUser } from "@/lib/firestore/notifications";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireRole(["STUDENT", "ADMIN", "SUPER_ADMIN"]);
  if (!guard.ok) return guard.response;

  try {
    const notifications = await getNotificationsForUser(guard.session.user.id);

    return NextResponse.json(
      { notifications },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to fetch notifications";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
