/**
 * GET /api/settings
 * Returns the pricing fields only — accessible to any authenticated user.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSettings } from "@/lib/firestore/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
