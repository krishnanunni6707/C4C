/**
 * Server-side pricing engine for campus printing.
 * Integer paise throughout — no floats, no rounding loss.
 */

export interface PricingSettings {
  bwSingleSidedPrice?: number;
  bwDoubleSidedPrice?: number;
  colorSingleSidedPrice?: number;
  colorDoubleSidedPrice?: number;
  bwPricePerSheet?: number;
  colorPricePerSheet?: number;
  tokenCharge?: number;
  maxPagesPerJob?: number;
  maxCopies?: number;
}

export type ColorModeInput = "BW" | "COLOR";
export type PrintTypeInput = "SINGLE" | "DOUBLE" | "single-sided" | "double-sided";

export interface ComputeAmountParams {
  pages: number;
  copies: number;
  colorMode: ColorModeInput;
  printType: PrintTypeInput;
  settings?: PricingSettings | null;
}

export interface ComputeAmountResult {
  pages: number;
  sheets: number;
  copies: number;
  pricePerSheetPaise: number;
  sheetsCostPaise: number;
  tokenChargePaise: number;
  totalPaise: number;
  totalRupees: number;
}

/**
 * Validates print job dimensions and computes amount in integer paise.
 * Throws an Error if inputs are invalid (0, negative, fractional, NaN, or out of bounds).
 */
export function computeAmount({
  pages,
  copies,
  colorMode,
  printType,
  settings,
}: ComputeAmountParams): ComputeAmountResult {
  if (typeof pages !== "number" || !Number.isInteger(pages) || pages <= 0) {
    throw new Error("Invalid page count: must be a positive integer >= 1");
  }

  if (typeof copies !== "number" || !Number.isInteger(copies) || copies <= 0) {
    throw new Error("Invalid copies: must be a positive integer >= 1");
  }

  const maxPages = settings?.maxPagesPerJob ?? 200;
  if (pages > maxPages) {
    throw new Error(`Page count (${pages}) exceeds maximum allowed (${maxPages})`);
  }

  const maxCopies = settings?.maxCopies ?? 50;
  if (copies > maxCopies) {
    throw new Error(`Copies (${copies}) exceeds maximum allowed (${maxCopies})`);
  }

  const isDuplex = printType === "DOUBLE" || printType === "double-sided";
  // Duplex = ceil(pages / 2) sheets
  const sheets = isDuplex ? Math.ceil(pages / 2) : pages;

  // Resolve price per sheet in rupees, then convert to integer paise
  let rupeeRate: number;
  if (colorMode === "COLOR") {
    if (isDuplex) {
      rupeeRate =
        settings?.colorDoubleSidedPrice ??
        settings?.colorPricePerSheet ??
        8;
    } else {
      rupeeRate =
        settings?.colorSingleSidedPrice ??
        settings?.colorPricePerSheet ??
        5;
    }
  } else {
    if (isDuplex) {
      rupeeRate =
        settings?.bwDoubleSidedPrice ??
        settings?.bwPricePerSheet ??
        3;
    } else {
      rupeeRate =
        settings?.bwSingleSidedPrice ??
        settings?.bwPricePerSheet ??
        2;
    }
  }

  if (typeof rupeeRate !== "number" || Number.isNaN(rupeeRate) || rupeeRate < 0) {
    throw new Error("Invalid pricing rate in settings");
  }

  const pricePerSheetPaise = Math.round(rupeeRate * 100);
  const sheetsCostPaise = sheets * copies * pricePerSheetPaise;

  // The UI currently does not add tokenCharge to student job estimates,
  // but if tokenCharge is configured in settings and requested, it can be included.
  // By default, tokenCharge is 0 unless explicitly configured as a surcharge.
  const tokenChargeRupees = 0; // UI currently does not charge token surcharge
  const tokenChargePaise = Math.round(tokenChargeRupees * 100);

  const totalPaise = sheetsCostPaise + tokenChargePaise;
  const totalRupees = totalPaise / 100;

  return {
    pages,
    sheets,
    copies,
    pricePerSheetPaise,
    sheetsCostPaise,
    tokenChargePaise,
    totalPaise,
    totalRupees,
  };
}
