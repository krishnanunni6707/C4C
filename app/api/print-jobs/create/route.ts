/**
 * POST /api/print-jobs/create
 * DISABLED: Direct client job creation has been removed for security.
 * All print jobs must be initiated via /api/print-jobs/draft and fulfilled
 * via /api/payment/razorpay/verify or Razorpay webhooks.
 */

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/guards";

export async function POST() {
  const guard = await requireRole(["STUDENT", "ADMIN", "SUPER_ADMIN"]);
  if (!guard.ok) return guard.response;

  return NextResponse.json(
    {
      error:
        "Direct print job creation is disabled. Please create a draft via /api/print-jobs/draft and verify payment via /api/payment/razorpay/verify.",
    },
    { status: 400 }
  );
}
