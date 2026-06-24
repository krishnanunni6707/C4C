"use client";

/**
 * NotificationBell
 * ─────────────────
 * Premium notification bell button with:
 *  - Animated red badge for unread count
 *  - Click-to-toggle dropdown panel
 *  - Per-item icons based on notification type
 *  - "Mark all read" action
 *  - Closes on outside click / Escape key
 */

import React, { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useNotifications, ClientNotification } from "@/contexts/NotificationContext";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(ts: ClientNotification["createdAt"]): string {
  if (!ts) return "";
  const ms = ts.seconds * 1000;
  const diff = Date.now() - ms;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function BellIcon({ hasUnread }: { hasUnread: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      className={`w-5 h-5 transition-colors ${hasUnread ? "text-indigo-400" : "text-gray-400"}`}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
      />
    </svg>
  );
}

function NotifIcon({ type }: { type: ClientNotification["type"] }) {
  const base = "w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-sm";
  switch (type) {
    case "PRINT_READY":
      return <div className={`${base} bg-green-500/10 text-green-400`}>🖨️</div>;
    case "PRINTING_STARTED":
      return <div className={`${base} bg-blue-500/10 text-blue-400`}>⚡</div>;
    case "PRINT_CANCELLED":
      return <div className={`${base} bg-red-500/10 text-red-400`}>❌</div>;
    case "PAYMENT_CONFIRMED":
      return <div className={`${base} bg-emerald-500/10 text-emerald-400`}>✅</div>;
    case "BROADCAST":
      return <div className={`${base} bg-indigo-500/10 text-indigo-400`}>📢</div>;
    default:
      return <div className={`${base} bg-gray-500/10 text-gray-400`}>🔔</div>;
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface NotificationBellProps {
  /** "dark" = student dark bg, "glass" = admin glass navbar */
  variant?: "dark" | "glass";
}

export default function NotificationBell({ variant = "dark" }: NotificationBellProps) {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const { data: session } = useSession();
  const userId = session?.user?.id ?? "";
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        !buttonRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const buttonCls = "relative p-2 rounded-xl hover:bg-slate-100 transition-colors focus:outline-none";

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        id="notification-bell-btn"
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        className={buttonCls}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
      >
        <BellIcon hasUnread={unreadCount > 0} />

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold leading-none animate-pulse ring-2 ring-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          ref={panelRef}
          id="notification-panel"
          className="fixed left-4 right-4 top-16 md:absolute md:left-auto md:right-0 md:top-full mt-2 w-auto md:w-[340px] max-w-none md:max-w-[calc(100vw-24px)] z-[200]"
          style={{
            animation: "notif-slide-in 0.18s cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          <style>{`
            @keyframes notif-slide-in {
              from { opacity: 0; transform: translateY(-8px) scale(0.97); }
              to   { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>

          <div
            className="rounded-2xl overflow-hidden shadow-xl border border-slate-200"
            style={{
              background: "rgba(255,255,255,0.98)",
              backdropFilter: "blur(24px)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-800">Notifications</span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold border border-indigo-100">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={() => { markAllRead(); }}
                  className="text-[11px] text-indigo-600 hover:text-indigo-700 font-semibold transition-colors"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Notification list */}
            <div className="max-h-[420px] overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#e2e8f0_transparent]">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-center px-6">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-2xl">
                    🔔
                  </div>
                  <p className="text-sm font-semibold text-slate-700">No notifications yet</p>
                  <p className="text-xs text-slate-400">You&apos;ll be notified when your print status changes.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {notifications.map((n) => (
                    <NotificationItem
                      key={n.id}
                      notification={n}
                      userId={userId}
                      onMarkRead={() => markRead(n.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-2.5 border-t border-slate-100 text-center bg-slate-50/50">
                <p className="text-[10px] text-slate-400">
                  Showing {notifications.length} notification{notifications.length !== 1 ? "s" : ""}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Notification Item ────────────────────────────────────────────────────────

function NotificationItem({
  notification: n,
  userId,
  onMarkRead,
}: {
  notification: ClientNotification;
  userId: string;
  onMarkRead: () => void;
}) {
  const isUnread = !n.readBy.includes(userId);

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3.5 cursor-pointer transition-all hover:bg-slate-50 ${
        isUnread ? "bg-indigo-50/30" : ""
      }`}
      onClick={onMarkRead}
    >
      <NotifIcon type={n.type} />
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center gap-2 justify-between">
          <p className={`text-xs font-semibold truncate ${isUnread ? "text-slate-900" : "text-slate-500"}`}>
            {n.title}
          </p>
          {isUnread && (
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
          )}
        </div>
        <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-2">{n.message}</p>
        <div className="flex items-center gap-2 pt-0.5">
          {n.tokenNumber && (
            <span className="text-[9px] font-bold text-indigo-600 font-mono bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">
              #{n.tokenNumber}
            </span>
          )}
          {n.adminName && n.isBroadcast && (
            <span className="text-[9px] text-slate-400">by {n.adminName}</span>
          )}
          <span className="text-[9px] text-slate-400 ml-auto">{formatRelativeTime(n.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}

