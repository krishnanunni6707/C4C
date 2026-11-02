"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Bell } from "lucide-react";
import { useNotifications } from "@/contexts/NotificationContext";
import ProfileButton from "./ProfileButton";

interface MobileHeaderProps {
  onOpenNotifications?: () => void;
  onOpenProfile?: () => void;
  className?: string;
  showBell?: boolean;
}

export default function MobileHeader({
  onOpenNotifications,
  onOpenProfile,
  className = "",
  showBell = true,
}: MobileHeaderProps) {
  const { unreadCount } = useNotifications();

  return (
    <header
      className={`sticky top-0 z-30 h-14 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 flex items-center justify-between transition-colors md:hidden ${className}`}
    >
      {/* Brand Logo */}
      <Link
        href="/student"
        className="flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg p-0.5"
        aria-label="QDoc Campus Print Home"
      >
        <Image
          src="/logo-new-updated-original.png"
          alt="QDoc"
          width={105}
          height={32}
          className="h-7 w-auto object-contain"
          priority
        />
      </Link>

      {/* Right Actions: Bell then Profile Avatar (gap: 8px) */}
      <div className="flex items-center gap-2">
        {showBell && (
          <button
            type="button"
            onClick={onOpenNotifications}
            className="relative min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label={
              unreadCount > 0
                ? `Open notifications, ${unreadCount} unread`
                : "Open notifications"
            }
          >
            <Bell className="w-5 h-5 text-slate-700" />
            {unreadCount > 0 && (
              <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white flex items-center justify-center" />
            )}
          </button>
        )}

        {showBell && <ProfileButton onClick={onOpenProfile} />}
      </div>
    </header>
  );
}
