/**
 * POST /api/auth/change-password
 * Updates the authenticated user's password and clears the firstLogin flag.
 * Called by the first-login page after validating the new password client-side.
 */

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/guards";
import { setNewPassword } from "@/lib/firestore/auth";
import { z } from "zod";

const schema = z.object({
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password too long"),
});

export async function POST(req: Request) {
  try {
    const guard = await requireRole(["STUDENT", "ADMIN", "SUPER_ADMIN"]);
    if (!guard.ok) return guard.response;
    const session = guard.session;

    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    await setNewPassword(session.user.id, parsed.data.newPassword);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("change-password error:", msg);
    return NextResponse.json(
      { error: "Failed to update password" },
      { status: 500 }
    );
  }
}
