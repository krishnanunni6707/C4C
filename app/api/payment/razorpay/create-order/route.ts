/**
 * POST /api/payment/razorpay/create-order
 * Deprecated client-specified amount endpoint.
 * Aliased to /api/print-jobs/draft to enforce server-side pricing.
 * Direct `{ amount }` calls are strictly rejected.
 */

import { NextResponse } from "next/server";
import { POST as draftPost } from "@/app/api/print-jobs/draft/route";

export async function POST(req: Request) {
  // Delegate directly to the draft handler
  return draftPost(req);
}
