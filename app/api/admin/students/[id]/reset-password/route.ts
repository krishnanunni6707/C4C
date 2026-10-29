/**
 * POST /api/admin/students/[id]/reset-password
 * Generates a new secure temp password, sets firstLogin = true, returns plain temp password.
 */

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/guards";
import { getUserById, resetUserPassword } from "@/lib/firestore/users";
import { createActivityLog } from "@/lib/firestore/activity-logs";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const guard = await requireAdmin(true);
  if (!guard.ok) return guard.response;
  const session = guard.session;

  try {
    const targetUser = await getUserById(params.id);
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // ADMINs can only reset passwords for students
    if (session.user.role === "ADMIN" && targetUser.role !== "STUDENT") {
      return NextResponse.json(
        { error: "Admins cannot reset passwords for non-student accounts" },
        { status: 403 }
      );
    }

    const tempPassword = await resetUserPassword(params.id);

    await createActivityLog({
      adminId: session.user.id,
      action: "PASSWORD_RESET",
      targetId: params.id,
      details: `Password reset by ${session.user.role} — firstLogin set to true`,
    });

    return NextResponse.json({ success: true, tempPassword });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}

