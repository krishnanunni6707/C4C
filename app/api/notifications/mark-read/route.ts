import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
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
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  if (parsed.data.notificationId === "all") {
    await markAllNotificationsRead(userId);
  } else {
    await markNotificationRead(parsed.data.notificationId, userId);
  }

  return NextResponse.json({ success: true });
}
