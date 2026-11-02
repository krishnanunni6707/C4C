"use client";

import React from "react";
import { Check, CheckCircle2, Info, Printer } from "lucide-react";
import { useNotifications, ClientNotification } from "@/contexts/NotificationContext";
import { useSession } from "next-auth/react";

function formatRelativeTime(createdAt: ClientNotification["createdAt"]): string {
  if (!createdAt) return "Just now";
  let timestampMs: number;
  if (typeof createdAt === "object" && createdAt !== null && "seconds" in createdAt) {
    timestampMs = createdAt.seconds * 1000;
  } else if (typeof createdAt === "string" || typeof createdAt === "number") {
    timestampMs = new Date(createdAt).getTime();
  } else {
    return "Just now";
  }

  const diffSeconds = Math.floor((Date.now() - timestampMs) / 1000);
  if (diffSeconds < 60) return "Just now";
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function NotificationIcon({ type }: { type: ClientNotification["type"] }) {
  switch (type) {
    case "PRINT_READY":
    case "PAYMENT_CONFIRMED":
      return (
        <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
          <Check className="w-4 h-4 stroke-[2.5]" />
        </div>
      );
    case "PRINTING_STARTED":
      return (
        <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
          <Printer className="w-4 h-4 stroke-[2]" />
        </div>
      );
    default:
      return (
        <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
          <Info className="w-4 h-4 stroke-[2]" />
        </div>
      );
  }
}

const DEFAULT_NOTIFICATIONS: ClientNotification[] = [
  {
    id: "notif-1",
    type: "PRINTING_STARTED",
    title: "Your job RP1043 is now Printing",
    message: "Your job RP1043 is now Printing",
    isBroadcast: false,
    readBy: [],
    createdAt: { seconds: Math.floor(Date.now() / 1000) - 120 },
  },
  {
    id: "notif-2",
    type: "PAYMENT_CONFIRMED",
    title: "Payment confirmed ₹68.00",
    message: "Payment confirmed ₹68.00",
    isBroadcast: false,
    readBy: [],
    createdAt: { seconds: Math.floor(Date.now() / 1000) - 300 },
  },
  {
    id: "notif-3",
    type: "BROADCAST",
    title: "Welcome to QDoc!",
    message: "Welcome to QDoc!",
    isBroadcast: true,
    readBy: ["student-demo"],
    createdAt: { seconds: Math.floor(Date.now() / 1000) - 86400 },
  },
];

export interface NotificationsPanelProps {
  customNotifications?: ClientNotification[];
}

export default function NotificationsPanel({ customNotifications }: NotificationsPanelProps) {
  const { notifications, markRead, markAllRead } = useNotifications();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? "student-demo";

  // Use live notifications, or custom, or default screenshot sample
  const effectiveList =
    customNotifications ??
    (notifications.length > 0 ? notifications : DEFAULT_NOTIFICATIONS);

  // Display top 5 items
  const recentNotifications = effectiveList.slice(0, 5);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-1 border-b border-slate-100">
        <h3 className="text-sm font-bold text-[#0F172A] tracking-tight">
          Recent Notifications
        </h3>
        <button
          type="button"
          onClick={() => markAllRead()}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 transition-colors focus:outline-none focus-visible:underline"
        >
          Mark all read
        </button>
      </div>

      {/* Notification List */}
      {recentNotifications.length === 0 ? (
        <div className="py-8 text-center space-y-1">
          <div className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 stroke-[1.5]" />
          </div>
          <p className="text-xs font-medium text-slate-500">
            You&apos;re all caught up
          </p>
        </div>
      ) : (
        <div className="space-y-3.5 divide-y divide-slate-100">
          {recentNotifications.map((notif, index) => {
            const isUnread = !notif.readBy.includes(currentUserId);
            return (
              <div
                key={notif.id}
                onClick={() => {
                  if (isUnread) markRead(notif.id);
                }}
                className={`flex items-start gap-3 pt-3 first:pt-0 group transition-colors ${
                  isUnread ? "cursor-pointer" : ""
                }`}
              >
                <NotificationIcon type={notif.type} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 leading-snug line-clamp-2">
                    {notif.title || notif.message}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {formatRelativeTime(notif.createdAt)}
                  </p>
                </div>
                {isUnread && (
                  <span
                    className="w-2 h-2 rounded-full bg-indigo-600 flex-shrink-0 mt-1.5"
                    title="Unread notification"
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
