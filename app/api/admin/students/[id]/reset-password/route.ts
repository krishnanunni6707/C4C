/**
 * POST /api/admin/students/[id]/reset-password
 * Generates a new temp password, sets firstLogin = true, returns plain temp password.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resetUserPassword } from "@/lib/firestore/users";
import { createActivityLog } from "@/lib/firestore/activity-logs";

export const dynamic = "force-dynamic";

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let pass = "";
  for (let i = 0; i < 8; i++) {
    pass += chars[Math.floor(Math.random() * chars.length)];
  }
  return pass;
}

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (
    !session?.user?.id ||
    (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tempPassword = generateTempPassword();
    await resetUserPassword(params.id, tempPassword);

    await createActivityLog({
      adminId: session.user.id,
      action: "PASSWORD_RESET",
      targetId: params.id,
      details: "Password reset by admin — firstLogin set to true",
    });

    return NextResponse.json({ success: true, tempPassword });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}
