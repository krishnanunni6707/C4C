"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import OverviewView from "@/components/admin/overview/OverviewView";
import type { OverviewData, OverviewRange } from "@/lib/admin/overview";

export default function AdminOverviewPage() {
  const searchParams = useSearchParams();
  const locationParam = searchParams ? searchParams.get("location") : null;

  const [range, setRange] = useState<OverviewRange>("7d");
  const [data, setData] = useState<OverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchOverview = useCallback(
    async (isBackground = false) => {
      if (!isBackground) setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ range });
        if (locationParam && locationParam !== "all") {
          params.set("locationId", locationParam);
        }

        const res = await fetch(`/api/admin/overview?${params.toString()}`, {
          cache: "no-store",
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${res.status}: Failed to load overview`);
        }

        const json: OverviewData = await res.json();
        setData(json);
        setLastRefreshed(new Date());
      } catch (err) {
        if (!isBackground) {
          setError(err instanceof Error ? err.message : "Could not load overview.");
        }
      } finally {
        if (!isBackground) setIsLoading(false);
      }
    },
    [range, locationParam]
  );

  useEffect(() => {
    fetchOverview(false);
  }, [fetchOverview]);

  useEffect(() => {
    const timer = setInterval(() => {
      fetchOverview(true);
    }, 15000);
    return () => clearInterval(timer);
  }, [fetchOverview]);

  return (
    <OverviewView
      data={data}
      range={range}
      onRangeChange={(newRange) => setRange(newRange)}
      isLoading={isLoading}
      error={error}
      onRetry={() => fetchOverview(false)}
      lastRefreshedText={
        lastRefreshed
          ? `Updated ${lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
          : "Updated just now"
      }
    />
  );
}
