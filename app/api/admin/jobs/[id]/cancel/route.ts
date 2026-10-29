import { NextResponse } from "next/server";
import { adminJobGuard } from "@/lib/api/admin-job-guard";
import {
  printService,
  JobNotFoundError,
  JobStateTransitionError,
} from "@/lib/services/print-service";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const guard = await adminJobGuard(params.id);
  if (!guard.ok) return guard.response;

  try {
    const body = await req.json().catch(() => ({}));
    const reason = typeof body.reason === "string" ? body.reason : undefined;

    const job = await printService.cancelJob(params.id, guard.adminId, reason);
    return NextResponse.json({ success: true, job });
  } catch (e: unknown) {
    if (e instanceof JobNotFoundError) {
      return NextResponse.json({ error: e.message }, { status: 404 });
    }
    if (e instanceof JobStateTransitionError) {
      return NextResponse.json({ error: e.message }, { status: 409 });
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

