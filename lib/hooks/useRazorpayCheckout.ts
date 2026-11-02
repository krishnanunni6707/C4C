"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type {
  RazorpayOptions,
  RazorpayResponse,
  RazorpayPaymentFailedResponse,
} from "@/types/razorpay";

// ── Pure Helpers ─────────────────────────────────────────────────────────────

/**
 * Converts a rupee amount to integer paise, avoiding floating point rounding errors.
 */
export function amountToPaise(rupees: number): number {
  if (typeof rupees !== "number" || isNaN(rupees) || rupees < 0) {
    return 0;
  }
  return Math.round(rupees * 100);
}

export interface BuildRazorpayOptionsParams {
  key: string;
  orderId: string;
  amountRupees: number;
  description?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  onSuccess: (response: RazorpayResponse) => void | Promise<void>;
  onDismiss?: () => void;
  image?: string;
  themeColor?: string;
}

/**
 * Builds the sanitized Razorpay options object.
 */
export function buildRazorpayOptions({
  key,
  orderId,
  amountRupees,
  description = "Campus Print Job",
  prefill,
  onSuccess,
  onDismiss,
  image = "/logo.png",
  themeColor = "#4F46E5",
}: BuildRazorpayOptionsParams): RazorpayOptions {
  return {
    key: key.trim(),
    amount: amountToPaise(amountRupees),
    currency: "INR",
    name: "Campus Print Hub",
    description,
    image,
    order_id: orderId,
    handler: onSuccess,
    prefill: {
      name: prefill?.name?.trim() || undefined,
      email: prefill?.email?.trim() || undefined,
      contact: prefill?.contact?.trim() || undefined,
    },
    theme: {
      color: themeColor,
    },
    modal: {
      ondismiss: onDismiss,
      escape: true,
      backdropclose: false,
      confirm_close: true,
    },
  };
}

// ── Hook Definition ──────────────────────────────────────────────────────────

export type CheckoutStatus = "idle" | "loading_script" | "ready" | "opening" | "open" | "failed";

export interface OpenCheckoutParams {
  orderId: string;
  amountRupees: number;
  description?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  onSuccess: (response: RazorpayResponse) => void | Promise<void>;
  onDismiss?: () => void;
  onFailure?: (errorDescription: string) => void;
}

export function useRazorpayCheckout() {
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<CheckoutStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const isOpeningRef = useRef(false);
  const isOpenRef = useRef(false);

  // Script Loader with Single-load Guard
  const loadScript = useCallback(() => {
    if (typeof window === "undefined") return;

    if (window.Razorpay) {
      setReady(true);
      setStatus("ready");
      setError(null);
      return;
    }

    const SCRIPT_ID = "razorpay-checkout-script";
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      if (window.Razorpay) {
        setReady(true);
        setStatus("ready");
        setError(null);
      } else {
        existing.addEventListener("load", () => {
          setReady(true);
          setStatus("ready");
          setError(null);
        });
        existing.addEventListener("error", () => {
          setError("Could not load payment gateway. Check your connection and retry.");
          setStatus("failed");
        });
      }
      return;
    }

    setStatus("loading_script");
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;

    script.onload = () => {
      setReady(true);
      setStatus("ready");
      setError(null);
    };

    script.onerror = () => {
      setError("Could not load payment gateway. Check your connection and retry.");
      setStatus("failed");
    };

    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    loadScript();
  }, [loadScript]);

  const reloadScript = useCallback(() => {
    if (typeof window === "undefined") return;
    const SCRIPT_ID = "razorpay-checkout-script";
    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      existing.remove();
    }
    setError(null);
    loadScript();
  }, [loadScript]);

  const open = useCallback(
    async (params: OpenCheckoutParams) => {
      // Double-tap and concurrent checkout protection
      if (isOpeningRef.current || isOpenRef.current) {
        return;
      }

      setError(null);

      const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      if (!key) {
        const msg = "Payment is not configured";
        if (process.env.NODE_ENV !== "production") {
          console.error("[useRazorpayCheckout] NEXT_PUBLIC_RAZORPAY_KEY_ID is missing");
        }
        setError(msg);
        params.onFailure?.(msg);
        return;
      }

      if (!window.Razorpay) {
        const msg = "Payment gateway is still loading. Please wait a moment.";
        setError(msg);
        params.onFailure?.(msg);
        return;
      }

      try {
        isOpeningRef.current = true;
        setStatus("opening");

        const options = buildRazorpayOptions({
          key,
          orderId: params.orderId,
          amountRupees: params.amountRupees,
          description: params.description,
          prefill: params.prefill,
          onSuccess: async (response) => {
            isOpenRef.current = false;
            isOpeningRef.current = false;
            setStatus("idle");
            await params.onSuccess(response);
          },
          onDismiss: () => {
            isOpenRef.current = false;
            isOpeningRef.current = false;
            setStatus("ready");
            params.onDismiss?.();
          },
        });

        const rzp = new window.Razorpay(options);

        rzp.on("payment.failed", (failRes: RazorpayPaymentFailedResponse) => {
          isOpenRef.current = false;
          isOpeningRef.current = false;
          setStatus("failed");
          const failMsg =
            failRes.error?.description || "Payment failed. Please try again.";
          setError(failMsg);
          params.onFailure?.(failMsg);
        });

        isOpenRef.current = true;
        setStatus("open");
        rzp.open();
      } catch (err: unknown) {
        isOpenRef.current = false;
        isOpeningRef.current = false;
        setStatus("failed");
        const msg =
          err instanceof Error ? err.message : "Failed to open payment gateway.";
        setError(msg);
        params.onFailure?.(msg);
      } finally {
        isOpeningRef.current = false;
      }
    },
    []
  );

  return {
    ready,
    isOpening: status === "opening" || status === "open",
    status,
    error,
    setError,
    open,
    reloadScript,
    resetError: () => setError(null),
  };
}
