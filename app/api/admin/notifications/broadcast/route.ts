import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/guards";
import { createBroadcast } from "@/lib/firestore/notifications";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  title: z.string().min(1).max(80),
  message: z.string().min(1).max(500),
});

export async function POST(req: Request) {
  const guard = await requireRole(["ADMIN", "SUPER_ADMIN"]);
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
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
  }

  const id = await createBroadcast({
    adminName: session.user.name ?? "Admin",
    title: parsed.data.title,
    message: parsed.data.message,
  });

  return NextResponse.json({ success: true, notificationId: id });
}
