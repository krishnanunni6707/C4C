/**
 * GET /api/locations/status
 *
 * Returns live aggregate status for each active location:
 * - queueAhead count
 * - printersOnline / printersTotal
 * - estWaitMinutes
 * - loadPercent
 * - openTime / closeTime
 *
 * Auth: any authenticated user (STUDENT, ADMIN, SUPER_ADMIN).
 * Security: Contains ONLY aggregate counts — strictly zero student PII or file data.
 */

import { NextResponse } from "next/server";
import { requireRole, NO_CACHE_HEADERS } from "@/lib/api/guards";
import { getActiveLocations } from "@/lib/firestore/locations";
import { getAllPrinters } from "@/lib/firestore/printers";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import {
  calculateEstWaitMinutes,
  calculateLoadPercent,
} from "@/lib/location-status";

export const dynamic = "force-dynamic";

export interface LocationStatusItem {
  locationId: string;
  queueAhead: number;
  printersOnline: number;
  printersTotal: number;
  estWaitMinutes: number | null;
  loadPercent: number;
  openTime?: string;
  closeTime?: string;
}

export async function GET() {
  const guard = await requireRole(["STUDENT", "ADMIN", "SUPER_ADMIN"]);
  if (!guard.ok) return guard.response;

  try {
    const [locations, printers] = await Promise.all([
      getActiveLocations(),
      getAllPrinters(),
    ]);

    const statuses: LocationStatusItem[] = await Promise.all(
      locations.map(async (loc) => {
        // Count jobs in WAITING or PRINTING states for this location
        let queueAhead = 0;
        try {
          const countSnap = await adminDb
            .collection(COLLECTIONS.PRINT_JOBS)
            .where("locationId", "==", loc.id)
            .where("status", "in", ["WAITING", "PRINTING"])
            .count()
            .get();
          queueAhead = countSnap.data().count;
        } catch (err) {
          console.warn(`[locations/status] count aggregation failed for ${loc.id}:`, err);
        }

        // Match printers by name or id (noting that printers.location is currently free-text)
        const matchingPrinters = printers.filter(
          (p) => p.location === loc.name || p.location === loc.id
        );
        const printersTotal = matchingPrinters.length;
        const printersOnline = matchingPrinters.filter(
          (p) => p.status === "ONLINE"
        ).length;

        const estWaitMinutes = calculateEstWaitMinutes(queueAhead, printersOnline);
        const loadPercent = calculateLoadPercent(queueAhead, printersOnline);

        return {
          locationId: loc.id,
          queueAhead,
          printersOnline,
          printersTotal,
          estWaitMinutes,
          loadPercent,
          ...(loc.openTime ? { openTime: loc.openTime } : {}),
          ...(loc.closeTime ? { closeTime: loc.closeTime } : {}),
        };
      })
    );

    return NextResponse.json(
      { statuses, locations: statuses },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (e: unknown) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
