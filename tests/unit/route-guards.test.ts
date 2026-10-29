import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs";
import path from "path";
import {
  requireRole,
  requireAdmin,
  requireJobAccess,
} from "@/lib/api/guards";

// Mock next-auth
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

// Mock firestore print jobs
vi.mock("@/lib/firestore/print-jobs", () => ({
  getPrintJobById: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { getPrintJobById } from "@/lib/firestore/print-jobs";

describe("API Route Authorization & Guards (P-05)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("API Route Audit: Every route calls a guard or is explicitly allowlisted", () => {
    const PUBLIC_ALLOWLIST = [
      "app/api/auth/[...nextauth]/route.ts",
      "app/api/payment/razorpay/webhook/route.ts",
      "app/api/cron/cleanup/route.ts",
    ];

    function findRouteFiles(dir: string, fileList: string[] = []): string[] {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          findRouteFiles(fullPath, fileList);
        } else if (entry.isFile() && entry.name === "route.ts") {
          fileList.push(fullPath);
        }
      }
      return fileList;
    }

    const apiDir = path.resolve(process.cwd(), "app/api");
    const routeFiles = findRouteFiles(apiDir);

    it("finds route files under app/api", () => {
      expect(routeFiles.length).toBeGreaterThan(15);
    });

    for (const filePath of routeFiles) {
      const relPath = path.relative(process.cwd(), filePath).replace(/\\/g, "/");
      it(`route ${relPath} must enforce a guard or be in the explicit public allowlist`, () => {
        if (PUBLIC_ALLOWLIST.includes(relPath)) {
          expect(true).toBe(true);
          return;
        }

        const content = fs.readFileSync(filePath, "utf-8");
        const hasGuard =
          content.includes("requireRole") ||
          content.includes("requireAdmin") ||
          content.includes("requireJobAccess") ||
          content.includes("adminJobGuard");

        if (!hasGuard) {
          throw new Error(
            `Route [${relPath}] does not call any route guard (requireRole, requireAdmin, requireJobAccess, adminJobGuard) and is not on the public allowlist.`
          );
        }

        expect(hasGuard).toBe(true);
      });
    }
  });

  describe("requireRole guard", () => {
    it("returns 401 when no session is present", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const res = await requireRole("STUDENT");
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.response.status).toBe(401);
      }
    });

    it("returns 403 when user is disabled", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "user-1", role: "STUDENT", disabled: true },
      } as any);

      const res = await requireRole("STUDENT");
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.response.status).toBe(403);
      }
    });

    it("returns 403 when user does not have required role", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "user-1", role: "STUDENT" },
      } as any);

      const res = await requireRole(["ADMIN", "SUPER_ADMIN"]);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.response.status).toBe(403);
      }
    });

    it("returns ok: true when user has matching role", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "user-1", role: "SUPER_ADMIN" },
      } as any);

      const res = await requireRole("SUPER_ADMIN");
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.session.user.id).toBe("user-1");
      }
    });
  });

  describe("requireAdmin guard", () => {
    it("rejects non-admin role with 403", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "student-1", role: "STUDENT" },
      } as any);

      const res = await requireAdmin(true);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.response.status).toBe(403);
      }
    });

    it("rejects ADMIN with missing locationId when location-scoped", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "admin-1", role: "ADMIN", locationId: undefined },
      } as any);

      const res = await requireAdmin(true);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.response.status).toBe(403);
      }
    });

    it("accepts ADMIN with assigned locationId", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "admin-1", role: "ADMIN", locationId: "loc-library" },
      } as any);

      const res = await requireAdmin(true);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.locationId).toBe("loc-library");
        expect(res.isSuperAdmin).toBe(false);
      }
    });

    it("accepts SUPER_ADMIN globally without requiring locationId", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "super-1", role: "SUPER_ADMIN" },
      } as any);

      const res = await requireAdmin(true);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.isSuperAdmin).toBe(true);
      }
    });
  });

  describe("requireJobAccess guard", () => {
    it("returns 404 when job does not exist", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "student-1", role: "STUDENT" },
      } as any);
      vi.mocked(getPrintJobById).mockResolvedValueOnce(null);

      const res = await requireJobAccess("nonexistent-job", "read");
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.response.status).toBe(404);
      }
    });

    it("permits STUDENT to read their own job", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "student-1", role: "STUDENT" },
      } as any);
      vi.mocked(getPrintJobById).mockResolvedValueOnce({
        id: "job-1",
        studentId: "student-1",
        locationId: "loc-1",
      } as any);

      const res = await requireJobAccess("job-1", "read");
      expect(res.ok).toBe(true);
    });

    it("rejects STUDENT attempting to read someone else's job with 403", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "student-attacker", role: "STUDENT" },
      } as any);
      vi.mocked(getPrintJobById).mockResolvedValueOnce({
        id: "job-1",
        studentId: "student-victim",
        locationId: "loc-1",
      } as any);

      const res = await requireJobAccess("job-1", "read");
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.response.status).toBe(403);
      }
    });

    it("rejects STUDENT attempting to write to their job with 403", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "student-1", role: "STUDENT" },
      } as any);
      vi.mocked(getPrintJobById).mockResolvedValueOnce({
        id: "job-1",
        studentId: "student-1",
        locationId: "loc-1",
      } as any);

      const res = await requireJobAccess("job-1", "write");
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.response.status).toBe(403);
      }
    });

    it("rejects ADMIN attempting to access job from another location with 403", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "admin-1", role: "ADMIN", locationId: "loc-campus-a" },
      } as any);
      vi.mocked(getPrintJobById).mockResolvedValueOnce({
        id: "job-1",
        studentId: "student-1",
        locationId: "loc-campus-b",
      } as any);

      const res = await requireJobAccess("job-1", "write");
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.response.status).toBe(403);
      }
    });

    it("permits ADMIN to access job from their assigned location", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "admin-1", role: "ADMIN", locationId: "loc-campus-a" },
      } as any);
      vi.mocked(getPrintJobById).mockResolvedValueOnce({
        id: "job-1",
        studentId: "student-1",
        locationId: "loc-campus-a",
      } as any);

      const res = await requireJobAccess("job-1", "write");
      expect(res.ok).toBe(true);
    });

    it("permits SUPER_ADMIN to access job from any location", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "super-1", role: "SUPER_ADMIN" },
      } as any);
      vi.mocked(getPrintJobById).mockResolvedValueOnce({
        id: "job-1",
        studentId: "student-1",
        locationId: "loc-campus-remote",
      } as any);

      const res = await requireJobAccess("job-1", "write");
      expect(res.ok).toBe(true);
    });
  });
});
