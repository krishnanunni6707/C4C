/**
 * PATCH  /api/admin/printers/[id]  — update name/location/inkPct/paperPct
 * DELETE /api/admin/printers/[id]  — remove printer
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { updatePrinter, deletePrinter } from "@/lib/firestore/printers";
import { createActivityLog } from "@/lib/firestore/activity-logs";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { name, location, status, inkPercentage, paperPercentage } = body;

    await updatePrinter(params.id, {
      ...(name !== undefined ? { name } : {}),
      ...(location !== undefined ? { location } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(inkPercentage !== undefined ? { inkPercentage: Number(inkPercentage) } : {}),
      ...(paperPercentage !== undefined ? { paperPercentage: Number(paperPercentage) } : {}),
    });

    await createActivityLog({
      adminId: session.user.id,
      action: "PRINTER_UPDATED",
      targetId: params.id,
      details: `Updated fields: ${Object.keys(body).join(", ")}`,
    });

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    await deletePrinter(params.id);

    await createActivityLog({
      adminId: session.user.id,
      action: "PRINTER_REMOVED",
      targetId: params.id,
    });

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
