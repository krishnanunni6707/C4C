"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { signOut } from "next-auth/react";
import { ChevronDown, LogOut } from "lucide-react";
import NotificationBell from "@/components/ui/NotificationBell";

export type StudentNavTab = "new" | "active" | "history" | "locations";

interface StudentTopBarProps {
  activeTab: StudentNavTab;
  onTabChange: (tab: StudentNavTab) => void;
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

export default function StudentTopBar({
  activeTab,
  onTabChange,
  activeJobsCount = 0,
  userName = "Student",
  admissionNumber,
}: StudentTopBarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const displayName = userName || "Student";
  const displayId = admissionNumber || "CS21B042";
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
    <header className="sticky top-0 z-40 h-[68px] bg-white border-b border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
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

        {/* Centre: Navigation Tabs */}
        <nav
          className="hidden md:flex items-center h-full gap-8"
          aria-label="Student Navigation"
        >
          {TABS.map(({ id, label }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onTabChange(id)}
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
                {/* 2px active underline at the bottom of the bar */}
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

        {/* Right: Notifications & User Chip */}
        <div className="flex items-center gap-4">
          {/* Notification Bell */}
          <div className="flex items-center">
            <NotificationBell />
          </div>

          {/* Divider-less User Chip */}
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen((o) => !o)}
              className="flex items-center gap-3 p-1 rounded-xl hover:bg-slate-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              aria-label={`User menu for ${displayName}`}
              aria-expanded={dropdownOpen}
            >
              {/* 40px circle avatar */}
              <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold text-base flex items-center justify-center flex-shrink-0 shadow-sm shadow-indigo-600/20">
                {initial}
              </div>

              {/* Name & Admission Number */}
              <div className="text-left hidden sm:block">
                <p className="text-[15px] font-bold text-[#0F172A] leading-tight">
                  {displayName}
                </p>
                <p className="text-[13px] text-slate-500 font-normal leading-tight mt-0.5">
                  {displayId}
                </p>
              </div>

              <ChevronDown
                className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
                  dropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* User Dropdown */}
            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-4 py-2 border-b border-slate-100 sm:hidden">
                  <p className="text-sm font-bold text-[#0F172A]">{displayName}</p>
                  <p className="text-xs text-slate-500">{displayId}</p>
                </div>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="w-full px-4 py-2 text-left text-sm font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
