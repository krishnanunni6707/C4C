"use client";

import React from "react";
import {
  Printer,
  CheckCircle2,
  Info,
  Megaphone,
  Bell,
  Sparkles,
  X,
} from "lucide-react";
import { useNotifications } from "@/contexts/NotificationContext";

interface NotificationsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export interface MobileNotificationItem {
  id: string;
  type: "PRINT" | "PAYMENT" | "WELCOME" | "BROADCAST" | string;
  title: string;
  message?: string;
  timestamp: string;
  isRead: boolean;
}

const DEFAULT_MOCK_NOTIFICATIONS: MobileNotificationItem[] = [
  {
    id: "notif-1",
    type: "PRINT",
    title: "Your job RP1042 is now Printing",
    timestamp: "2m ago",
    isRead: false,
  },
  {
    id: "notif-2",
    type: "PAYMENT",
    title: "Payment confirmed ₹68.00",
    timestamp: "5m ago",
    isRead: false,
  },
  {
    id: "notif-3",
    type: "WELCOME",
    title: "Welcome to QDoc!",
    timestamp: "1d ago",
    isRead: true,
  },
  {
    id: "notif-4",
    type: "BROADCAST",
    title: "Maintenance on 31 Oct from 10 AM to 12 PM",
    timestamp: "1d ago",
    isRead: true,
  },
];

function getNotificationIcon(type: string) {
  switch (type.toUpperCase()) {
    case "PRINT":
    case "PRINTING_STARTED":
    case "PRINT_READY":
      return (
        <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
          <Printer className="w-4 h-4 stroke-[2]" />
        </div>
      );
    case "PAYMENT":
    case "PAYMENT_CONFIRMED":
      return (
        <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
          <CheckCircle2 className="w-4 h-4 stroke-[2]" />
        </div>
      );
    case "BROADCAST":
      return (
        <div className="w-8 h-8 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
          <Megaphone className="w-4 h-4 stroke-[2]" />
        </div>
      );
    default:
      return (
        <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
          <Info className="w-4 h-4 stroke-[2]" />
        </div>
      );
  }
}

export default function NotificationsSheet({
  isOpen,
  onClose,
  className = "",
}: NotificationsSheetProps) {
  const { notifications, markRead, markAllRead } = useNotifications();

  if (!isOpen) return null;

  // Map real context notifications, or fallback to default mock if list is empty
  const items: MobileNotificationItem[] =
    notifications.length > 0
      ? notifications.map((n) => {
          let relTime = "just now";
          if (n.createdAt?.seconds) {
            const diffSec = Math.floor(
              Date.now() / 1000 - n.createdAt.seconds
            );
            if (diffSec < 60) relTime = "just now";
            else if (diffSec < 3600) relTime = `${Math.floor(diffSec / 60)}m ago`;
            else if (diffSec < 86400)
              relTime = `${Math.floor(diffSec / 3600)}h ago`;
            else relTime = `${Math.floor(diffSec / 86400)}d ago`;
          }
          return {
            id: n.id,
            type: n.type,
            title: n.title,
            message: n.message,
            timestamp: relTime,
            isRead: false,
          };
        })
      : DEFAULT_MOCK_NOTIFICATIONS;

  const hasUnread = items.some((i) => !i.isRead);

  const handleMarkAll = async () => {
    try {
      await markAllRead();
    } catch {
      // ignore
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="notifications-title"
      className="absolute inset-0 z-50 flex items-start justify-center bg-slate-900/40 backdrop-blur-md p-3 pt-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[420px] bg-white rounded-3xl shadow-2xl border border-slate-100 p-5 space-y-4 animate-in slide-in-from-top-4 duration-200"
      >
        {/* Header: Title, Mark all read, Close */}
        <div className="flex items-center justify-between pb-1 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <h2
              id="notifications-title"
              className="text-base font-bold text-[#0F172A]"
            >
              Notifications
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleMarkAll}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              Mark all read
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Close notifications"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-0.5 divide-y divide-slate-50">
          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => markRead(item.id)}
              className="pt-2.5 pb-2.5 flex items-start gap-3 hover:bg-slate-50/70 rounded-xl px-2 transition-colors cursor-pointer"
            >
              {getNotificationIcon(item.type)}

              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-[#0F172A] leading-snug">
                  {item.title}
                </p>
                {item.message && (
                  <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                    {item.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                <span className="text-[10px] text-slate-400 font-medium">
                  {item.timestamp}
                </span>
                {!item.isRead && (
                  <span className="w-2 h-2 rounded-full bg-indigo-600" />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer / All Caught Up */}
        <div className="pt-3 border-t border-slate-100 flex flex-col items-center justify-center text-center pb-1">
          <div className="relative mb-1.5">
            <Bell className="w-6 h-6 text-slate-300 stroke-[1.5]" />
            <Sparkles className="w-3 h-3 text-indigo-400 absolute -top-1 -right-1" />
          </div>
          <p className="text-xs font-bold text-slate-700">No new notifications</p>
          <p className="text-[11px] text-slate-400">You&apos;re all caught up!</p>
        </div>
      </div>
    </div>
  );
}
