"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import {
  X,
  Bell,
  Clock,
  Moon,
  Sun,
  LogOut,
  ChevronRight,
  AlertTriangle,
  GraduationCap,
} from "lucide-react";
import { useNotifications } from "@/contexts/NotificationContext";
import { useTheme } from "@/contexts/ThemeContext";

interface ProfileSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenNotifications?: () => void;
  onNavigateHistory?: () => void;
}

export default function ProfileSheet({
  isOpen,
  onClose,
  onOpenNotifications,
  onNavigateHistory,
}: ProfileSheetProps) {
  const { data: session } = useSession();
  const { unreadCount } = useNotifications();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus management & Escape key listener
  useEffect(() => {
    if (!isOpen) {
      setShowSignOutConfirm(false);
      return;
    }

    const timer = setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const userName = session?.user?.name || "Student User";
  const admissionNumber = session?.user?.admissionNumber || "";
  const department = session?.user?.department;
  const semester = session?.user?.semester;
  const initial = userName.trim().charAt(0).toUpperCase() || "S";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-sheet-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-md p-0 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        ref={sheetRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[440px] bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-100 p-6 space-y-5 animate-in slide-in-from-bottom duration-200 relative max-h-[90vh] overflow-y-auto"
      >
        {/* Mobile Drag Handle */}
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto -mt-2 mb-2" aria-hidden="true" />

        {/* Top Header / Close */}
        <div className="flex items-center justify-between pb-1">
          <h2
            id="profile-sheet-title"
            className="text-lg font-bold text-[#0F172A] tracking-tight"
          >
            My Profile
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label="Close profile sheet"
          >
            <X className="w-5 h-5 stroke-[2]" />
          </button>
        </div>

        {/* User Card: Large Avatar & Metadata */}
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50/80 border border-slate-100">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-white font-black text-xl shadow-md shadow-indigo-500/20 flex items-center justify-center flex-shrink-0 select-none ring-4 ring-indigo-50">
            {initial}
          </div>
          <div className="min-w-0 flex-1 space-y-0.5">
            <h3 className="text-base font-bold text-[#0F172A] truncate">
              {userName}
            </h3>
            {admissionNumber && (
              <p className="text-xs font-mono font-medium text-slate-500 truncate">
                {admissionNumber}
              </p>
            )}
            {(department || semester) && (
              <div className="flex items-center gap-1.5 pt-0.5">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100/80 px-2 py-0.5 rounded-md">
                  <GraduationCap className="w-3 h-3 text-indigo-600" />
                  <span>
                    {department}
                    {department && semester ? " · " : ""}
                    {semester ? `Sem ${semester}` : ""}
                  </span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action Rows */}
        <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white shadow-xs overflow-hidden">
          {/* Notifications Row */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenNotifications?.();
            }}
            className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 active:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:bg-slate-50"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Bell className="w-4 h-4 stroke-[2]" />
              </div>
              <span className="text-sm font-semibold text-slate-700">Notifications</span>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[11px] font-bold">
                  {unreadCount}
                </span>
              )}
              <ChevronRight className="w-4 h-4 text-slate-400 stroke-[2]" />
            </div>
          </button>

          {/* Print History Row */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onNavigateHistory?.();
            }}
            className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 active:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:bg-slate-50"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Clock className="w-4 h-4 stroke-[2]" />
              </div>
              <span className="text-sm font-semibold text-slate-700">Print history</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 stroke-[2]" />
          </button>

          {/* Dark Mode Toggle Row */}
          <div className="w-full px-4 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                {isDarkMode ? (
                  <Sun className="w-4 h-4 stroke-[2]" />
                ) : (
                  <Moon className="w-4 h-4 stroke-[2]" />
                )}
              </div>
              <span className="text-sm font-semibold text-slate-700">Dark mode</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isDarkMode}
              onClick={toggleDarkMode}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                isDarkMode ? "bg-indigo-600" : "bg-slate-200"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-xs ${
                  isDarkMode ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Sign Out Section with Confirmation */}
        <div className="pt-1">
          {showSignOutConfirm ? (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200/80 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 text-rose-800">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                <span className="text-xs font-bold">Sign out of QDoc?</span>
              </div>
              <p className="text-[11px] text-rose-700/90 leading-relaxed">
                You will need to re-enter your admission number and password to access your prints.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowSignOutConfirm(false)}
                  className="flex-1 h-9 rounded-xl border border-rose-200 bg-white text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex-1 h-9 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors"
                >
                  Confirm Sign Out
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowSignOutConfirm(true)}
              className="w-full h-11 rounded-xl bg-rose-50 hover:bg-rose-100/80 border border-rose-200/60 text-rose-600 font-semibold text-sm flex items-center justify-center gap-2 transition-colors active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            >
              <LogOut className="w-4 h-4 stroke-[2]" />
              <span>Sign out</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
