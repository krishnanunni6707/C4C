"use client";

import React from "react";
import { Check } from "lucide-react";

export type WizardStepId = "LOCATION" | "UPLOAD" | "EDIT" | "SETTINGS" | "PAYMENT";

export interface StepperBarProps {
  currentStep?: WizardStepId;
  onStepClick?: (step: WizardStepId) => void;
}

interface StepItem {
  id: WizardStepId;
  stepNumber: number;
  label: string;
}

const STEPS: StepItem[] = [
  { id: "LOCATION", stepNumber: 1, label: "Location" },
  { id: "UPLOAD", stepNumber: 2, label: "Upload" },
  { id: "EDIT", stepNumber: 3, label: "Edit" },
  { id: "SETTINGS", stepNumber: 4, label: "Preferences" },
  { id: "PAYMENT", stepNumber: 5, label: "Review & Pay" },
];

export default function StepperBar({
  currentStep = "EDIT",
  onStepClick,
}: StepperBarProps) {
  const currentIdx = STEPS.findIndex((s) => s.id === currentStep);
  const activeStep = STEPS[currentIdx] || STEPS[2];

  return (
    <div className="w-full">
      {/* Desktop & Tablet View (>=640px): 5 steps with connector lines */}
      <nav aria-label="Print Progress" className="hidden sm:block w-full">
        <ol className="flex items-center w-full">
          {STEPS.map((step, idx) => {
            const isDone = idx < currentIdx;
            const isCurrent = idx === currentIdx;
            const isUpcoming = idx > currentIdx;

            return (
              <li
                key={step.id}
                className={`flex items-center ${
                  idx < STEPS.length - 1 ? "flex-1" : ""
                }`}
                aria-current={isCurrent ? "step" : undefined}
              >
                {/* Step Circle & Label */}
                <button
                  type="button"
                  disabled={!isDone}
                  onClick={() => {
                    if (isDone) onStepClick?.(step.id);
                  }}
                  className={`flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg py-1 px-1 text-left transition-colors ${
                    isDone ? "cursor-pointer group" : "cursor-default"
                  }`}
                  aria-label={`${step.label}, ${
                    isDone ? "completed" : isCurrent ? "current step" : "upcoming"
                  }`}
                >
                  {/* Circle Indicator */}
                  {isDone ? (
                    <span className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0 group-hover:bg-indigo-100 transition-colors">
                      <Check className="w-4 h-4" strokeWidth={2.5} />
                    </span>
                  ) : isCurrent ? (
                    <span className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-sm flex items-center justify-center flex-shrink-0 shadow-sm shadow-indigo-600/30">
                      {step.stepNumber}
                    </span>
                  ) : (
                    <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 font-semibold text-sm flex items-center justify-center flex-shrink-0">
                      {step.stepNumber}
                    </span>
                  )}

                  {/* Step Label */}
                  <span
                    className={`text-sm tracking-tight transition-colors ${
                      isCurrent
                        ? "text-[#0F172A] font-bold"
                        : isDone
                        ? "text-slate-500 group-hover:text-slate-800 font-medium"
                        : "text-slate-400 font-medium"
                    }`}
                  >
                    {step.label}
                  </span>
                </button>

                {/* Thin Connector Line */}
                {idx < STEPS.length - 1 && (
                  <div
                    className="flex-1 h-[1px] bg-slate-200 mx-3 sm:mx-4"
                    aria-hidden="true"
                  />
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Mobile View (<640px): Collapsed step indicator + progress bar */}
      <div className="sm:hidden space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-[#0F172A]">
            Step {activeStep.stepNumber} of 5 &middot; {activeStep.label}
          </span>
          <span className="text-slate-400 font-mono">
            {Math.round(((activeStep.stepNumber) / 5) * 100)}%
          </span>
        </div>
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-600 rounded-full transition-all duration-300"
            style={{ width: `${(activeStep.stepNumber / 5) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
