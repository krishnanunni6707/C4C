"use client";

import React from "react";
import type { MobileNavTab } from "./BottomTabBar";

interface SegmentTabsProps {
  activeTab: MobileNavTab;
  onTabChange: (tab: MobileNavTab) => void;
  className?: string;
}

const TABS: { id: MobileNavTab; label: string }[] = [
  { id: "new", label: "New Print" },
  { id: "active", label: "Active" },
  { id: "history", label: "History" },
  { id: "locations", label: "Locations" },
];

export default function SegmentTabs({
  activeTab,
  onTabChange,
  className = "",
}: SegmentTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Student Navigation Tabs"
      className={`w-full bg-white border-b border-slate-200/90 px-2 flex items-center justify-between ${className}`}
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 py-3 text-center text-xs sm:text-[13px] font-semibold transition-all relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              isActive
                ? "text-indigo-600 font-bold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>{tab.label}</span>
            {isActive && (
              <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-indigo-600 rounded-t-full transition-all" />
            )}
          </button>
        );
      })}
    </div>
  );
}
