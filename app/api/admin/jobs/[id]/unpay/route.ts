import { NextResponse } from "next/server";
import { adminJobGuard } from "@/lib/api/admin-job-guard";
import { updatePaymentStatus } from "@/lib/firestore/print-jobs";
import { createActivityLog } from "@/lib/firestore/activity-logs";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const guard = await adminJobGuard(params.id);
  if (!guard.ok) return guard.response;

  try {
    await updatePaymentStatus(params.id, "PENDING");
    await createActivityLog({
      adminId: guard.adminId,
      action: "PAYMENT_REVERTED",
      targetId: params.id,
      details: "Payment marked as pending (unpaid) by admin",
    });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
