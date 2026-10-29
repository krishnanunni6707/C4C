/**
 * GET /api/settings
 * Returns the pricing fields only — accessible to any authenticated user.
 */
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/guards";
import { getSettings } from "@/lib/firestore/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireRole(["STUDENT", "ADMIN", "SUPER_ADMIN"]);
  if (!guard.ok) return guard.response;

  try {
    const s = await getSettings();
    return NextResponse.json({
      pricing: {
        bwSingleSidedPrice:    s.bwSingleSidedPrice    ?? s.bwPricePerSheet    ?? 2,
        bwDoubleSidedPrice:    s.bwDoubleSidedPrice    ?? s.bwPricePerSheet    ?? 3,
        colorSingleSidedPrice: s.colorSingleSidedPrice ?? s.colorPricePerSheet ?? 5,
        colorDoubleSidedPrice: s.colorDoubleSidedPrice ?? s.colorPricePerSheet ?? 8,
        tokenCharge:           s.tokenCharge           ?? 1,
      },
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
