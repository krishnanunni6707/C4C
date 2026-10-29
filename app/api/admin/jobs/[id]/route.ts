/**
 * GET /api/admin/jobs/[id]
 * Returns administrative print job details stripped of internal credentials (P-07).
 */

import { NextResponse } from "next/server";
import { adminJobGuard } from "@/lib/api/admin-job-guard";
import { toPublicJob } from "@/lib/mappers";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const guard = await adminJobGuard(params.id);
  if (!guard.ok) return guard.response;

  return NextResponse.json({ job: toPublicJob(guard.job) });
}
