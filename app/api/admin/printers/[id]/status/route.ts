/**
 * POST /api/admin/printers/[id]/status
 * Body: { status: "ONLINE" | "OFFLINE" }
 */

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/guards";
import { setPrinterStatus } from "@/lib/firestore/printers";
import { createActivityLog } from "@/lib/firestore/activity-logs";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const guard = await requireAdmin(true);
  if (!guard.ok) return guard.response;
  const session = guard.session;
  try {
    const { status } = await req.json();

    if (status !== "ONLINE" && status !== "OFFLINE") {
      return NextResponse.json(
        { error: "status must be ONLINE or OFFLINE" },
        { status: 400 }
      );
    }

    await setPrinterStatus(params.id, status);

    await createActivityLog({
      adminId: session.user.id,
      action: status === "ONLINE" ? "PRINTER_ENABLED" : "PRINTER_DISABLED",
      targetId: params.id,
      details: `Printer set to ${status}`,
    });

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
