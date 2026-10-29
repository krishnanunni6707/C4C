import { describe, it, expect } from "vitest";
import { computeAmount } from "@/lib/pricing";

describe("lib/pricing - computeAmount", () => {
  const defaultSettings = {
    bwSingleSidedPrice: 2,
    bwDoubleSidedPrice: 3,
    colorSingleSidedPrice: 5,
    colorDoubleSidedPrice: 8,
    maxPagesPerJob: 200,
    maxCopies: 50,
  };

  it("calculates single-sided black & white correctly", () => {
    const result = computeAmount({
      pages: 5,
      copies: 1,
      colorMode: "BW",
      printType: "SINGLE",
      settings: defaultSettings,
    });
    expect(result.sheets).toBe(5);
    expect(result.pricePerSheetPaise).toBe(200);
    expect(result.totalPaise).toBe(1000);
    expect(result.totalRupees).toBe(10);
  });

  it("calculates double-sided black & white correctly with ceil(pages / 2)", () => {
    // 5 pages -> ceil(5/2) = 3 sheets
    const result = computeAmount({
      pages: 5,
      copies: 2,
      colorMode: "BW",
      printType: "DOUBLE",
      settings: defaultSettings,
    });
    expect(result.sheets).toBe(3);
    expect(result.pricePerSheetPaise).toBe(300);
    expect(result.totalPaise).toBe(3 * 2 * 300); // 1800 paise = 18 Rs
    expect(result.totalRupees).toBe(18);
  });

  it("handles UI printType format ('single-sided' and 'double-sided')", () => {
    const single = computeAmount({
      pages: 4,
      copies: 1,
      colorMode: "BW",
      printType: "single-sided",
      settings: defaultSettings,
    });
    expect(single.sheets).toBe(4);

    const double = computeAmount({
      pages: 4,
      copies: 1,
      colorMode: "BW",
      printType: "double-sided",
      settings: defaultSettings,
    });
    expect(double.sheets).toBe(2);
  });

  it("calculates color single-sided and double-sided correctly", () => {
    const colorSingle = computeAmount({
      pages: 3,
      copies: 1,
      colorMode: "COLOR",
      printType: "SINGLE",
      settings: defaultSettings,
    });
    expect(colorSingle.totalPaise).toBe(3 * 500); // 1500 paise

    const colorDouble = computeAmount({
      pages: 3,
      copies: 1,
      colorMode: "COLOR",
      printType: "DOUBLE",
      settings: defaultSettings,
    });
    expect(colorDouble.sheets).toBe(2);
    expect(colorDouble.totalPaise).toBe(2 * 800); // 1600 paise
  });

  it("rejects 0 pages", () => {
    expect(() =>
      computeAmount({
        pages: 0,
        copies: 1,
        colorMode: "BW",
        printType: "SINGLE",
        settings: defaultSettings,
      })
    ).toThrow(/Invalid page count/);
  });

  it("rejects negative pages", () => {
    expect(() =>
      computeAmount({
        pages: -5,
        copies: 1,
        colorMode: "BW",
        printType: "SINGLE",
        settings: defaultSettings,
      })
    ).toThrow(/Invalid page count/);
  });

  it("rejects fractional pages", () => {
    expect(() =>
      computeAmount({
        pages: 2.5,
        copies: 1,
        colorMode: "BW",
        printType: "SINGLE",
        settings: defaultSettings,
      })
    ).toThrow(/Invalid page count/);
  });

  it("rejects 0 or negative copies", () => {
    expect(() =>
      computeAmount({
        pages: 10,
        copies: 0,
        colorMode: "BW",
        printType: "SINGLE",
        settings: defaultSettings,
      })
    ).toThrow(/Invalid copies/);

    expect(() =>
      computeAmount({
        pages: 10,
        copies: -1,
        colorMode: "BW",
        printType: "SINGLE",
        settings: defaultSettings,
      })
    ).toThrow(/Invalid copies/);
  });

  it("rejects fractional copies", () => {
    expect(() =>
      computeAmount({
        pages: 10,
        copies: 1.5,
        colorMode: "BW",
        printType: "SINGLE",
        settings: defaultSettings,
      })
    ).toThrow(/Invalid copies/);
  });

  it("rejects huge page count exceeding maxPagesPerJob", () => {
    expect(() =>
      computeAmount({
        pages: 201,
        copies: 1,
        colorMode: "BW",
        printType: "SINGLE",
        settings: defaultSettings,
      })
    ).toThrow(/exceeds maximum allowed/);
  });

  it("rejects huge copies exceeding maxCopies", () => {
    expect(() =>
      computeAmount({
        pages: 10,
        copies: 51,
        colorMode: "BW",
        printType: "SINGLE",
        settings: defaultSettings,
      })
    ).toThrow(/exceeds maximum allowed/);
  });

  it("uses fallback rates if granular rates are not configured", () => {
    const result = computeAmount({
      pages: 2,
      copies: 1,
      colorMode: "BW",
      printType: "SINGLE",
      settings: {
        bwPricePerSheet: 3,
        colorPricePerSheet: 7,
      },
    });
    expect(result.pricePerSheetPaise).toBe(300);
    expect(result.totalPaise).toBe(600);
  });
});
