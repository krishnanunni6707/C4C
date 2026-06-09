/**
 * GET /api/firebase-init
 *
 * Seeds Firestore with default settings and verifies write access
 * to all required collections.
 *
 * Safe to call multiple times — existing documents are not overwritten.
 * Remove or protect this route before going to production.
 */

import { NextResponse } from "next/server";
import { initFirestore } from "@/lib/firebase/init-firestore";

export async function GET() {
  const result = await initFirestore();

  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}
