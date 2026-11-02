"use client";

import React from "react";
import { Check } from "lucide-react";

export type WizardStepId = "LOCATION" | "UPLOAD" | "EDIT" | "SETTINGS" | "PAYMENT";

interface StepConfig {
  id: WizardStepId;
  label: string;
}

const STEPS: StepConfig[] = [
  { id: "LOCATION", label: "Location" },
  { id: "UPLOAD", label: "Upload" },
  { id: "EDIT", label: "Edit" },
  { id: "SETTINGS", label: "Preferences" },
  { id: "PAYMENT", label: "Review & Pay" },
];

interface WizardStepperProps {
  currentStep: WizardStepId;
  locationSelected?: boolean;
  hasFiles?: boolean;
  onStepClick?: (step: WizardStepId) => void;
}

export default function WizardStepper({
  currentStep,
  locationSelected = true,
  hasFiles = false,
  onStepClick,
}: WizardStepperProps) {
  const currentIdx = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <nav aria-label="Progress">
      <ol className="flex items-center w-full">
        {STEPS.map((step, idx) => {
          // Location is done if a location is selected and we are on a later step,
          // or if user is on Upload/beyond.
          const isDone =
            step.id === "LOCATION"
              ? locationSelected && currentStep !== "LOCATION"
              : idx < currentIdx;

          const isActive = step.id === currentStep;

          return (
            <li
              key={step.id}
              className={`flex items-center ${
                idx < STEPS.length - 1 ? "flex-1" : ""
              }`}
              aria-current={isActive ? "step" : undefined}
            >
              <button
                type="button"
                onClick={() => onStepClick?.(step.id)}
                className="group flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg p-1 text-left"
              >
                {/* Step Circle */}
                {isDone ? (
                  <span className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0 transition-colors">
                    <Check className="w-4.5 h-4.5" strokeWidth={2.5} />
                  </span>
                ) : isActive ? (
                  step.id === "LOCATION" && locationSelected ? (
                    <span className="w-10 h-10 rounded-full bg-indigo-300 text-white flex items-center justify-center flex-shrink-0 shadow-sm shadow-indigo-200">
                      <Check className="w-5 h-5 text-white" strokeWidth={2.5} />
                    </span>
                  ) : (
                    <span className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold text-sm flex items-center justify-center flex-shrink-0 shadow-sm shadow-indigo-600/30">
                      {idx + 1}
                    </span>
                  )
                ) : (
                  <span className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 font-semibold text-sm flex items-center justify-center flex-shrink-0">
                    {idx + 1}
                  </span>
                )}

                {/* Step Label */}
                <span
                  className={`text-sm font-medium transition-colors ${
                    isActive
                      ? "text-[#0F172A] font-bold"
                      : isDone
                      ? "text-slate-500 group-hover:text-slate-700"
                      : "text-slate-500"
                  }`}
                >
                  {step.label}
                </span>
              </button>

              {/* Connector line between steps */}
              {idx < STEPS.length - 1 && (
                <div
                  className="flex-1 h-[1px] bg-slate-200 mx-2.5 sm:mx-3"
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
