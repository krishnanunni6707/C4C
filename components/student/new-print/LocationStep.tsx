"use client";

import React, { useEffect, useCallback, useMemo } from "react";
import { Info, AlertCircle } from "lucide-react";
import type { PrintLocation } from "@/app/student/page";
import type { LocationStatusItem } from "@/app/api/locations/status/route";
import LocationCard from "./LocationCard";
import LocationSkeletonCard from "./LocationSkeletonCard";
import { getOpenState } from "@/lib/location-status";
import { motion, useReducedMotion } from "framer-motion";

interface LocationStepProps {
  locations: PrintLocation[];
  statuses: Record<string, LocationStatusItem>;
  selectedLocationId: string;
  onSelectLocation: (locationId: string) => void;
  onProceed?: () => void;
  loading?: boolean;
  error?: string | null;
}

export default function LocationStep({
  locations,
  statuses,
  selectedLocationId,
  onSelectLocation,
  onProceed,
  loading = false,
  error = null,
}: LocationStepProps) {
  const now = useMemo(() => new Date(), []);

  // Filter open locations vs closed
  const isLocationOpen = useCallback(
    (loc: PrintLocation) => {
      const st = statuses[loc.id];
      const openTime = st?.openTime ?? loc.openTime;
      const closeTime = st?.closeTime ?? loc.closeTime;
      const state = getOpenState(now, openTime, closeTime);
      return state !== "closed";
    },
    [statuses, now]
  );

  const allClosed =
    locations.length > 0 && locations.every((l) => !isLocationOpen(l));

  // If the currently selected location is closed, automatically select the first open one
  useEffect(() => {
    if (locations.length === 0) return;
    const currentLoc = locations.find((l) => l.id === selectedLocationId);
    if (!currentLoc || !isLocationOpen(currentLoc)) {
      const firstOpen = locations.find((l) => isLocationOpen(l));
      if (firstOpen) {
        onSelectLocation(firstOpen.id);
      }
    }
  }, [locations, selectedLocationId, isLocationOpen, onSelectLocation]);

  // Arrow key navigation across the radiogroup
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (locations.length === 0) return;
    const availableLocs = locations.filter((l) => isLocationOpen(l));
    if (availableLocs.length === 0) return;

    const currentIndex = availableLocs.findIndex(
      (l) => l.id === selectedLocationId
    );

    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % availableLocs.length;
      onSelectLocation(availableLocs[nextIndex].id);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      const prevIndex =
        (currentIndex - 1 + availableLocs.length) % availableLocs.length;
      onSelectLocation(availableLocs[prevIndex].id);
    }
  };

  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="space-y-6">
      {/* All Closed Error Banner */}
      {allClosed && (
        <div
          role="alert"
          className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3.5 rounded-xl text-sm font-medium flex items-center gap-3"
        >
          <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
          <span>All print locations are currently closed.</span>
        </div>
      )}

      {/* API Failure Notice */}
      {error && (
        <div
          role="alert"
          className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2.5"
        >
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>
            Unable to refresh live status. Showing last known queue estimates.
          </span>
        </div>
      )}

      {/* Locations Radiogroup Grid */}
      <div
        role="radiogroup"
        aria-label="Print location"
        onKeyDown={handleKeyDown}
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-stretch"
      >
        {loading ? (
          <>
            <LocationSkeletonCard />
            <LocationSkeletonCard />
            <LocationSkeletonCard />
          </>
        ) : locations.length === 0 ? (
          <div className="col-span-full bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 text-sm">
            No active print locations available at this time.
          </div>
        ) : (
          locations.map((loc, idx) => (
            <motion.div
              key={loc.id}
              initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: shouldReduceMotion ? 0 : 0.25,
                delay: shouldReduceMotion ? 0 : idx * 0.06,
              }}
              className="h-full flex flex-col"
            >
              <LocationCard
                location={loc}
                status={statuses[loc.id]}
                isSelected={loc.id === selectedLocationId}
                onSelect={onSelectLocation}
                onProceed={onProceed}
                now={now}
              />
            </motion.div>
          ))
        )}
      </div>

      {/* Info Strip */}
      <div className="bg-indigo-50/80 border border-indigo-100/80 rounded-xl px-4 py-3.5 flex items-center gap-2.5 text-[13px] text-indigo-700 font-medium shadow-sm">
        <Info className="w-4 h-4 text-indigo-600 flex-shrink-0" />
        <span>
          Queue length and wait time are estimates and may vary based on printing
          volume.
        </span>
      </div>
    </div>
  );
}
