export interface JobDetails {
  fileName: string;
  pages: number;
  copies: number;
  locationName: string;
  colorMode: string;
  printType: string;
}

export interface UserSessionDetails {
  name?: string | null;
  email?: string | null;
  admissionNumber?: string | null;
}

export interface PaymentSuccessInfo {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
}

export interface PricingBreakdown {
  pages: number;
  copies: number;
  rateLabel: string;
  ratePerSheet: number;
  subtotal: number;
  tokenCharge: number;
  total: number;
}

export type PaymentModalState =
  | "idle"
  | "opening_checkout"
  | "processing"
  | "success"
  | "failure"
  | "unavailable";

export interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  orderId?: string;
  jobDetails: JobDetails;
  user?: UserSessionDetails;
  onSuccess: (paymentInfo: PaymentSuccessInfo) => Promise<{ tokenNumber?: string; jobId?: string } | void> | void;
  onFailure?: (errorMsg: string) => void;
  createDraftOrder?: () => Promise<{ orderId: string; amountPaise: number }>;
  pricingBreakdown?: PricingBreakdown;
  queueAheadCount?: number;
  estimatedWaitMinutes?: number;
  tokenNumber?: string;
  initialState?: PaymentModalState;
}

// ── Razorpay Script & Window Interfaces (Re-exported from canonical types/razorpay) ──

export type {
  RazorpayResponse,
  RazorpayOptions,
  RazorpayInstance,
  RazorpayPaymentFailedResponse,
} from "@/types/razorpay";

