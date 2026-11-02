"use client";

/**
 * RazorpayPaymentModal (Backward-compatibility wrapper)
 * Re-exports the modular PaymentModal from @/components/payment/PaymentModal.
 */

import PaymentModal from "@/components/payment/PaymentModal";
import type {
  JobDetails,
  UserSessionDetails,
  PaymentSuccessInfo,
  PaymentModalProps,
  PricingBreakdown,
  PaymentModalState,
} from "@/components/payment/types";

export type {
  JobDetails,
  UserSessionDetails,
  PaymentSuccessInfo,
  PaymentModalProps as RazorpayPaymentModalProps,
  PricingBreakdown,
  PaymentModalState,
};

export default PaymentModal;
export { PaymentModal as RazorpayPaymentModal };
