"use client";

import React from "react";

interface MobileShellProps {
  children: React.ReactNode;
  className?: string;
  hideOverflow?: boolean;
}

export default function MobileShell({
  children,
  className = "",
  hideOverflow = true,
}: MobileShellProps) {
  const hasCustomHeight = className.includes("h-") || className.includes("min-h-");

  return (
    <div
      className={`${hasCustomHeight ? "" : "min-h-screen"} w-full max-w-[440px] mx-auto bg-[#F8FAFC] text-[#0F172A] flex flex-col relative font-sans antialiased selection:bg-indigo-500 selection:text-white ${
        hideOverflow ? "overflow-x-hidden" : ""
      } ${className}`}
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {children}
    </div>
  );
}
