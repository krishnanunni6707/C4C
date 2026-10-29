/**
 * POST /api/print-jobs/create
 * DISABLED: Direct client job creation has been removed for security.
 * All print jobs must be initiated via /api/print-jobs/draft and fulfilled
 * via /api/payment/razorpay/verify or Razorpay webhooks.
 *
 * Client-supplied amount, paymentStatus, and totalPages are strictly rejected.
 */

import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Direct print job creation is disabled. Please create a draft via /api/print-jobs/draft and verify payment via /api/payment/razorpay/verify.",
    },
    { status: 400 }
  );
}
