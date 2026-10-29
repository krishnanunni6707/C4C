/**
 * POST /api/admin/admins/[id]/reset-password
 * Generates a new secure temp password, sets firstLogin = true, returns plain temp password.
 */

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/guards";
import { getUserById, resetUserPassword } from "@/lib/firestore/users";
import { createActivityLog } from "@/lib/firestore/activity-logs";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const guard = await requireRole("SUPER_ADMIN");
  if (!guard.ok) return guard.response;
  const session = guard.session;

  try {
    const targetUser = await getUserById(params.id);
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const tempPassword = await resetUserPassword(params.id);

    await createActivityLog({
      adminId: session.user.id,
      action: "PASSWORD_RESET",
      targetId: params.id,
      details: "Admin password reset by Super Admin — firstLogin set to true",
    });

    return NextResponse.json({ success: true, tempPassword });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}

