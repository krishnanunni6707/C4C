import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs";
import path from "path";
import { POST as clearDbPost } from "@/app/api/admin/db/clear/route";
import bcrypt from "bcryptjs";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/firestore/activity-logs", () => ({
  createActivityLog: vi.fn(),
}));

const mockBatchCommit = vi.fn().mockResolvedValue([]);
const mockBatchDelete = vi.fn();
const mockSuperAdminDoc = {
  exists: true,
  data: () => ({
    id: "super-1",
    name: "Super Admin",
    role: "SUPER_ADMIN",
    passwordHash: bcrypt.hashSync("CorrectPassword123!", 4),
  }),
};

vi.mock("@/lib/firebase/admin", () => ({
  adminDb: {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: vi.fn().mockResolvedValue(mockSuperAdminDoc),
      })),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue({
        size: 0,
        docs: [],
      }),
    })),
    batch: vi.fn(() => ({
      delete: mockBatchDelete,
      commit: mockBatchCommit,
    })),
  },
}));

import { getServerSession } from "next-auth";
import { createActivityLog } from "@/lib/firestore/activity-logs";

describe("Dangerous & Debug Routes Removal (P-08)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ALLOW_DB_CLEAR;
  });

  describe("Verification of Removed Dangerous & Debug Routes", () => {
    const removedPaths = [
      "app/api/firebase-init",
      "app/api/firebase-test",
      "app/api/cloudinary-test",
      "app/api/seed-users",
      "app/api/admin/bootstrap-super-admin",
      "app/test-session",
      "app/api/admin/migrate-locations",
    ];

    removedPaths.forEach((relPath) => {
      it(`confirms ${relPath} is completely removed from the repository`, () => {
        const fullPath = path.resolve(process.cwd(), relPath);
        expect(fs.existsSync(fullPath)).toBe(false);
      });
    });
  });

  describe("POST /api/admin/db/clear Hardening", () => {
    it("returns 404 in production environment", async () => {
      const origEnv = process.env.NODE_ENV;
      try {
        (process.env as any).NODE_ENV = "production";
        process.env.ALLOW_DB_CLEAR = "1";

        const req = new Request("http://localhost/api/admin/db/clear", {
          method: "POST",
          body: JSON.stringify({
            target: "printJobs",
            password: "CorrectPassword123!",
            confirmation: "DELETE",
          }),
        });

        const res = await clearDbPost(req);
        expect(res.status).toBe(404);
      } finally {
        (process.env as any).NODE_ENV = origEnv;
      }
    });

    it("returns 403 if ALLOW_DB_CLEAR is not '1'", async () => {
      delete process.env.ALLOW_DB_CLEAR;

      const req = new Request("http://localhost/api/admin/db/clear", {
        method: "POST",
        body: JSON.stringify({
          target: "printJobs",
          password: "CorrectPassword123!",
          confirmation: "DELETE",
        }),
      });

      const res = await clearDbPost(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toMatch(/ALLOW_DB_CLEAR!=1/);
    });

    it("rejects non-SUPER_ADMIN (e.g. regular ADMIN) with 403", async () => {
      process.env.ALLOW_DB_CLEAR = "1";
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "admin-1", role: "ADMIN", locationId: "loc-1" },
      } as any);

      const req = new Request("http://localhost/api/admin/db/clear", {
        method: "POST",
        body: JSON.stringify({
          target: "printJobs",
          password: "CorrectPassword123!",
          confirmation: "DELETE",
        }),
      });

      const res = await clearDbPost(req);
      expect(res.status).toBe(403);
    });

    it("rejects request when confirmation string does not match", async () => {
      process.env.ALLOW_DB_CLEAR = "1";
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "super-1", role: "SUPER_ADMIN" },
      } as any);

      const req = new Request("http://localhost/api/admin/db/clear", {
        method: "POST",
        body: JSON.stringify({
          target: "printJobs",
          password: "CorrectPassword123!",
          confirmation: "WRONG_PHRASE",
        }),
      });

      const res = await clearDbPost(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/Confirmation mismatch/);
    });

    it("rejects request when password verification fails", async () => {
      process.env.ALLOW_DB_CLEAR = "1";
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "super-1", role: "SUPER_ADMIN" },
      } as any);

      const req = new Request("http://localhost/api/admin/db/clear", {
        method: "POST",
        body: JSON.stringify({
          target: "printJobs",
          password: "WrongPassword999!",
          confirmation: "DELETE",
        }),
      });

      const res = await clearDbPost(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toMatch(/Invalid password/);
    });

    it("successfully clears target and creates audit log when all conditions are satisfied", async () => {
      process.env.ALLOW_DB_CLEAR = "1";
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "super-1", role: "SUPER_ADMIN" },
      } as any);

      const req = new Request("http://localhost/api/admin/db/clear", {
        method: "POST",
        body: JSON.stringify({
          target: "printJobs",
          password: "CorrectPassword123!",
          confirmation: "DELETE",
        }),
      });

      const res = await clearDbPost(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);

      expect(createActivityLog).toHaveBeenCalledWith(
        expect.objectContaining({
          adminId: "super-1",
          action: "DATABASE_CLEARED",
          targetId: "printJobs",
        })
      );
    });
  });
});
