"use client";

import React, { useState, useRef, useEffect } from "react";
import { signOut } from "next-auth/react";
import { ChevronDown, LogOut, User, Shield, Menu } from "lucide-react";
import LocationSwitcher, { LocationItem } from "./LocationSwitcher";
import NotificationBell from "@/components/ui/NotificationBell";

interface AdminTopBarProps {
  adminName?: string | null;
  adminRole?: string | null;
  adminEmail?: string | null;
  locations: LocationItem[];
  currentLocationId: string | null;
  currentLocationName?: string | null;
  isSuperAdmin: boolean;
  onMobileMenuToggle?: () => void;
  className?: string;
}

export default function AdminTopBar({
  adminName = "Admin",
  adminRole = "ADMIN",
  adminEmail,
  locations,
  currentLocationId,
  currentLocationName,
  isSuperAdmin,
  onMobileMenuToggle,
  className = "",
}: AdminTopBarProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const initial = (adminName || "Admin")[0].toUpperCase();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header
      className={`sticky top-0 bg-white/95 backdrop-blur-sm border-b border-slate-200/80 px-6 sm:px-8 py-3.5 z-40 flex items-center justify-between ${className}`}
    >
      {/* Left: Mobile hamburger + Location Switcher */}
      <div className="flex items-center gap-3">
        {onMobileMenuToggle && (
          <button
            type="button"
            onClick={onMobileMenuToggle}
            className="lg:hidden p-1.5 -ml-1 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Open sidebar navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <LocationSwitcher
          locations={locations}
          currentLocationId={currentLocationId}
          currentLocationName={currentLocationName}
          isSuperAdmin={isSuperAdmin}
        />
      </div>

      {/* Right: Notification Bell + Avatar & Dropdown */}
      <div className="flex items-center gap-4">
        {/* Notification Bell */}
        <NotificationBell variant="glass" />

        {/* User Avatar + Dropdown */}
        <div ref={userMenuRef} className="relative">
          <button
            type="button"
            id="admin-user-menu-btn"
            aria-haspopup="true"
            aria-expanded={isUserMenuOpen}
            onClick={() => setIsUserMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 py-1 pl-1 pr-2 rounded-full hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
              {initial}
            </div>
            <span className="text-xs font-semibold text-slate-800 hidden sm:inline-block">
              {adminName || "Admin"}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                isUserMenuOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {isUserMenuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-900 truncate">{adminName}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Shield className="w-3 h-3 text-indigo-600" />
                  <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                    {adminRole}
                  </span>
                </div>
                {adminEmail && (
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">{adminEmail}</p>
                )}
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-left"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
