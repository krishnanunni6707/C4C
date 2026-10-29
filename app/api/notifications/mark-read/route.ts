import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/guards";
import {
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/firestore/notifications";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  notificationId: z.union([z.string().min(1), z.literal("all")]),
});

export async function POST(req: Request) {
  const guard = await requireRole(["STUDENT", "ADMIN", "SUPER_ADMIN"]);
  if (!guard.ok) return guard.response;
  const session = guard.session;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const userId = session.user.id;

  try {
    if (parsed.data.notificationId === "all") {
      await markAllNotificationsRead(userId);
    } else {
      await markNotificationRead(parsed.data.notificationId, userId);
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to mark notification read";
    if (message.includes("Forbidden")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
