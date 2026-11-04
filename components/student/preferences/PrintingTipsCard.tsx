"use client";

import React from "react";
import { Settings } from "lucide-react";

export default function PrintingTipsCard() {
  return (
    <div className="bg-[#F0F5FF] dark:bg-[#111827] border border-indigo-100/60 dark:border-slate-700 rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center h-full min-h-[360px]">
      {/* Illustration: Stacked documents with gear badge and sparkle strokes */}
      <div className="relative w-36 h-36 flex items-center justify-center">
        {/* Sparkle burst strokes at top right */}
        <svg
          viewBox="0 0 40 40"
          className="absolute -top-1 -right-1 w-9 h-9"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Top stroke */}
          <line
            x1="18"
            y1="5"
            x2="15"
            y2="15"
            stroke="#6366F1"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Angle stroke */}
          <line
            x1="28"
            y1="12"
            x2="20"
            y2="18"
            stroke="#6366F1"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Right stroke */}
          <line
            x1="32"
            y1="25"
            x2="22"
            y2="23"
            stroke="#6366F1"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>

        {/* Stacked Documents Graphic */}
        <svg
          viewBox="0 0 110 110"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-28 h-28 drop-shadow-sm"
          aria-hidden="true"
        >
          {/* Back document tilted */}
          <g transform="rotate(-8 45 60)">
            <rect
              x="20"
              y="18"
              width="50"
              height="68"
              rx="4"
              fill="#DBEAFE"
              opacity="0.85"
            />
          </g>

          {/* Middle document slightly shifted */}
          <g transform="rotate(-3 50 60)">
            <rect
              x="25"
              y="16"
              width="50"
              height="68"
              rx="4"
              fill="#E0E7FE"
              opacity="0.9"
            />
          </g>

          {/* Front document with folded corner and lines */}
          <g transform="translate(30, 16)">
            {/* Base paper */}
            <path
              d="M0 4C0 1.79086 1.79086 0 4 0H38L52 14V64C52 66.2091 50.2091 68 48 68H4C1.79086 68 0 66.2091 0 64V4Z"
              fill="#FFFFFF"
              stroke="#CBD5E1"
              strokeWidth="1.5"
            />
            {/* Folded flap */}
            <path
              d="M38 0V14H52"
              fill="#F1F5F9"
              stroke="#CBD5E1"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            {/* Text lines */}
            <rect x="8" y="20" width="22" height="3" rx="1.5" fill="#818CF8" />
            <rect x="8" y="27" width="34" height="3" rx="1.5" fill="#CBD5E1" />
            <rect x="8" y="34" width="30" height="3" rx="1.5" fill="#CBD5E1" />
            <rect x="8" y="41" width="24" height="3" rx="1.5" fill="#CBD5E1" />
            <rect x="8" y="48" width="16" height="3" rx="1.5" fill="#CBD5E1" />
          </g>
        </svg>

        {/* Gear Badge at lower right */}
        <div className="absolute bottom-2 right-4 w-9 h-9 rounded-full bg-indigo-600 border-2 border-white flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
          <Settings className="w-5 h-5 animate-[spin_12s_linear_infinite]" />
        </div>
      </div>

      {/* Copy */}
      <h3 className="text-base sm:text-lg font-bold text-[#0F172A] mt-5">
        Printing Tips
      </h3>
      <p className="text-xs sm:text-sm text-slate-500 font-normal leading-relaxed mt-2 max-w-[210px]">
        For best results, use A4 paper and select Double Sided for paper saving.
      </p>
    </div>
  );
}
