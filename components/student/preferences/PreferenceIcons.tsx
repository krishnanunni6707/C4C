import React from "react";

/**
 * Grey document with folded corner and lines for Black & White printing.
 */
export function BwDocIcon({ className = "w-9 h-11" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 36 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Document shadow / background */}
      <rect x="2" y="2" width="32" height="40" rx="3" fill="#F1F5F9" />
      <path
        d="M2 5C2 3.34315 3.34315 2 5 2H24L34 12V39C34 40.6569 32.6569 42 31 42H5C3.34315 42 2 40.6569 2 39V5Z"
        fill="#FFFFFF"
        stroke="#94A3B8"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      {/* Folded corner */}
      <path
        d="M24 2V12H34"
        stroke="#94A3B8"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      {/* Grey text lines */}
      <rect x="7" y="16" width="16" height="2.5" rx="1.25" fill="#94A3B8" />
      <rect x="7" y="22" width="22" height="2.5" rx="1.25" fill="#CBD5E1" />
      <rect x="7" y="28" width="18" height="2.5" rx="1.25" fill="#CBD5E1" />
      <rect x="7" y="34" width="12" height="2.5" rx="1.25" fill="#CBD5E1" />
    </svg>
  );
}

/**
 * Colorful document icon with folded corner and image/landscape for Color printing.
 */
export function ColorDocIcon({ className = "w-9 h-11" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 36 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M2 5C2 3.34315 3.34315 2 5 2H24L34 12V39C34 40.6569 32.6569 42 31 42H5C3.34315 42 2 40.6569 2 39V5Z"
        fill="#FFFFFF"
        stroke="#60A5FA"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      {/* Folded corner */}
      <path
        d="M24 2V12H34"
        stroke="#60A5FA"
        strokeWidth="1.75"
        strokeLinejoin="round"
        fill="#EFF6FF"
      />
      {/* Mini Image Preview inside */}
      <rect x="6" y="16" width="24" height="20" rx="2" fill="#E0F2FE" />
      {/* Sun */}
      <circle cx="12" cy="22" r="2.5" fill="#FBBF24" />
      {/* Mountains */}
      <path
        d="M6 34L13 25L18 31L23 23L30 34H6Z"
        fill="#34D399"
      />
      <path
        d="M17 34L23 23L30 34H17Z"
        fill="#10B981"
      />
    </svg>
  );
}

/**
 * Single-sided outline document with folded corner and lines.
 */
export function SingleSidedDocIcon({ className = "w-8 h-9" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M2 4C2 2.89543 2.89543 2 4 2H21L30 11V32C30 33.1046 29.1046 34 28 34H4C2.89543 34 2 33.1046 2 32V4Z"
        fill="#FFFFFF"
        stroke="#4F46E5"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M21 2V11H30"
        stroke="#4F46E5"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      {/* Lines */}
      <rect x="6" y="15" width="16" height="2" rx="1" fill="#818CF8" />
      <rect x="6" y="20" width="20" height="2" rx="1" fill="#818CF8" />
      <rect x="6" y="25" width="14" height="2" rx="1" fill="#818CF8" />
    </svg>
  );
}

/**
 * Double-sided two cascading outline documents with folded corners.
 */
export function DoubleSidedDocIcon({ className = "w-10 h-9" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 38 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Left document */}
      <g>
        <path
          d="M2 4C2 2.89543 2.89543 2 4 2H17L24 9V29C24 30.1046 23.1046 31 22 31H4C2.89543 31 2 30.1046 2 29V4Z"
          fill="#FFFFFF"
          stroke="#4F46E5"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M17 2V9H24"
          stroke="#4F46E5"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <rect x="5" y="13" width="10" height="1.5" rx="0.75" fill="#818CF8" />
        <rect x="5" y="17" width="14" height="1.5" rx="0.75" fill="#818CF8" />
        <rect x="5" y="21" width="10" height="1.5" rx="0.75" fill="#818CF8" />
      </g>
      {/* Right overlapping document */}
      <g>
        <path
          d="M14 8C14 6.89543 14.8954 6 16 6H29L36 13V33C36 34.1046 35.1046 35 34 35H16C14.8954 35 14 34.1046 14 33V8Z"
          fill="#FFFFFF"
          stroke="#4F46E5"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M29 6V13H36"
          stroke="#4F46E5"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <rect x="17" y="17" width="10" height="1.5" rx="0.75" fill="#818CF8" />
        <rect x="17" y="21" width="14" height="1.5" rx="0.75" fill="#818CF8" />
        <rect x="17" y="25" width="10" height="1.5" rx="0.75" fill="#818CF8" />
      </g>
    </svg>
  );
}
