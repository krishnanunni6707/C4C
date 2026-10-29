/**
 * GET /api/auth/verify-session
 * Restricted development debug route (P-07). Returns 404 in production.
 */

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/guards";

export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const guard = await requireRole(["STUDENT", "ADMIN", "SUPER_ADMIN"]);
  if (!guard.ok) return guard.response;

  const session = guard.session;

  return NextResponse.json({
    authenticated: true,
    message: "Session is valid.",
    user: {
      id: session.user.id,
      name: session.user.name,
      admissionNumber: session.user.admissionNumber,
      role: session.user.role,
      firstLogin: session.user.firstLogin,
    },
  });
}
