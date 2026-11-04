"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { signOut, useSession } from "next-auth/react";
import { ChevronDown, LogOut, Moon, Sun } from "lucide-react";
import NotificationBell from "@/components/ui/NotificationBell";
import { useTheme } from "@/contexts/ThemeContext";

export type StudentNavTab = "new" | "active" | "history" | "locations";

export interface StudentTopNavProps {
  activeTab?: StudentNavTab;
  onTabChange?: (tab: StudentNavTab) => void;
  activeJobsCount?: number;
  userName?: string | null;
  admissionNumber?: string | null;
}

const TABS: { id: StudentNavTab; label: string }[] = [
  { id: "new", label: "New Print" },
  { id: "active", label: "Active" },
  { id: "history", label: "History" },
  { id: "locations", label: "Locations" },
];

export default function StudentTopNav({
  activeTab = "new",
  onTabChange,
  activeJobsCount = 0,
  userName,
  admissionNumber,
}: StudentTopNavProps) {
  const { data: session } = useSession();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const displayName = userName || session?.user?.name || "Aarav Nair";
  const displayId =
    admissionNumber || session?.user?.admissionNumber || "CS21B042";
  const initial = displayName.trim().charAt(0).toUpperCase() || "A";

  // Close user dropdown on outside click or Escape
  useEffect(() => {
    if (!dropdownOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [dropdownOpen]);

  return (
    <>
      <header className="sticky top-0 z-40 h-[68px] bg-white border-b border-slate-200">
        <div className="max-w-[1440px] mx-auto h-full px-6 sm:px-8 flex items-center justify-between">
          {/* Left: Brand Logo (per brand-assets rule) */}
          <Link
            href="/"
            className="flex items-center group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg py-1"
            aria-label="QDoc Home"
          >
            <Image
              src="/logo-new-updated-original.png"
              alt="QDoc"
              width={130}
              height={38}
              className="h-8 sm:h-9 w-auto object-contain"
              priority
            />
          </Link>

          {/* Center: Navigation Tabs (Desktop & Tablet) */}
          <nav
            className="hidden sm:flex items-center h-full gap-8"
            aria-label="Student Navigation"
          >
            {TABS.map(({ id, label }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onTabChange?.(id)}
                  className={`relative h-full text-[15px] font-medium transition-colors flex items-center gap-1.5 focus:outline-none focus-visible:text-indigo-600 ${
                    isActive
                      ? "text-indigo-600 font-semibold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <span>{label}</span>
                  {id === "active" && activeJobsCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold leading-none">
                      {activeJobsCount}
                    </span>
                  )}
                  {/* 2px solid active underline matching screenshot */}
                  {isActive && (
                    <span
                      className="absolute bottom-0 left-0 right-0 h-[2px] bg-indigo-600 rounded-t-sm"
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right: Notification Bell, Avatar, Name & Admission number, Chevron */}
          <div className="flex items-center gap-4">
            {/* Notification Bell */}
            <div className="flex items-center">
              <NotificationBell />
            </div>

            {/* User Chip */}
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen((o) => !o)}
                className="flex items-center gap-3 p-1 rounded-xl hover:bg-slate-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                aria-label={`User menu for ${displayName}`}
                aria-expanded={dropdownOpen}
              >
                {/* 38px circle avatar in solid indigo with letter initial */}
                <div className="w-[38px] h-[38px] rounded-full bg-indigo-600 text-white font-bold text-sm sm:text-base flex items-center justify-center flex-shrink-0 shadow-sm shadow-indigo-600/20">
                  {initial}
                </div>

                {/* Name & Admission Number */}
                <div className="text-left hidden md:block">
                  <p className="text-sm font-semibold text-[#0F172A] leading-tight">
                    {displayName}
                  </p>
                  <p className="text-xs text-slate-400 font-normal leading-tight mt-0.5 font-mono">
                    {displayId}
                  </p>
                </div>

                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                    dropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* User Dropdown */}
              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-4 py-2.5 border-b border-slate-100">
                    <p className="text-sm font-bold text-[#0F172A]">
                      {displayName}
                    </p>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      {displayId}
                    </p>
                  </div>

                  <div className="py-1">
                    <button
                      type="button"
                      onClick={toggleDarkMode}
                      className="w-full px-4 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center justify-between transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {isDarkMode ? (
                          <Sun className="w-4 h-4 text-amber-500" />
                        ) : (
                          <Moon className="w-4 h-4 text-slate-500" />
                        )}
                        <span>{isDarkMode ? "Light Mode" : "Dark Mode"}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">Toggle</span>
                    </button>
                  </div>

                  <div className="border-t border-slate-100 pt-1">
                    <button
                      type="button"
                      onClick={() => signOut({ callbackUrl: "/login" })}
                      className="w-full px-4 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Tab Bar (shown only when viewport < 640px) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 h-14 flex items-center justify-around px-2 shadow-lg">
        {TABS.map(({ id, label }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange?.(id)}
              className={`flex-1 flex flex-col items-center justify-center py-1 text-xs font-medium transition-colors ${
                isActive
                  ? "text-indigo-600 font-bold"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <span>{label}</span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}
