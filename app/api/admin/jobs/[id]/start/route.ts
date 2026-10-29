import { NextResponse } from "next/server";
import { adminJobGuard } from "@/lib/api/admin-job-guard";
import {
  printService,
  JobNotFoundError,
  JobStateTransitionError,
  JobPaymentRequiredError,
} from "@/lib/services/print-service";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const guard = await adminJobGuard(params.id);
  if (!guard.ok) return guard.response;

  try {
    const job = await printService.startJob(params.id, guard.adminId);
    return NextResponse.json({ success: true, job });
  } catch (e: unknown) {
    if (e instanceof JobNotFoundError) {
      return NextResponse.json({ error: e.message }, { status: 404 });
    }
    if (e instanceof JobStateTransitionError || e instanceof JobPaymentRequiredError) {
      return NextResponse.json({ error: e.message }, { status: 409 });
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

