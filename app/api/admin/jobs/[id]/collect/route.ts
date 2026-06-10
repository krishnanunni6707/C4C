import { NextResponse } from "next/server";
import { adminJobGuard } from "@/lib/api/admin-job-guard";
import { printService } from "@/lib/services/print-service";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const guard = await adminJobGuard(params.id);
  if (!guard.ok) return guard.response;

  try {
    await printService.markCollected(params.id, guard.adminId);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
