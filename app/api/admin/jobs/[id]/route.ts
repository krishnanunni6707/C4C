/**
 * GET /api/admin/jobs/[id]
 */

import { NextResponse } from "next/server";
import { adminJobGuard } from "@/lib/api/admin-job-guard";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const guard = await adminJobGuard(params.id);
  if (!guard.ok) return guard.response;

  return NextResponse.json({ job: guard.job });
}
