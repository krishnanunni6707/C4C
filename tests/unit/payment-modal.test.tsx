import React from "react";
import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import RazorpayPaymentModal from "@/components/student/RazorpayPaymentModal";
import PaymentStatusView from "@/components/payment/PaymentStatusView";
import OrderBreakdown from "@/components/payment/OrderBreakdown";
import PaymentMethodsRow from "@/components/payment/PaymentMethodsRow";

describe("P-02: RazorpayPaymentModal Redesign & Production Security", () => {
  const baseProps = {
    isOpen: true,
    onClose: () => {},
    amount: 68,
    orderId: "order_123456",
    jobDetails: {
      fileName: "Thesis.pdf",
      pages: 24,
      copies: 2,
      locationName: "Library Print Hub",
      colorMode: "BW",
      printType: "SINGLE",
    },
    user: {
      name: "John Doe",
      email: "john@campus.edu",
      admissionNumber: "ADM100",
    },
    onSuccess: () => {},
  };

  it("does NOT render any simulate path or buttons in production mode", () => {
    const prevNodeEnv = process.env.NODE_ENV;
    const prevTestMode = process.env.NEXT_PUBLIC_PAYMENT_TEST_MODE;

    // @ts-expect-error mutating for test
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_PAYMENT_TEST_MODE = "1";

    const html = renderToString(<RazorpayPaymentModal {...baseProps} />);

    // Assert live pay button and title are rendered
    expect(html).toContain("Complete payment");
    expect(html).toContain("Pay securely");
    expect(html).toContain("Secured by Razorpay");

    // Assert simulation elements are NEVER rendered
    expect(html).not.toContain("simulate-section");
    expect(html).not.toContain("simulate-success-button");
    expect(html).not.toContain("simulate-failure-button");
    expect(html).not.toContain("Simulate Payment");
    expect(html).not.toContain("Test Mode Only");

    // @ts-expect-error restore
    process.env.NODE_ENV = prevNodeEnv;
    process.env.NEXT_PUBLIC_PAYMENT_TEST_MODE = prevTestMode;
  });

  it("does NOT render any simulate buttons in development even if PAYMENT_TEST_MODE is 1", () => {
    const prevNodeEnv = process.env.NODE_ENV;
    const prevTestMode = process.env.NEXT_PUBLIC_PAYMENT_TEST_MODE;

    // @ts-expect-error mutating for test
    process.env.NODE_ENV = "development";
    process.env.NEXT_PUBLIC_PAYMENT_TEST_MODE = "1";

    const html = renderToString(<RazorpayPaymentModal {...baseProps} />);

    expect(html).not.toContain("simulate-section");
    expect(html).not.toContain("simulate-success-button");
    expect(html).not.toContain("simulate-failure-button");
    expect(html).not.toContain("Simulate Payment");

    // @ts-expect-error restore
    process.env.NODE_ENV = prevNodeEnv;
    process.env.NEXT_PUBLIC_PAYMENT_TEST_MODE = prevTestMode;
  });

  it("renders order breakdown with pages, copies, rate, subtotal, and total", () => {
    const breakdown = {
      pages: 24,
      copies: 2,
      rateLabel: "Rate (B/W)",
      ratePerSheet: 2.0,
      subtotal: 48.0,
      tokenCharge: 1.0,
      total: 68.0,
    };

    const html = renderToString(<OrderBreakdown breakdown={breakdown} />);

    expect(html).toContain("Pages");
    expect(html).toContain("24");
    expect(html).toContain("Copies");
    expect(html).toContain("2");
    expect(html).toContain("Rate (B/W)");
    expect(html).toContain("2.00");
    expect(html).toContain("/ sheet");
    expect(html).toContain("Subtotal");
    expect(html).toContain("48.00");
    expect(html).toContain("Token charge");
    expect(html).toContain("1.00");
    expect(html).toContain("Total amount");
    expect(html).toContain("68.00");
  });

  it("renders all supported payment method badges (UPI, VISA, Mastercard, RuPay)", () => {
    const html = renderToString(<PaymentMethodsRow />);

    expect(html).toContain("UPI");
    expect(html).toContain("VISA");
    expect(html).toContain("Mastercard");
    expect(html).toContain("RuPay");
  });

  it("renders unavailable state with required copy when gateway is not configured", () => {
    const html = renderToString(
      <PaymentStatusView
        state="unavailable"
        onRetry={() => {}}
        onClose={() => {}}
      />
    );

    expect(html).toContain("Payment unavailable");
    expect(html).toContain("Payment is unavailable right now. Please try again later.");
    expect(html).toContain("Close");
  });

  it("renders processing state with dual-ring spinner message", () => {
    const html = renderToString(
      <PaymentStatusView
        state="processing"
        onRetry={() => {}}
        onClose={() => {}}
      />
    );

    expect(html).toContain("Confirming your payment…");
    expect(html).toContain("Please don&#x27;t close this window.");
  });

  it("renders success state with token pill and action buttons", () => {
    const html = renderToString(
      <PaymentStatusView
        state="success"
        tokenNumber="RP1042"
        jobId="job_789"
        queueAheadCount={3}
        estimatedWaitMinutes={5}
        onRetry={() => {}}
        onClose={() => {}}
      />
    );

    expect(html).toContain("Payment successful!");
    expect(html).toContain("RP1042");
    expect(html).toContain("ahead");
    expect(html).toContain("min");
    expect(html).toContain("View token slip");
    expect(html).toContain("Back to home");
  });

  it("renders failure state with error message and retry button", () => {
    const html = renderToString(
      <PaymentStatusView
        state="failure"
        errorMessage="Bank server timed out."
        onRetry={() => {}}
        onClose={() => {}}
      />
    );

    expect(html).toContain("Payment failed");
    expect(html).toContain("Bank server timed out.");
    expect(html).toContain("Try again");
    expect(html).toContain("Close");
  });
});
