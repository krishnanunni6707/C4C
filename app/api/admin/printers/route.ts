/**
 * GET  /api/admin/printers  — list all printers
 * POST /api/admin/printers  — create a printer
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAllPrinters, createPrinter } from "@/lib/firestore/printers";
import { createActivityLog } from "@/lib/firestore/activity-logs";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (
    !session?.user?.id ||
    (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const printers = await getAllPrinters();
    return NextResponse.json({ printers });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (
    !session?.user?.id ||
    (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { name, location, inkPercentage, paperPercentage } = body;

    if (!name?.trim() || !location?.trim()) {
      return NextResponse.json(
        { error: "name and location are required" },
        { status: 400 }
      );
    }

    const printer = await createPrinter({
      name,
      location,
      inkPercentage: inkPercentage !== undefined ? Number(inkPercentage) : 100,
      paperPercentage: paperPercentage !== undefined ? Number(paperPercentage) : 100,
    });

    await createActivityLog({
      adminId: session.user.id,
      action: "PRINTER_ADDED",
      targetId: printer.id,
      details: `Added printer: ${name} at ${location}`,
    });

    return NextResponse.json({ printer }, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
