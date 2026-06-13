"use client";

/**
 * NotificationContext
 * -------------------
 * Provides real-time notifications via Firestore onSnapshot listeners.
 * - Targeted notifications: docs where studentId == currentUser.id
 * - Broadcasts: docs where isBroadcast == true
 *
 * The context is safe to mount for any role (STUDENT, ADMIN, SUPER_ADMIN).
 * Admins only see broadcasts (not student-targeted notifications).
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
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  Timestamp,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";

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
  createdAt: Timestamp | null;
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
  const [targeted, setTargeted] = useState<ClientNotification[]>([]);
  const [broadcasts, setBroadcasts] = useState<ClientNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toasts, setToasts] = useState<ActiveToast[]>([]);

  const knownIds = useRef<Set<string>>(new Set());
  const isFirstTargeted = useRef(true);
  const isFirstBroadcast = useRef(true);

  const unsub1 = useRef<Unsubscribe | null>(null);
  const unsub2 = useRef<Unsubscribe | null>(null);

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

  useEffect(() => {
    // Only subscribe when session is ready
    if (status === "loading") return;
    if (!session?.user?.id) {
      setIsLoading(false);
      return;
    }

    const userId = session.user.id;
    const colRef = collection(db, "notifications");

    let targetedLoaded = false;
    let broadcastLoaded = false;

    // Reset tracking refs on session change
    knownIds.current.clear();
    isFirstTargeted.current = true;
    isFirstBroadcast.current = true;

    const checkLoaded = () => {
      if (targetedLoaded && broadcastLoaded) setIsLoading(false);
    };

    // --- Listener 1: notifications targeted at this user ---
    const targetedQ = query(
      colRef,
      where("studentId", "==", userId),
      orderBy("createdAt", "desc")
    );

    unsub1.current = onSnapshot(
      targetedQ,
      (snap) => {
        const docs = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<ClientNotification, "id">),
        }));

        if (isFirstTargeted.current) {
          docs.forEach((doc) => knownIds.current.add(doc.id));
          isFirstTargeted.current = false;
        } else {
          docs.forEach((doc) => {
            if (!knownIds.current.has(doc.id)) {
              knownIds.current.add(doc.id);
              if (!doc.readBy.includes(userId)) {
                triggerToast(doc);
              }
            }
          });
        }

        setTargeted(docs);
        if (!targetedLoaded) {
          targetedLoaded = true;
          checkLoaded();
        }
      },
      (err) => {
        console.error("[NotificationContext] targeted listener error:", err.code, err.message);
        // Still mark as loaded so app doesn't hang
        if (!targetedLoaded) { targetedLoaded = true; checkLoaded(); }
      }
    );

    // --- Listener 2: broadcast notifications ---
    const broadcastQ = query(
      colRef,
      where("isBroadcast", "==", true),
      orderBy("createdAt", "desc")
    );

    unsub2.current = onSnapshot(
      broadcastQ,
      (snap) => {
        const docs = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<ClientNotification, "id">),
        }));

        if (isFirstBroadcast.current) {
          docs.forEach((doc) => knownIds.current.add(doc.id));
          isFirstBroadcast.current = false;
        } else {
          docs.forEach((doc) => {
            if (!knownIds.current.has(doc.id)) {
              knownIds.current.add(doc.id);
              if (!doc.readBy.includes(userId)) {
                triggerToast(doc);
              }
            }
          });
        }

        setBroadcasts(docs);
        if (!broadcastLoaded) {
          broadcastLoaded = true;
          checkLoaded();
        }
      },
      (err) => {
        console.error("[NotificationContext] broadcast listener error:", err.code, err.message);
        if (!broadcastLoaded) { broadcastLoaded = true; checkLoaded(); }
      }
    );

    return () => {
      unsub1.current?.();
      unsub2.current?.();
    };
  }, [session?.user?.id, status, triggerToast]);

  // Merge + de-duplicate (broadcasts could theoretically also have studentId)
  const notifications = useMemo<ClientNotification[]>(() => {
    const map = new Map<string, ClientNotification>();
    [...targeted, ...broadcasts].forEach((n) => map.set(n.id, n));
    return Array.from(map.values()).sort((a, b) => {
      const aTime = a.createdAt?.seconds ?? 0;
      const bTime = b.createdAt?.seconds ?? 0;
      return bTime - aTime;
    });
  }, [targeted, broadcasts]);

  const userId = session?.user?.id ?? "";

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.readBy.includes(userId)).length,
    [notifications, userId]
  );

  const markRead = useCallback(
    async (id: string) => {
      if (!userId) return;
      // Optimistic update — server will confirm via onSnapshot
      const update = (prev: ClientNotification[]) =>
        prev.map((n) =>
          n.id === id && !n.readBy.includes(userId)
            ? { ...n, readBy: [...n.readBy, userId] }
            : n
        );
      setTargeted((p) => update(p));
      setBroadcasts((p) => update(p));

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
    const update = (prev: ClientNotification[]) =>
      prev.map((n) =>
        n.readBy.includes(userId) ? n : { ...n, readBy: [...n.readBy, userId] }
      );
    setTargeted((p) => update(p));
    setBroadcasts((p) => update(p));

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
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border border-[#1e2235] shadow-2xl transition-all duration-300 transform cursor-pointer hover:bg-white/[0.04] ${
              toast.visible
                ? "opacity-100 translate-y-0 scale-100"
                : "opacity-0 -translate-y-2 scale-95"
            }`}
            style={{
              background: "rgba(13, 15, 28, 0.95)",
              backdropFilter: "blur(16px)",
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
              <p className="text-xs font-bold text-white leading-tight">
                {toast.title}
              </p>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                {toast.message}
              </p>
              {toast.tokenNumber && (
                <span className="inline-block text-[9px] font-bold text-indigo-400 font-mono bg-indigo-500/10 px-1.5 py-0.5 rounded mt-1">
                  #{toast.tokenNumber}
                </span>
              )}
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation(); // Avoid marking read when clicking the close button specifically
                dismissToast(toast.toastId);
              }}
              className="text-gray-500 hover:text-gray-300 transition-colors p-1 rounded-lg hover:bg-white/5"
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
