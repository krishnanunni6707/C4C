"use client";

import React from "react";
import { FileUp, Clock, History, MapPin } from "lucide-react";

export type MobileNavTab = "new" | "active" | "history" | "locations";

interface BottomTabBarProps {
  activeTab: MobileNavTab | "landing";
  onTabChange: (tab: MobileNavTab) => void;
  activeJobsCount?: number;
  className?: string;
}

interface TabDef {
  id: MobileNavTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TABS: TabDef[] = [
  { id: "new", label: "New Print", icon: FileUp },
  { id: "active", label: "Active", icon: Clock },
  { id: "history", label: "History", icon: History },
  { id: "locations", label: "Locations", icon: MapPin },
];

export default function BottomTabBar({
  activeTab,
  onTabChange,
  activeJobsCount = 0,
  className = "",
}: BottomTabBarProps) {
  const isPositioned = className.includes("relative") || className.includes("static") || className.includes("absolute");

  return (
    <nav
      role="navigation"
      aria-label="Student Mobile Navigation"
      className={`${
        isPositioned ? "w-full" : "fixed bottom-0 left-0 right-0 max-w-[440px] mx-auto"
      } z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-3 py-1 flex items-center justify-around shadow-sm transition-all ${className}`}
      style={{
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 4px)",
      }}
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        const showBadge = tab.id === "active" && activeJobsCount > 0;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`min-w-[64px] min-h-[44px] flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              isActive
                ? "text-indigo-600 font-semibold"
                : "text-slate-500 hover:text-slate-800 font-medium"
            }`}
            aria-current={isActive ? "page" : undefined}
          >
            <div className="relative">
              <Icon
                className={`w-5 h-5 transition-transform ${
                  isActive ? "stroke-[2.2] scale-105" : "stroke-[1.8]"
                }`}
              />
              {showBadge && (
                <span
                  className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-indigo-600 ring-2 ring-white"
                  aria-label={`${activeJobsCount} active jobs`}
                />
              )}
            </div>
            <span className="text-[11px] leading-tight tracking-tight">
              {tab.label}
            </span>
            {isActive && (
              <span className="w-1 h-1 rounded-full bg-indigo-600 mt-0.5" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
