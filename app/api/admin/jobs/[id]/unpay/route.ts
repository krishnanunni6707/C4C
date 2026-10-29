import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/api/guards";
import {
  printService,
  JobNotFoundError,
  JobStateTransitionError,
} from "@/lib/services/print-service";

export const dynamic = "force-dynamic";

const unpaySchema = z.object({
  reason: z.string().trim().min(5, "Mandatory reason of at least 5 characters is required"),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const guard = await requireRole("SUPER_ADMIN");
  if (!guard.ok) return guard.response;

  try {
    const rawBody = await req.json().catch(() => ({}));
    const parsed = unpaySchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid reason" },
        { status: 400 }
      );
    }

    const { reason } = parsed.data;
    const job = await printService.revertPayment(params.id, guard.session.user.id, reason);
    return NextResponse.json({ success: true, job });
  } catch (e: unknown) {
    if (e instanceof JobNotFoundError) {
      return NextResponse.json({ error: e.message }, { status: 404 });
    }
    if (e instanceof JobStateTransitionError) {
      return NextResponse.json({ error: e.message }, { status: 409 });
    }
    const msg = (e as Error).message;
    if (msg.includes("not marked as paid")) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

