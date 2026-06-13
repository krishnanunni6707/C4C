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
    if (body.bwSingleSidedPrice !== undefined)
      allowed.bwSingleSidedPrice = Number(body.bwSingleSidedPrice);
    if (body.bwDoubleSidedPrice !== undefined)
      allowed.bwDoubleSidedPrice = Number(body.bwDoubleSidedPrice);
    if (body.colorSingleSidedPrice !== undefined)
      allowed.colorSingleSidedPrice = Number(body.colorSingleSidedPrice);
    if (body.colorDoubleSidedPrice !== undefined)
      allowed.colorDoubleSidedPrice = Number(body.colorDoubleSidedPrice);
    if (body.tokenCharge !== undefined)
      allowed.tokenCharge = Number(body.tokenCharge);

    // Legacy fields — keep accepting so old data isn't lost
    if (body.bwPricePerSheet !== undefined)
      allowed.bwPricePerSheet = Number(body.bwPricePerSheet);
    if (body.colorPricePerSheet !== undefined)
      allowed.colorPricePerSheet = Number(body.colorPricePerSheet);

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
