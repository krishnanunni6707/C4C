import { describe, it, expect, vi } from "vitest";
import {
  amountToPaise,
  buildRazorpayOptions,
} from "@/lib/hooks/useRazorpayCheckout";

describe("Razorpay Checkout Pure Helpers", () => {
  describe("amountToPaise", () => {
    it("converts standard rupee amounts to integer paise", () => {
      expect(amountToPaise(100)).toBe(10000);
      expect(amountToPaise(68)).toBe(6800);
      expect(amountToPaise(1)).toBe(100);
    });

    it("handles decimal amounts correctly without floating-point errors", () => {
      expect(amountToPaise(10.5)).toBe(1050);
      expect(amountToPaise(72.99)).toBe(7299);
      expect(amountToPaise(0.01)).toBe(1);
      expect(amountToPaise(19.99)).toBe(1999);
    });

    it("handles zero and invalid inputs safely", () => {
      expect(amountToPaise(0)).toBe(0);
      expect(amountToPaise(-15)).toBe(0);
      expect(amountToPaise(NaN)).toBe(0);
      // @ts-expect-error test invalid type
      expect(amountToPaise(null)).toBe(0);
    });
  });

  describe("buildRazorpayOptions", () => {
    it("builds a complete options object with integer paise and default theme", () => {
      const onSuccess = vi.fn();
      const onDismiss = vi.fn();

      const options = buildRazorpayOptions({
        key: "rzp_test_1234567890",
        orderId: "order_test_9876",
        amountRupees: 68.5,
        description: "Campus Print Hub Job",
        prefill: {
          name: "Aarav Nair",
          email: "aarav@campus.edu",
          contact: "+919876543210",
        },
        onSuccess,
        onDismiss,
      });

      expect(options.key).toBe("rzp_test_1234567890");
      expect(options.order_id).toBe("order_test_9876");
      expect(options.amount).toBe(6850);
      expect(options.currency).toBe("INR");
      expect(options.name).toBe("Campus Print Hub");
      expect(options.description).toBe("Campus Print Hub Job");
      expect(options.theme?.color).toBe("#4F46E5");
      expect(options.prefill?.name).toBe("Aarav Nair");
      expect(options.prefill?.email).toBe("aarav@campus.edu");
      expect(options.prefill?.contact).toBe("+919876543210");
      expect(options.modal?.ondismiss).toBe(onDismiss);
      expect(options.modal?.escape).toBe(true);
      expect(options.modal?.backdropclose).toBe(false);
      expect(options.handler).toBe(onSuccess);
    });

    it("sanitizes whitespace and omits blank prefill values", () => {
      const onSuccess = vi.fn();

      const options = buildRazorpayOptions({
        key: "  rzp_test_spaced  ",
        orderId: "order_123",
        amountRupees: 10,
        prefill: {
          name: "   ",
          email: "",
          contact: undefined,
        },
        onSuccess,
      });

      expect(options.key).toBe("rzp_test_spaced");
      expect(options.prefill?.name).toBeUndefined();
      expect(options.prefill?.email).toBeUndefined();
      expect(options.prefill?.contact).toBeUndefined();
    });
  });
});
