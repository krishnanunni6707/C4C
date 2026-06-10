/**
 * GET  /api/admin/settings  — return current settings document
 * PATCH /api/admin/settings — merge-update settings document
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSettings, updateSettings } from "@/lib/firestore/settings";
import { createActivityLog } from "@/lib/firestore/activity-logs";

export const dynamic = "force-dynamic";

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET() {
  const session = await getServerSession(authOptions);
  if (
    !session?.user?.id ||
    (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const settings = await getSettings();
    return NextResponse.json({ settings });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}

// ── PATCH ─────────────────────────────────────────────────────────────────────

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (
    !session?.user?.id ||
    (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    // Only allow the fields this phase manages — strip everything else
    const allowed: Record<string, unknown> = {};

    // Pricing
    if (body.bwPricePerSheet !== undefined)
      allowed.bwPricePerSheet = Number(body.bwPricePerSheet);
    if (body.colorPricePerSheet !== undefined)
      allowed.colorPricePerSheet = Number(body.colorPricePerSheet);
    if (body.tokenCharge !== undefined)
      allowed.tokenCharge = Number(body.tokenCharge);

    // Payment
    if (body.upiId !== undefined) allowed.upiId = String(body.upiId).trim();
    if (body.merchantName !== undefined)
      allowed.merchantName = String(body.merchantName).trim();
    if (body.qrCodeImageUrl !== undefined)
      allowed.qrCodeImageUrl = String(body.qrCodeImageUrl).trim();

    if (Object.keys(allowed).length === 0) {
      return NextResponse.json(
        { error: "No valid fields provided" },
        { status: 400 }
      );
    }

    await updateSettings(allowed);

    await createActivityLog({
      adminId: session.user.id,
      action: "SETTINGS_UPDATED",
      targetId: "systemSettings",
      details: `Updated: ${Object.keys(allowed).join(", ")}`,
    });

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}
