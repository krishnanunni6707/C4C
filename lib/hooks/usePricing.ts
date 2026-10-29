"use client";

import { useState, useEffect, useMemo } from "react";
import { computeAmount } from "@/lib/pricing";

export interface PricingSettings {
  bwSingleSidedPrice: number;
  bwDoubleSidedPrice: number;
  colorSingleSidedPrice: number;
  colorDoubleSidedPrice: number;
}

export interface UsePricingOptions {
  pagesCount: number;
  copies: number;
  colorMode: "BW" | "COLOR";
  printType: "single-sided" | "double-sided";
  initialPricing?: PricingSettings;
}

export const DEFAULT_PRICING: PricingSettings = {
  bwSingleSidedPrice: 2,
  bwDoubleSidedPrice: 3,
  colorSingleSidedPrice: 5,
  colorDoubleSidedPrice: 8,
};

export function usePricing({
  pagesCount,
  copies,
  colorMode,
  printType,
  initialPricing = DEFAULT_PRICING,
}: UsePricingOptions) {
  const [pricing, setPricing] = useState<PricingSettings>(initialPricing);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (isMounted && d?.pricing) {
          setPricing(d.pricing);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const isDuplex = printType === "double-sided";
  const sheetsCount = isDuplex ? Math.ceil(pagesCount / 2) : pagesCount;
  const pricePerSheet =
    colorMode === "COLOR"
      ? isDuplex ? pricing.colorDoubleSidedPrice : pricing.colorSingleSidedPrice
      : isDuplex ? pricing.bwDoubleSidedPrice    : pricing.bwSingleSidedPrice;

  const estimatedCost = useMemo(() => {
    if (pagesCount === 0) return 0;
    try {
      const res = computeAmount({
        pages: pagesCount,
        copies,
        colorMode,
        printType,
        settings: pricing,
      });
      return res.totalRupees;
    } catch {
      return 0;
    }
  }, [pagesCount, copies, colorMode, printType, pricing]);

  return {
    pricing,
    setPricing,
    loading,
    isDuplex,
    sheetsCount,
    pricePerSheet,
    estimatedCost,
  };
}
