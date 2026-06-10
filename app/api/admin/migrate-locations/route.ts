/**
 * POST /api/admin/migrate-locations
 *
 * One-time migration that:
 * 1. Creates the default "Main Print Room" location (if it doesn't exist).
 * 2. Finds all printJobs that are missing a locationId field.
 * 3. Assigns those jobs to the default location.
 *
 * SUPER_ADMIN only. Safe to call multiple times (idempotent).
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import {
  ensureDefaultLocation,
  DEFAULT_LOCATION_ID,
  DEFAULT_LOCATION_NAME,
} from "@/lib/firestore/locations";
import { createActivityLog } from "@/lib/firestore/activity-logs";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Ensure the default location doc exists
    const defaultLocation = await ensureDefaultLocation();

    // 2. Find all jobs missing locationId
    const snap = await adminDb
      .collection(COLLECTIONS.PRINT_JOBS)
      .get();

    const orphaned = snap.docs.filter((d) => {
      const data = d.data();
      return !data.locationId;
    });

    // 3. Batch-write locationId + locationName onto orphaned jobs
    let patched = 0;
    const BATCH_SIZE = 400; // Firestore batch limit is 500

    for (let i = 0; i < orphaned.length; i += BATCH_SIZE) {
      const batch = adminDb.batch();
      orphaned.slice(i, i + BATCH_SIZE).forEach((doc) => {
        batch.update(doc.ref, {
          locationId: DEFAULT_LOCATION_ID,
          locationName: DEFAULT_LOCATION_NAME,
        });
      });
      await batch.commit();
      patched += Math.min(BATCH_SIZE, orphaned.length - i);
    }

    await createActivityLog({
      adminId: session.user.id,
      action: "MIGRATION_LOCATIONS",
      targetId: DEFAULT_LOCATION_ID,
      details: `Migration complete. Patched ${patched} orphaned jobs → "${DEFAULT_LOCATION_NAME}".`,
    });

    return NextResponse.json({
      success: true,
      defaultLocation,
      patchedJobs: patched,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Migration error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
