/**
 * POST /api/auth/change-password
 * Hardened password change endpoint (P-09).
 * - Enforces minimum 10 characters.
 * - Prevents password being equal to admission number.
 * - Requires current password unless user is in forced first-login flow.
 * - Records passwordChangedAt to invalidate existing JWT sessions issued prior to the change.
 */

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/guards";
import { getUserById, verifyPassword, setNewPassword } from "@/lib/firestore/auth";
import { createActivityLog } from "@/lib/firestore/activity-logs";
import { logger } from "@/lib/logger";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z
    .string()
    .min(10, "Password must be at least 10 characters")
    .max(128, "Password too long"),
});

export async function POST(req: Request) {
  try {
    const guard = await requireRole(["STUDENT", "ADMIN", "SUPER_ADMIN"]);
    if (!guard.ok) return guard.response;
    const session = guard.session;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const user = await getUserById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 1. If not firstLogin, current password is strictly required
    if (!user.firstLogin) {
      if (!parsed.data.currentPassword) {
        return NextResponse.json(
          { error: "Current password is required" },
          { status: 400 }
        );
      }

      const isCurrentValid = await verifyPassword(
        parsed.data.currentPassword,
        user.passwordHash
      );

      if (!isCurrentValid) {
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 400 }
        );
      }
    }

    // 2. Minimum password policy: not equal to admission number
    if (parsed.data.newPassword.toLowerCase() === user.admissionNumber.toLowerCase()) {
      return NextResponse.json(
        { error: "Password cannot be equal to your admission number" },
        { status: 400 }
      );
    }

    // 3. Update password and invalidate other sessions (records passwordChangedAt)
    await setNewPassword(session.user.id, parsed.data.newPassword);

    await createActivityLog({
      adminId: session.user.id,
      action: "PASSWORD_CHANGED",
      targetId: session.user.id,
      details: "Password successfully updated.",
    });

    return NextResponse.json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error("change-password error:", msg);
    return NextResponse.json(
      { error: "Failed to update password" },
      { status: 500 }
    );
  }
}
