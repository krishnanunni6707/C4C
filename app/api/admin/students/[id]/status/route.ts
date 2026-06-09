/**
 * POST /api/admin/students/[id]/status
 * Body: { status: "ACTIVE" | "DISABLED" }
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { setUserStatus } from "@/lib/firestore/users";
import { createActivityLog } from "@/lib/firestore/activity-logs";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { status } = await req.json();

    if (status !== "ACTIVE" && status !== "DISABLED") {
      return NextResponse.json(
        { error: "status must be ACTIVE or DISABLED" },
        { status: 400 }
      );
    }

    await setUserStatus(params.id, status);

    await createActivityLog({
      adminId: session.user.id,
      action: status === "DISABLED" ? "STUDENT_DISABLED" : "STUDENT_ENABLED",
      targetId: params.id,
      details: `Account ${status === "DISABLED" ? "disabled" : "enabled"}`,
    });

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}
