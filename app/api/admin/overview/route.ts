/**
 * GET /api/admin/overview
 * Read-only aggregation endpoint for System Overview.
 *
 * Checks session role (ADMIN or SUPER_ADMIN).
 * Forces locationId = session.user.locationId for ADMIN.
 * Validates query with Zod.
 * Aggregates in a single pass over printJobs.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, NO_CACHE_HEADERS } from "@/lib/api/guards";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS, FirestorePrintJob, FirestoreUser } from "@/lib/firebase/collections";
import { getAllPrinters } from "@/lib/firestore/printers";
import { getRecentActivityLogs } from "@/lib/firestore/activity-logs";
import { getLocationById, getAllLocations } from "@/lib/firestore/locations";
import { aggregateOverviewData, OverviewRange } from "@/lib/admin/overview";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  range: z.enum(["today", "7d", "30d", "90d"]).default("7d"),
  locationId: z.string().optional().nullable(),
});

export async function GET(req: Request) {
  const guard = await requireAdmin(true);
  if (!guard.ok) return guard.response;

  const session = guard.session;
  const isSuperAdmin = session.user.role === "SUPER_ADMIN";

  try {
    const url = new URL(req.url);
    const rawRange = url.searchParams.get("range") || "7d";
    const rawLocationId = url.searchParams.get("locationId");

    const parsed = querySchema.safeParse({
      range: rawRange,
      locationId: rawLocationId || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", issues: parsed.error.issues },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const range = parsed.data.range as OverviewRange;

    // Enforce location scoping: ADMIN sees ONLY their own locationId
    let effectiveLocationId: string | null = null;
    if (!isSuperAdmin) {
      effectiveLocationId = session.user.locationId ?? null;
    } else if (parsed.data.locationId && parsed.data.locationId !== "all") {
      effectiveLocationId = parsed.data.locationId;
    }

    // Resolve location name if filtered
    let locationName: string | null = null;
    let locationBuilding: string | null = null;
    if (effectiveLocationId) {
      const loc = await getLocationById(effectiveLocationId);
      locationName = loc?.name ?? null;
      locationBuilding = loc?.building ?? null;
    }

    const now = new Date();
    // Determine boundary for jobs fetch: fetch up to 2x window for week-over-week deltas
    let daysToFetch = 14; // Default for 7d and today
    if (range === "30d") daysToFetch = 60;
    if (range === "90d") daysToFetch = 180;

    const startBoundary = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysToFetch);

    // Build query
    let query: FirebaseFirestore.Query = adminDb
      .collection(COLLECTIONS.PRINT_JOBS)
      .where("createdAt", ">=", startBoundary);

    if (effectiveLocationId) {
      query = query.where("locationId", "==", effectiveLocationId);
    }

    // Fetch jobs, printers, logs, and locations in parallel
    const [jobsSnap, printers, logs, allLocations] = await Promise.all([
      query.get(),
      getAllPrinters(),
      getRecentActivityLogs(10),
      getAllLocations(),
    ]);

    const jobs = jobsSnap.docs.map((d) => ({ ...d.data(), id: d.id } as FirestorePrintJob));

    // Filter printers if locationId is set
    const filteredPrinters = effectiveLocationId
      ? printers.filter((p) => !p.location || p.location === locationName || p.location === effectiveLocationId)
      : printers;

    // Build admin ID -> name map
    const adminIds = Array.from(new Set(logs.map((l) => l.adminId).filter(Boolean)));
    const adminNameMap: Record<string, string> = {
      [session.user.id]: session.user.name ?? "Admin",
    };

    if (adminIds.length > 0) {
      const usersSnap = await adminDb
        .collection(COLLECTIONS.USERS)
        .where("id", "in", adminIds.slice(0, 10))
        .get()
        .catch(() => null);

      if (usersSnap) {
        for (const doc of usersSnap.docs) {
          const u = doc.data() as FirestoreUser;
          if (u.name) adminNameMap[u.id] = u.name;
        }
      }
    }

    const overview = aggregateOverviewData({
      jobs,
      printers: filteredPrinters.length > 0 ? filteredPrinters : printers,
      activityLogs: logs,
      adminNameMap,
      range,
      locationId: effectiveLocationId,
      locationName,
      now,
    });

    return NextResponse.json(
      {
        ...overview,
        allLocations: allLocations.map((l) => ({
          id: l.id,
          name: l.name,
          building: l.building ?? "",
          floor: l.floor ?? "",
          isActive: l.isActive,
        })),
        locationBuilding,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    logger.error("Admin overview aggregation failed:", error);
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
