import { describe, it, expect } from "vitest";
import { computeAmount } from "@/lib/pricing";

describe("Print Preferences Pricing & Dynamic Calculations", () => {
  const settings = {
    bwSingleSidedPrice: 2,
    bwDoubleSidedPrice: 3,
    colorSingleSidedPrice: 5,
    colorDoubleSidedPrice: 8,
    tokenCharge: 1,
    maxPagesPerJob: 200,
    maxCopies: 50,
  };

  const getPreferenceRate = (
    colorMode: "BW" | "COLOR",
    printType: "single-sided" | "double-sided"
  ) => {
    const isDuplex = printType === "double-sided";
    if (colorMode === "COLOR") {
      return isDuplex
        ? settings.colorDoubleSidedPrice
        : settings.colorSingleSidedPrice;
    }
    return isDuplex
      ? settings.bwDoubleSidedPrice
      : settings.bwSingleSidedPrice;
  };

  const getRateLabel = (
    colorMode: "BW" | "COLOR",
    printType: "single-sided" | "double-sided"
  ) => {
    return `Rate (${colorMode === "COLOR" ? "Color" : "B/W"} · ${
      printType === "double-sided" ? "Double sided" : "Single sided"
    })`;
  };

  // Sample 1: 36 pages, 2 copies, COLOR, single-sided (mockup default)
  it("Sample 1: computes 36 pages, 2 copies, COLOR, single-sided correctly", () => {
    const pages = 36;
    const copies = 2;
    const colorMode = "COLOR" as const;
    let printType: "single-sided" | "double-sided" = "single-sided";

    const rate = getPreferenceRate(colorMode, printType);
    expect(rate).toBe(5);
    expect(getRateLabel(colorMode, printType)).toBe("Rate (Color · Single sided)");

    const isDuplex = (printType as string) === "double-sided";
    const sheets = isDuplex ? Math.ceil(pages / 2) : pages;
    expect(sheets).toBe(36);

    const subtotal = sheets * copies * rate;
    expect(subtotal).toBe(360);

    const total = subtotal + settings.tokenCharge;
    expect(total).toBe(361);

    const serverResult = computeAmount({
      pages,
      copies,
      colorMode,
      printType,
      settings,
    });
    expect(serverResult.sheets).toBe(36);
    expect(serverResult.sheetsCostPaise).toBe(36000);
    expect(serverResult.pricePerSheetPaise).toBe(500);
  });

  // Sample 2: 36 pages, 2 copies, BW, single-sided
  it("Sample 2: computes 36 pages, 2 copies, BW, single-sided correctly", () => {
    const pages = 36;
    const copies = 2;
    const colorMode = "BW" as const;
    let printType: "single-sided" | "double-sided" = "single-sided";

    const rate = getPreferenceRate(colorMode, printType);
    expect(rate).toBe(2);
    expect(getRateLabel(colorMode, printType)).toBe("Rate (B/W · Single sided)");

    const isDuplex = (printType as string) === "double-sided";
    const sheets = isDuplex ? Math.ceil(pages / 2) : pages;
    expect(sheets).toBe(36);

    const subtotal = sheets * copies * rate;
    expect(subtotal).toBe(144);

    const total = subtotal + settings.tokenCharge;
    expect(total).toBe(145);

    const serverResult = computeAmount({
      pages,
      copies,
      colorMode,
      printType,
      settings,
    });
    expect(serverResult.sheets).toBe(36);
    expect(serverResult.sheetsCostPaise).toBe(14400);
    expect(serverResult.pricePerSheetPaise).toBe(200);
  });

  // Sample 3: 36 pages, 2 copies, BW, double-sided (duplex)
  it("Sample 3: computes 36 pages, 2 copies, BW, double-sided correctly", () => {
    const pages = 36;
    const copies = 2;
    const colorMode = "BW" as const;
    const printType = "double-sided" as const;

    const rate = getPreferenceRate(colorMode, printType);
    expect(rate).toBe(3);
    expect(getRateLabel(colorMode, printType)).toBe("Rate (B/W · Double sided)");

    const isDuplex = printType === "double-sided";
    const sheets = isDuplex ? Math.ceil(pages / 2) : pages;
    expect(sheets).toBe(18);

    const subtotal = sheets * copies * rate;
    expect(subtotal).toBe(108);

    const total = subtotal + settings.tokenCharge;
    expect(total).toBe(109);

    const serverResult = computeAmount({
      pages,
      copies,
      colorMode,
      printType,
      settings,
    });
    expect(serverResult.sheets).toBe(18);
    expect(serverResult.sheetsCostPaise).toBe(10800);
    expect(serverResult.pricePerSheetPaise).toBe(300);
  });

  // Sample 4: 36 pages, 2 copies, COLOR, double-sided (duplex)
  it("Sample 4: computes 36 pages, 2 copies, COLOR, double-sided correctly", () => {
    const pages = 36;
    const copies = 2;
    const colorMode = "COLOR" as const;
    const printType = "double-sided" as const;

    const rate = getPreferenceRate(colorMode, printType);
    expect(rate).toBe(8);
    expect(getRateLabel(colorMode, printType)).toBe("Rate (Color · Double sided)");

    const isDuplex = printType === "double-sided";
    const sheets = isDuplex ? Math.ceil(pages / 2) : pages;
    expect(sheets).toBe(18);

    const subtotal = sheets * copies * rate;
    expect(subtotal).toBe(288);

    const total = subtotal + settings.tokenCharge;
    expect(total).toBe(289);

    const serverResult = computeAmount({
      pages,
      copies,
      colorMode,
      printType,
      settings,
    });
    expect(serverResult.sheets).toBe(18);
    expect(serverResult.sheetsCostPaise).toBe(28800);
    expect(serverResult.pricePerSheetPaise).toBe(800);
  });

  // Sample 5: 7 pages (odd page count duplex ceil test), 3 copies, BW, double-sided
  it("Sample 5: computes 7 pages, 3 copies, BW, double-sided with ceil correctly", () => {
    const pages = 7;
    const copies = 3;
    const colorMode = "BW" as const;
    const printType = "double-sided" as const;

    const rate = getPreferenceRate(colorMode, printType);
    expect(rate).toBe(3);
    expect(getRateLabel(colorMode, printType)).toBe("Rate (B/W · Double sided)");

    const isDuplex = printType === "double-sided";
    const sheets = isDuplex ? Math.ceil(pages / 2) : pages;
    expect(sheets).toBe(4);

    const subtotal = sheets * copies * rate;
    expect(subtotal).toBe(36);

    const total = subtotal + settings.tokenCharge;
    expect(total).toBe(37);

    const serverResult = computeAmount({
      pages,
      copies,
      colorMode,
      printType,
      settings,
    });
    expect(serverResult.sheets).toBe(4);
    expect(serverResult.sheetsCostPaise).toBe(3600);
    expect(serverResult.pricePerSheetPaise).toBe(300);
  });
});
