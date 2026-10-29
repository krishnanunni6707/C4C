import React from "react";
import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import RazorpayPaymentModal from "@/components/student/RazorpayPaymentModal";

describe("P-02: RazorpayPaymentModal Production Security", () => {
  const baseProps = {
    isOpen: true,
    onClose: () => {},
    amount: 15,
    orderId: "order_123456",
    jobDetails: {
      fileName: "Thesis.pdf",
      pages: 10,
      copies: 1,
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
    process.env.NEXT_PUBLIC_PAYMENT_TEST_MODE = "1"; // even if set, production overrides

    const html = renderToString(<RazorpayPaymentModal {...baseProps} />);

    // Assert live pay button is rendered
    expect(html).toContain("pay-live-button");

    // Assert simulation elements are NOT rendered at all
    expect(html).not.toContain("simulate-section");
    expect(html).not.toContain("simulate-success-button");
    expect(html).not.toContain("simulate-failure-button");
    expect(html).not.toContain("Simulate Payment");
    expect(html).not.toContain("Test Mode Only");

    // @ts-expect-error restore
    process.env.NODE_ENV = prevNodeEnv;
    process.env.NEXT_PUBLIC_PAYMENT_TEST_MODE = prevTestMode;
  });

  it("does NOT render simulate buttons in development when PAYMENT_TEST_MODE is not 1", () => {
    const prevNodeEnv = process.env.NODE_ENV;
    const prevTestMode = process.env.NEXT_PUBLIC_PAYMENT_TEST_MODE;

    // @ts-expect-error mutating for test
    process.env.NODE_ENV = "development";
    delete process.env.NEXT_PUBLIC_PAYMENT_TEST_MODE;

    const html = renderToString(<RazorpayPaymentModal {...baseProps} />);

    expect(html).not.toContain("simulate-section");
    expect(html).not.toContain("simulate-success-button");
    expect(html).not.toContain("Simulate Payment");

    // @ts-expect-error restore
    process.env.NODE_ENV = prevNodeEnv;
    process.env.NEXT_PUBLIC_PAYMENT_TEST_MODE = prevTestMode;
  });

  it("renders simulate buttons only when in dev AND NEXT_PUBLIC_PAYMENT_TEST_MODE is 1", () => {
    const prevNodeEnv = process.env.NODE_ENV;
    const prevTestMode = process.env.NEXT_PUBLIC_PAYMENT_TEST_MODE;

    // @ts-expect-error mutating for test
    process.env.NODE_ENV = "development";
    process.env.NEXT_PUBLIC_PAYMENT_TEST_MODE = "1";

    const html = renderToString(<RazorpayPaymentModal {...baseProps} />);

    expect(html).toContain("simulate-section");
    expect(html).toContain("simulate-success-button");
    expect(html).toContain("simulate-failure-button");

    // @ts-expect-error restore
    process.env.NODE_ENV = prevNodeEnv;
    process.env.NEXT_PUBLIC_PAYMENT_TEST_MODE = prevTestMode;
  });
});
