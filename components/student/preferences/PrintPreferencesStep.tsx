"use client";

import React from "react";
import PreferenceRadioCard from "./PreferenceRadioCard";
import {
  BwDocIcon,
  ColorDocIcon,
  SingleSidedDocIcon,
  DoubleSidedDocIcon,
} from "./PreferenceIcons";
import CopiesStepper from "./CopiesStepper";
import PaperSizeSelect from "./PaperSizeSelect";
import PrintingTipsCard from "./PrintingTipsCard";
import OrderSummaryCard from "./OrderSummaryCard";
import type { PricingSettings } from "@/lib/pricing";

export interface PrintPreferencesStepProps {
  // Preferences State
  colorMode: "BW" | "COLOR";
  setColorMode: (mode: "BW" | "COLOR") => void;
  printType: "single-sided" | "double-sided";
  setPrintType: (type: "single-sided" | "double-sided") => void;
  copies: number;
  setCopies: (copies: number) => void;
  paperSize: "A4" | "Letter";
  setPaperSize: (size: "A4" | "Letter") => void;

  // Pricing & Breakdown
  pricing?: PricingSettings | null;
  pagesCount: number;
  pricePerSheet: number;
  subtotal: number;
  tokenCharge: number;
  totalWithTokenCharge: number;

  // Actions
  onProceedToPayment: () => void;
  draftSavedTime?: string | null;
}

export default function PrintPreferencesStep({
  colorMode,
  setColorMode,
  printType,
  setPrintType,
  copies,
  setCopies,
  paperSize,
  setPaperSize,
  pricing,
  pagesCount,
  pricePerSheet,
  subtotal,
  tokenCharge,
  totalWithTokenCharge,
  onProceedToPayment,
  draftSavedTime,
}: PrintPreferencesStepProps) {
  // Rates based on current sides selection (single vs double)
  const isDuplex = printType === "double-sided";
  const bwRate = isDuplex
    ? pricing?.bwDoubleSidedPrice ?? 3
    : pricing?.bwSingleSidedPrice ?? 2;
  const colorRate = isDuplex
    ? pricing?.colorDoubleSidedPrice ?? 8
    : pricing?.colorSingleSidedPrice ?? 5;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-in fade-in duration-200">
      {/* ── Left Card (~68% width on desktop / lg:col-span-8) ── */}
      <section
        aria-label="Print preferences form"
        className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm"
      >
        <div className="flex flex-col xl:flex-row gap-6 xl:gap-8 items-stretch">
          {/* Inner Left Column: Form Controls */}
          <div className="flex-1 space-y-6">
            {/* 1. Color Mode */}
            <fieldset
              role="radiogroup"
              aria-labelledby="color-mode-heading"
              className="space-y-2.5 border-0 p-0 m-0"
            >
              <legend
                id="color-mode-heading"
                className="text-sm sm:text-[15px] font-bold text-[#0F172A] tracking-tight block"
              >
                Color Mode
              </legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <PreferenceRadioCard
                  id="color-mode-bw"
                  name="colorMode"
                  value="BW"
                  selectedValue={colorMode}
                  onSelect={(v) => setColorMode(v as "BW")}
                  title="Black & White"
                  subtitle={`₹${bwRate} / sheet`}
                  icon={<BwDocIcon />}
                  ariaLabel={`Black & White, ₹${bwRate} per sheet`}
                />
                <PreferenceRadioCard
                  id="color-mode-color"
                  name="colorMode"
                  value="COLOR"
                  selectedValue={colorMode}
                  onSelect={(v) => setColorMode(v as "COLOR")}
                  title="Color"
                  subtitle={`₹${colorRate} / sheet`}
                  icon={<ColorDocIcon />}
                  ariaLabel={`Color, ₹${colorRate} per sheet`}
                />
              </div>
            </fieldset>

            {/* 2. Print Sides */}
            <fieldset
              role="radiogroup"
              aria-labelledby="print-sides-heading"
              className="space-y-2.5 border-0 p-0 m-0"
            >
              <legend
                id="print-sides-heading"
                className="text-sm sm:text-[15px] font-bold text-[#0F172A] tracking-tight block"
              >
                Print Sides
              </legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <PreferenceRadioCard
                  id="print-sides-single"
                  name="printSides"
                  value="single-sided"
                  selectedValue={printType}
                  onSelect={(v) =>
                    setPrintType(v as "single-sided" | "double-sided")
                  }
                  title="Single Sided"
                  icon={<SingleSidedDocIcon />}
                  ariaLabel="Single Sided printing"
                />
                <PreferenceRadioCard
                  id="print-sides-double"
                  name="printSides"
                  value="double-sided"
                  selectedValue={printType}
                  onSelect={(v) =>
                    setPrintType(v as "single-sided" | "double-sided")
                  }
                  title="Double Sided"
                  icon={<DoubleSidedDocIcon />}
                  ariaLabel="Double Sided printing"
                />
              </div>
            </fieldset>

            {/* 3. Copies */}
            <div className="space-y-2.5">
              <label
                htmlFor="copies-stepper-label"
                id="copies-stepper-label"
                className="text-sm sm:text-[15px] font-bold text-[#0F172A] tracking-tight block"
              >
                Copies
              </label>
              <CopiesStepper
                value={copies}
                onChange={setCopies}
                min={1}
                max={50}
              />
            </div>

            {/* 4. Paper Size */}
            <div className="space-y-2.5">
              <label
                htmlFor="paper-size-select"
                className="text-sm sm:text-[15px] font-bold text-[#0F172A] tracking-tight block"
              >
                Paper Size
              </label>
              <PaperSizeSelect
                value={paperSize === "Letter" ? "A4" : paperSize}
                onChange={(size) => setPaperSize(size)}
              />
            </div>
            {/* NOTE: Page Range (Optional) is deliberately excluded per explicit task instructions */}
          </div>

          {/* Thin Vertical Divider (Desktop >= 1280px) */}
          <div
            className="hidden xl:block w-px bg-slate-200 self-stretch my-1"
            aria-hidden="true"
          />

          {/* Inner Right Column: PrintingTipsCard (Desktop >= 1280px) */}
          <div className="hidden xl:flex xl:w-[280px] 2xl:w-[310px] flex-shrink-0">
            <PrintingTipsCard />
          </div>
        </div>
      </section>

      {/* ── Right Card (~30% width on desktop / lg:col-span-4): Order Summary ── */}
      <div className="lg:col-span-4 sticky top-24">
        <OrderSummaryCard
          pagesCount={pagesCount}
          copies={copies}
          colorMode={colorMode}
          printType={printType}
          pricePerSheet={pricePerSheet}
          subtotal={subtotal}
          tokenCharge={tokenCharge}
          totalAmount={totalWithTokenCharge}
          onProceed={onProceedToPayment}
          disabled={pagesCount === 0}
          draftSavedTime={draftSavedTime}
        />
      </div>
    </div>
  );
}
