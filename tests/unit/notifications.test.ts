import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as getNotifications } from "@/app/api/notifications/route";
import { POST as markReadPost } from "@/app/api/notifications/mark-read/route";
import { POST as broadcastPost } from "@/app/api/admin/notifications/broadcast/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/firestore/notifications", () => ({
  getNotificationsForUser: vi.fn(),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  createBroadcast: vi.fn(),
}));

import { getServerSession } from "next-auth";
import {
  getNotificationsForUser,
  markNotificationRead,
  markAllNotificationsRead,
  createBroadcast,
} from "@/lib/firestore/notifications";

describe("Notifications Security & Ownership (P-06)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/notifications", () => {
    it("rejects unauthenticated requests with 401", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const res = await getNotifications();
      expect(res.status).toBe(401);
    });

    it("rejects disabled users with 403", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "user-1", role: "STUDENT", disabled: true },
      } as any);

      const res = await getNotifications();
      expect(res.status).toBe(403);
    });

    it("returns user notifications and broadcast with Cache-Control: no-store", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "student-1", role: "STUDENT", admissionNumber: "ADM001" },
      } as any);

      const mockNotifs = [
        {
          id: "notif-1",
          studentId: "student-1",
          isBroadcast: false,
          type: "PRINT_READY",
          title: "Ready",
          message: "Job ready",
          readBy: [],
          createdAt: { seconds: 1700000000, nanoseconds: 0 },
        },
      ];
      vi.mocked(getNotificationsForUser).mockResolvedValueOnce(mockNotifs as any);

      const res = await getNotifications();
      expect(res.status).toBe(200);
      expect(res.headers.get("Cache-Control")).toContain("no-store");
      const data = await res.json();
      expect(data.notifications).toHaveLength(1);
      expect(data.notifications[0].id).toBe("notif-1");
      expect(getNotificationsForUser).toHaveBeenCalledWith("student-1");
    });
  });

  describe("POST /api/notifications/mark-read", () => {
    it("rejects unauthenticated requests with 401", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const req = new Request("http://localhost/api/notifications/mark-read", {
        method: "POST",
        body: JSON.stringify({ notificationId: "notif-1" }),
      });

      const res = await markReadPost(req);
      expect(res.status).toBe(401);
    });

    it("rejects invalid request body with 400", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "student-1", role: "STUDENT" },
      } as any);

      const req = new Request("http://localhost/api/notifications/mark-read", {
        method: "POST",
        body: JSON.stringify({ notificationId: "" }),
      });

      const res = await markReadPost(req);
      expect(res.status).toBe(400);
    });

    it("returns 403 when marking another user's targeted notification", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "student-attacker", role: "STUDENT" },
      } as any);

      vi.mocked(markNotificationRead).mockRejectedValueOnce(
        new Error("Forbidden: Notification does not belong to user")
      );

      const req = new Request("http://localhost/api/notifications/mark-read", {
        method: "POST",
        body: JSON.stringify({ notificationId: "victim-notif" }),
      });

      const res = await markReadPost(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("Forbidden");
    });

    it("marks single notification as read for session user", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "student-1", role: "STUDENT" },
      } as any);

      vi.mocked(markNotificationRead).mockResolvedValueOnce(undefined);

      const req = new Request("http://localhost/api/notifications/mark-read", {
        method: "POST",
        body: JSON.stringify({ notificationId: "notif-own" }),
      });

      const res = await markReadPost(req);
      expect(res.status).toBe(200);
      expect(markNotificationRead).toHaveBeenCalledWith("notif-own", "student-1");
    });

    it("marks all notifications as read when notificationId is 'all'", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "student-1", role: "STUDENT" },
      } as any);

      vi.mocked(markAllNotificationsRead).mockResolvedValueOnce(undefined);

      const req = new Request("http://localhost/api/notifications/mark-read", {
        method: "POST",
        body: JSON.stringify({ notificationId: "all" }),
      });

      const res = await markReadPost(req);
      expect(res.status).toBe(200);
      expect(markAllNotificationsRead).toHaveBeenCalledWith("student-1");
    });
  });

  describe("POST /api/admin/notifications/broadcast", () => {
    it("rejects STUDENT role with 403", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "student-1", role: "STUDENT" },
      } as any);

      const req = new Request("http://localhost/api/admin/notifications/broadcast", {
        method: "POST",
        body: JSON.stringify({ title: "Hi", message: "Notice" }),
      });

      const res = await broadcastPost(req);
      expect(res.status).toBe(403);
    });

    it("rejects broadcast with oversized title (>80 chars) with 400", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "admin-1", role: "ADMIN", locationId: "loc-1" },
      } as any);

      const req = new Request("http://localhost/api/admin/notifications/broadcast", {
        method: "POST",
        body: JSON.stringify({
          title: "A".repeat(81),
          message: "Valid message content",
        }),
      });

      const res = await broadcastPost(req);
      expect(res.status).toBe(400);
    });

    it("creates broadcast successfully for ADMIN", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "admin-1", name: "Admin Bob", role: "ADMIN", locationId: "loc-1" },
      } as any);

      vi.mocked(createBroadcast).mockResolvedValueOnce("broadcast-123");

      const req = new Request("http://localhost/api/admin/notifications/broadcast", {
        method: "POST",
        body: JSON.stringify({
          title: "Maintenance Notice",
          message: "Printers will restart at 6 PM.",
        }),
      });

      const res = await broadcastPost(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.notificationId).toBe("broadcast-123");
      expect(createBroadcast).toHaveBeenCalledWith({
        adminName: "Admin Bob",
        title: "Maintenance Notice",
        message: "Printers will restart at 6 PM.",
      });
    });
  });
});
