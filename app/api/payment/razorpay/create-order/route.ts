/**
 * POST /api/payment/razorpay/create-order
 * Deprecated client-specified amount endpoint.
 * Aliased to /api/print-jobs/draft to enforce server-side pricing.
 */

import { requireRole } from "@/lib/api/guards";
import { POST as draftPost } from "@/app/api/print-jobs/draft/route";

export async function POST(req: Request) {
  const guard = await requireRole(["STUDENT", "ADMIN", "SUPER_ADMIN"]);
  if (!guard.ok) return guard.response;
  return draftPost(req);
}
