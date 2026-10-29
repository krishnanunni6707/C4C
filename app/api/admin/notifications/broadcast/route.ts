import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/guards";
import { createBroadcast } from "@/lib/firestore/notifications";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(80, "Title must be at most 80 characters"),
  message: z.string().trim().min(1, "Message is required").max(500, "Message must be at most 500 characters"),
});

export async function POST(req: Request) {
  const guard = await requireRole(["ADMIN", "SUPER_ADMIN"]);
  if (!guard.ok) return guard.response;
  const session = guard.session;

  const rateLimit = await checkRateLimit({
    key: `broadcast:${session.user.id}`,
    maxAttempts: 5,
    windowSeconds: 60,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many broadcast requests. Please slow down." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      }
    );
  }

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

  try {
    const id = await createBroadcast({
      adminName: session.user.name ?? "Admin",
      title: parsed.data.title,
      message: parsed.data.message,
    });

    return NextResponse.json({ success: true, notificationId: id });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to create broadcast notification";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
