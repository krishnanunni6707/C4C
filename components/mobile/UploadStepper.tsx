"use client";

import React from "react";
import { Check, ArrowRight } from "lucide-react";

export type MobileStepperStep = 1 | 2 | 3 | 4;

interface UploadStepperProps {
  currentStep: MobileStepperStep;
  onStepClick?: (step: MobileStepperStep) => void;
  className?: string;
}

const STEPS = [
  { step: 1 as MobileStepperStep, label: "Upload" },
  { step: 2 as MobileStepperStep, label: "Edit" },
  { step: 3 as MobileStepperStep, label: "Confirm" },
  { step: 4 as MobileStepperStep, label: "Pay" },
];

export default function UploadStepper({
  currentStep,
  onStepClick,
  className = "",
}: UploadStepperProps) {
  return (
    <div
      aria-label="Upload Progress"
      className={`w-full flex items-center justify-between px-1 py-3 ${className}`}
    >
      {STEPS.map((s, idx) => {
        const isCurrent = s.step === currentStep;
        const isCompleted = s.step < currentStep;
        const isLast = idx === STEPS.length - 1;

        return (
          <React.Fragment key={s.step}>
            <button
              type="button"
              disabled={!onStepClick || s.step > currentStep}
              onClick={() => onStepClick?.(s.step)}
              className={`flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-md py-0.5 ${
                onStepClick && s.step <= currentStep
                  ? "cursor-pointer"
                  : "cursor-default"
              }`}
            >
              {/* Step Circle */}
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                  isCurrent
                    ? "bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-100"
                    : isCompleted
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 border border-slate-300 text-slate-400"
                }`}
              >
                {isCompleted ? (
                  <Check className="w-3 h-3 stroke-[3]" />
                ) : (
                  <span>{s.step}</span>
                )}
              </div>

              {/* Step Label */}
              <span
                className={`text-[11px] font-semibold transition-colors ${
                  isCurrent
                    ? "text-indigo-600 font-bold"
                    : isCompleted
                    ? "text-slate-800"
                    : "text-slate-400"
                }`}
              >
                {s.label}
              </span>
            </button>

            {/* Connecting Line or End Arrow */}
            {!isLast ? (
              <div
                className={`flex-1 h-[1.5px] mx-1.5 transition-colors ${
                  isCompleted ? "bg-indigo-600" : "bg-slate-200"
                }`}
              />
            ) : (
              <ArrowRight className="w-3 h-3 text-slate-300 ml-1 flex-shrink-0" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
