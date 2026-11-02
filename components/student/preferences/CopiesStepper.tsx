"use client";

import React, { useState, useEffect } from "react";
import { Minus, Plus } from "lucide-react";

export interface CopiesStepperProps {
  value: number;
  onChange: (copies: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}

export default function CopiesStepper({
  value,
  onChange,
  min = 1,
  max = 50,
  disabled = false,
}: CopiesStepperProps) {
  const [inputValue, setInputValue] = useState<string>(String(value));

  // Sync internal input state when prop changes externally
  useEffect(() => {
    setInputValue(String(value));
  }, [value]);

  const handleDecrement = () => {
    if (disabled || value <= min) return;
    const next = Math.max(min, value - 1);
    onChange(next);
  };

  const handleIncrement = () => {
    if (disabled || value >= max) return;
    const next = Math.min(max, value + 1);
    onChange(next);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Allow empty string while typing or numeric digits only
    if (raw === "" || /^\d+$/.test(raw)) {
      setInputValue(raw);
    }
  };

  const commitValue = () => {
    const parsed = parseInt(inputValue, 10);
    if (Number.isNaN(parsed) || parsed < min) {
      onChange(min);
      setInputValue(String(min));
    } else if (parsed > max) {
      onChange(max);
      setInputValue(String(max));
    } else {
      onChange(parsed);
      setInputValue(String(parsed));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      commitValue();
      (e.target as HTMLInputElement).blur();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      handleIncrement();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      handleDecrement();
    }
  };

  return (
    <div className="flex items-center gap-3 select-none">
      {/* Decrease copies button */}
      <button
        type="button"
        onClick={handleDecrement}
        disabled={disabled || value <= min}
        aria-label="Decrease copies"
        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 active:bg-indigo-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
      >
        <Minus className="w-4 h-4 stroke-[2.5]" />
      </button>

      {/* Editable numeric input */}
      <div className="relative flex items-center justify-center">
        <input
          type="text"
          role="spinbutton"
          inputMode="numeric"
          pattern="[0-9]*"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={commitValue}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-label="Number of copies"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          className="w-12 sm:w-14 h-9 sm:h-10 text-center font-bold text-base sm:text-lg text-[#0F172A] font-mono bg-transparent border border-transparent hover:border-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded-lg transition-colors"
        />
      </div>

      {/* Increase copies button */}
      <button
        type="button"
        onClick={handleIncrement}
        disabled={disabled || value >= max}
        aria-label="Increase copies"
        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 active:bg-indigo-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
      >
        <Plus className="w-4 h-4 stroke-[2.5]" />
      </button>
    </div>
  );
}
