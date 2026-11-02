import React from "react";

export default function PaymentMethodsRow() {
  return (
    <div
      className="flex items-center justify-center gap-3 sm:gap-4 select-none pt-1"
      aria-label="Supported payment methods"
    >
      {/* 1. UPI Badge */}
      <div className="flex items-center gap-1.5" title="UPI">
        <svg
          viewBox="0 0 28 14"
          className="h-3.5 w-auto"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* UPI Chevron arrows */}
          <path d="M7 1L12.5 13H10L5.75 3.5L3 13H0.5L6 1H7Z" fill="#097939" />
          <path d="M11 1L16.5 13H14L9.75 3.5L7 13H4.5L10 1H11Z" fill="#ED7524" />
        </svg>
        <span className="text-[12px] font-black tracking-tight text-slate-700 font-sans">
          UPI
        </span>
      </div>

      {/* Divider */}
      <span className="w-px h-3.5 bg-slate-200" aria-hidden="true" />

      {/* 2. VISA Badge */}
      <div className="flex items-center" title="Visa">
        <svg
          viewBox="0 0 42 14"
          className="h-3.5 w-auto"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <text
            x="0"
            y="12"
            fill="#1A1F71"
            fontSize="14"
            fontWeight="900"
            fontStyle="italic"
            fontFamily="sans-serif"
            letterSpacing="-0.5px"
          >
            VISA
          </text>
        </svg>
      </div>

      {/* Divider */}
      <span className="w-px h-3.5 bg-slate-200" aria-hidden="true" />

      {/* 3. Mastercard Badge (Two interlocking circles) */}
      <div className="flex items-center" title="Mastercard">
        <svg
          viewBox="0 0 28 16"
          className="h-4 w-auto"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Red circle */}
          <circle cx="8" cy="8" r="8" fill="#EB001B" />
          {/* Yellow circle */}
          <circle cx="20" cy="8" r="8" fill="#F79E1B" fillOpacity="0.9" />
          {/* Overlap intersection */}
          <path
            d="M14 2.5C15.7 3.9 16.8 5.8 16.8 8C16.8 10.2 15.7 12.1 14 13.5C12.3 12.1 11.2 10.2 11.2 8C11.2 5.8 12.3 3.9 14 2.5Z"
            fill="#FF5F00"
          />
        </svg>
      </div>

      {/* Divider */}
      <span className="w-px h-3.5 bg-slate-200" aria-hidden="true" />

      {/* 4. RuPay Badge */}
      <div className="flex items-center gap-1" title="RuPay">
        <svg
          viewBox="0 0 16 12"
          className="h-3 w-auto"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path d="M0 12L4 0H7L3 12H0Z" fill="#00A3E0" />
          <path d="M5 12L9 0H12L8 12H5Z" fill="#F26522" />
        </svg>
        <span className="text-[12px] font-black tracking-tight text-slate-800 font-sans italic">
          RuPay
        </span>
      </div>
    </div>
  );
}
