/**
 * POST /api/admin/students/[id]/status
 * Body: { status: "ACTIVE" | "DISABLED" }
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api/guards";
import { getUserById, setUserStatus } from "@/lib/firestore/users";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { createActivityLog } from "@/lib/firestore/activity-logs";

export const dynamic = "force-dynamic";

const statusSchema = z.object({
  status: z.enum(["ACTIVE", "DISABLED"]),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const guard = await requireAdmin(true);
  if (!guard.ok) return guard.response;
  const session = guard.session;

  try {
    const rawBody = await req.json();
    const parsed = statusSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "status must be ACTIVE or DISABLED" },
        { status: 400 }
      );
    }

    const { status } = parsed.data;

    const targetUser = await getUserById(params.id);
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // ADMINs can only modify STUDENT accounts
    if (session.user.role === "ADMIN" && targetUser.role !== "STUDENT") {
      return NextResponse.json(
        { error: "Admins cannot modify status of non-student accounts" },
        { status: 403 }
      );
    }

    // SUPER_ADMIN cannot disable their own account
    if (session.user.id === targetUser.id && status === "DISABLED") {
      return NextResponse.json(
        { error: "Cannot disable your own account" },
        { status: 400 }
      );
    }

    // Prevent disabling the last active SUPER_ADMIN
    if (targetUser.role === "SUPER_ADMIN" && status === "DISABLED") {
      const superAdminsSnap = await adminDb
        .collection(COLLECTIONS.USERS)
        .where("role", "==", "SUPER_ADMIN")
        .where("status", "==", "ACTIVE")
        .get();

      if (superAdminsSnap.size <= 1) {
        return NextResponse.json(
          { error: "Cannot disable the last active Super Admin account" },
          { status: 400 }
        );
      }
    }

    await setUserStatus(params.id, status);

    await createActivityLog({
      adminId: session.user.id,
      action: status === "DISABLED" ? "STUDENT_DISABLED" : "STUDENT_ENABLED",
      targetId: params.id,
      details: `${targetUser.role} account (${targetUser.admissionNumber}) ${status === "DISABLED" ? "disabled" : "enabled"}`,
    });

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}

