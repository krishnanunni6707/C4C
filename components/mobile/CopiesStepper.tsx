"use client";

import React from "react";
import { Minus, Plus } from "lucide-react";

interface CopiesStepperProps {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  className?: string;
}

export default function CopiesStepper({
  value,
  onChange,
  min = 1,
  max = 50,
  className = "",
}: CopiesStepperProps) {
  const handleDecrement = () => {
    if (value > min) onChange(value - 1);
  };

  const handleIncrement = () => {
    if (value < max) onChange(value + 1);
  };

  return (
    <div
      className={`w-full bg-white rounded-2xl border border-slate-200/90 p-2.5 flex items-center justify-between shadow-xs ${className}`}
    >
      {/* Minus Button */}
      <button
        type="button"
        onClick={handleDecrement}
        disabled={value <= min}
        className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
          value <= min
            ? "text-slate-300 bg-slate-50 cursor-not-allowed"
            : "text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-95"
        }`}
        aria-label="Decrease copies"
      >
        <Minus className="w-4 h-4 stroke-[2.5]" />
      </button>

      {/* Copies Display */}
      <div className="flex-1 text-center">
        <span className="text-base sm:text-lg font-bold text-[#0F172A] font-mono tabular-nums">
          {value}
        </span>
      </div>

      {/* Plus Button */}
      <button
        type="button"
        onClick={handleIncrement}
        disabled={value >= max}
        className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
          value >= max
            ? "text-slate-300 bg-slate-50 cursor-not-allowed"
            : "text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-95"
        }`}
        aria-label="Increase copies"
      >
        <Plus className="w-4 h-4 stroke-[2.5]" />
      </button>
    </div>
  );
}
