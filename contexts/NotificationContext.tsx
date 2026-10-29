"use client";

/**
 * NotificationContext
 * -------------------
 * Provides notifications via authenticated server-side API polling (P-06).
 * No client-side Firebase SDK is used in the browser.
 *
 * - Targeted notifications: docs where studentId == currentUser.id
 * - Broadcasts: docs where isBroadcast == true
 * - Polling interval: 15s, plus on tab visibility change
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSession } from "next-auth/react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationType =
  | "PRINT_READY"
  | "PRINTING_STARTED"
  | "PRINT_CANCELLED"
  | "PAYMENT_CONFIRMED"
  | "BROADCAST";

export interface ClientNotification {
  id: string;
  studentId?: string;
  isBroadcast: boolean;
  type: NotificationType;
  title: string;
  message: string;
  jobId?: string;
  tokenNumber?: string;
  readBy: string[];
  createdAt: { seconds: number; nanoseconds?: number } | null;
  adminName?: string;
}

interface NotificationContextValue {
  notifications: ClientNotification[];
  unreadCount: number;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  isLoading: boolean;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const NotificationContext = createContext<NotificationContextValue>({
  notifications: [],
  unreadCount: 0,
  markRead: async () => {},
  markAllRead: async () => {},
  isLoading: true,
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export interface ActiveToast extends ClientNotification {
  toastId: string;
  visible: boolean;
}

// Helper icons for toasts matching NotificationBell's premium styles
function ToastIcon({ type }: { type: NotificationType }) {
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

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const [notifications, setNotifications] = useState<ClientNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toasts, setToasts] = useState<ActiveToast[]>([]);

  const knownIds = useRef<Set<string>>(new Set());
  const isInitialLoad = useRef(true);

  const triggerToast = useCallback((notification: ClientNotification) => {
    const toastId = `${notification.id}-${Date.now()}`;
    setToasts((prev) => [...prev, { ...notification, toastId, visible: true }]);

    // Auto-dismiss after 10 seconds
    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.toastId === toastId ? { ...t, visible: false } : t))
      );
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.toastId !== toastId));
      }, 300);
    }, 10000);
  }, []);

  const dismissToast = useCallback((toastId: string) => {
    setToasts((prev) =>
      prev.map((t) => (t.toastId === toastId ? { ...t, visible: false } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.toastId !== toastId));
    }, 300);
  }, []);

  const userId = session?.user?.id ?? "";

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;

    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;

      const data = await res.json();
      const list: ClientNotification[] = data.notifications || [];

      if (isInitialLoad.current) {
        list.forEach((n) => knownIds.current.add(n.id));
        isInitialLoad.current = false;
      } else {
        list.forEach((n) => {
          if (!knownIds.current.has(n.id)) {
            knownIds.current.add(n.id);
            if (!n.readBy.includes(userId)) {
              triggerToast(n);
            }
          }
        });
      }

      setNotifications(list);
    } catch {
      // Ignore network errors in polling
    } finally {
      setIsLoading(false);
    }
  }, [userId, triggerToast]);

  useEffect(() => {
    if (status === "loading") return;
    if (!userId) {
      setIsLoading(false);
      return;
    }

    // Reset tracking state on session user change
    knownIds.current.clear();
    isInitialLoad.current = true;

    // Fetch immediately
    fetchNotifications();

    // Poll every 15 seconds
    const interval = setInterval(fetchNotifications, 15000);

    // Refresh on tab visibility
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchNotifications();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [userId, status, fetchNotifications]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.readBy.includes(userId)).length,
    [notifications, userId]
  );

  const markRead = useCallback(
    async (id: string) => {
      if (!userId) return;
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id && !n.readBy.includes(userId)
            ? { ...n, readBy: [...n.readBy, userId] }
            : n
        )
      );

      await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });
    },
    [userId]
  );

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) =>
        n.readBy.includes(userId) ? n : { ...n, readBy: [...n.readBy, userId] }
      )
    );

    await fetch("/api/notifications/mark-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId: "all" }),
    });
  }, [userId]);

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, markRead, markAllRead, isLoading }}
    >
      {children}

      {/* Real-time Toast Messages Container */}
      <div className="fixed top-4 right-4 z-[999] flex flex-col gap-3 w-full max-w-sm pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => (
          <div
            key={toast.toastId}
            onClick={() => {
              if (toast.id) {
                markRead(toast.id);
                dismissToast(toast.toastId);
              }
            }}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border border-gray-200 bg-white shadow-lg transition-all duration-300 transform cursor-pointer hover:bg-gray-50 ${
              toast.visible
                ? "opacity-100 translate-y-0 scale-100"
                : "opacity-0 -translate-y-2 scale-95"
            }`}
            style={{
              animation: toast.visible ? "toast-slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)" : undefined,
            }}
          >
            {/* CSS Animation */}
            <style>{`
              @keyframes toast-slide-in {
                from { opacity: 0; transform: translateY(-20px) scale(0.9); }
                to { opacity: 1; transform: translateY(0) scale(1); }
              }
            `}</style>

            <ToastIcon type={toast.type} />

            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-xs font-semibold text-gray-900 leading-tight">
                {toast.title}
              </p>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                {toast.message}
              </p>
              {toast.tokenNumber && (
                <span className="inline-block text-[9px] font-semibold text-indigo-600 font-mono bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded mt-1">
                  #{toast.tokenNumber}
                </span>
              )}
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation(); // Avoid marking read when clicking the close button specifically
                dismissToast(toast.toastId);
              }}
              className="text-gray-400 hover:text-gray-700 transition-colors p-1 rounded-lg hover:bg-gray-100"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useNotifications() {
  return useContext(NotificationContext);
}
