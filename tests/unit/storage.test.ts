import { describe, it, expect, vi, beforeEach } from "vitest";
import { getSignedAssetUrl, destroyAsset } from "@/lib/storage/cloudinary";
import { GET as fileGet } from "@/app/api/admin/jobs/[id]/file/route";
import { POST as cleanupPost } from "@/app/api/cron/cleanup/route";

// Mock adminJobGuard
vi.mock("@/lib/api/admin-job-guard", () => ({
  adminJobGuard: vi.fn(),
}));

// Mock firestore
vi.mock("@/lib/firestore/uploads", () => ({
  getUploadRecord: vi.fn(),
}));

vi.mock("@/lib/firestore/settings", () => ({
  getSettings: vi.fn().mockResolvedValue({
    fileRetentionDays: 7,
  }),
}));

const mockUpdate = vi.fn().mockResolvedValue({});
const mockJobDoc = {
  id: "job-old-1",
  data: () => ({
    fileName: "old_doc.pdf",
    cloudinaryPublicId: "campus-printing/user1/old_doc",
    createdAt: { toMillis: () => Date.now() - 10 * 24 * 60 * 60 * 1000 },
  }),
  ref: { update: mockUpdate },
};

const mockUploadDoc = {
  id: "upload-expired-1",
  data: () => ({
    cloudinaryPublicId: "campus-printing/user1/expired_upload",
    consumed: false,
    createdAt: { toMillis: () => Date.now() - 48 * 60 * 60 * 1000 },
  }),
  ref: { update: mockUpdate },
};

vi.mock("@/lib/firebase/admin", () => ({
  adminDb: {
    collection: vi.fn((colName) => ({
      doc: vi.fn(() => ({
        get: vi.fn().mockResolvedValue({ exists: false }),
        update: mockUpdate,
      })),
      where: vi.fn().mockReturnThis(),
      get: vi.fn().mockImplementation(async () => {
        if (colName === "printJobs") {
          return { docs: [mockJobDoc] };
        }
        if (colName === "uploads") {
          return { docs: [mockUploadDoc] };
        }
        return { docs: [] };
      }),
    })),
  },
}));

// Mock cloudinary v2
const mockDestroy = vi.fn().mockResolvedValue({ result: "ok" });
vi.mock("cloudinary", () => ({
  v2: {
    config: vi.fn(),
    url: vi.fn((publicId, opts) => {
      const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "demo-cloud";
      return `https://res.cloudinary.com/${cloud}/raw/authenticated/s--signed--/${publicId}`;
    }),
    uploader: {
      destroy: (...args: any[]) => mockDestroy(...args),
    },
  },
}));

import { adminJobGuard } from "@/lib/api/admin-job-guard";
import { v2 as cloudinary } from "cloudinary";

describe("Private, Signed File Storage & Retention (P-04)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = "demo-cloud";
    process.env.CLOUDINARY_API_KEY = "123456";
    process.env.CLOUDINARY_API_SECRET = "secret987";
    process.env.CRON_SECRET = "super-secret-cron-token-1234567890";
  });

  describe("Cloudinary storage utilities", () => {
    it("generates a signed delivery URL with authenticated resource type and expiration", () => {
      const url = getSignedAssetUrl("campus-printing/user123/file456", 5);
      expect(url).toContain("res.cloudinary.com/demo-cloud/raw/authenticated");
      expect(cloudinary.url).toHaveBeenCalledWith(
        "campus-printing/user123/file456",
        expect.objectContaining({
          type: "authenticated",
          resource_type: "raw",
          sign_url: true,
          secure: true,
        })
      );
    });

    it("destroys authenticated assets via Cloudinary uploader", async () => {
      const success = await destroyAsset("campus-printing/user123/file456");
      expect(success).toBe(true);
      expect(mockDestroy).toHaveBeenCalledWith(
        "campus-printing/user123/file456",
        expect.objectContaining({
          resource_type: "raw",
          type: "authenticated",
        })
      );
    });
  });

  describe("GET /api/admin/jobs/[id]/file", () => {
    it("returns 410 Gone when file has already been deleted per retention policy", async () => {
      vi.mocked(adminJobGuard).mockResolvedValueOnce({
        ok: true,
        adminId: "admin-1",
        job: {
          id: "job-1",
          fileDeletedAt: { toMillis: () => Date.now() - 1000 } as any,
        } as any,
      });

      const res = await fileGet(new Request("http://localhost/api/admin/jobs/job-1/file"), {
        params: { id: "job-1" },
      });

      expect(res.status).toBe(410);
      const json = await res.json();
      expect(json.error).toMatch(/deleted per retention policy/);
    });

    it("returns 404 when asset identifier cannot be resolved", async () => {
      vi.mocked(adminJobGuard).mockResolvedValueOnce({
        ok: true,
        adminId: "admin-1",
        job: {
          id: "job-1",
        } as any,
      });

      const res = await fileGet(new Request("http://localhost/api/admin/jobs/job-1/file"), {
        params: { id: "job-1" },
      });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toMatch(/identifier not found/);
    });

    it("rejects SSRF when generated URL points to foreign host", async () => {
      vi.mocked(adminJobGuard).mockResolvedValueOnce({
        ok: true,
        adminId: "admin-1",
        job: {
          id: "job-1",
          cloudinaryPublicId: "test-doc",
        } as any,
      });

      // Mock cloudinary.url returning internal/evil host
      vi.mocked(cloudinary.url).mockReturnValueOnce("https://internal-service.local/raw/doc");

      const res = await fileGet(new Request("http://localhost/api/admin/jobs/job-1/file"), {
        params: { id: "job-1" },
      });

      expect(res.status).toBe(502);
      const json = await res.json();
      expect(json.error).toMatch(/Security violation: Invalid storage host/);
    });

    it("rejects SSRF when cloud name does not match environment", async () => {
      vi.mocked(adminJobGuard).mockResolvedValueOnce({
        ok: true,
        adminId: "admin-1",
        job: {
          id: "job-1",
          cloudinaryPublicId: "test-doc",
        } as any,
      });

      vi.mocked(cloudinary.url).mockReturnValueOnce("https://res.cloudinary.com/attacker-cloud/raw/doc");

      const res = await fileGet(new Request("http://localhost/api/admin/jobs/job-1/file"), {
        params: { id: "job-1" },
      });

      expect(res.status).toBe(502);
      const json = await res.json();
      expect(json.error).toMatch(/Storage cloud name mismatch/);
    });

    it("streams binary file response with security headers", async () => {
      vi.mocked(adminJobGuard).mockResolvedValueOnce({
        ok: true,
        adminId: "admin-1",
        job: {
          id: "job-1",
          fileName: "Assignment_1.pdf",
          cloudinaryPublicId: "campus-printing/user1/doc1",
        } as any,
      });

      const mockPdfBytes = Buffer.from("%PDF-1.4 test binary data");
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/pdf" }),
        arrayBuffer: async () => mockPdfBytes,
      } as any);

      const res = await fileGet(new Request("http://localhost/api/admin/jobs/job-1/file"), {
        params: { id: "job-1" },
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("application/pdf");
      expect(res.headers.get("content-disposition")).toContain('inline; filename="Assignment_1.pdf"');
      expect(res.headers.get("cache-control")).toContain("no-store");

      const bytes = await res.arrayBuffer();
      expect(Buffer.from(bytes).toString()).toBe("%PDF-1.4 test binary data");
    });
  });

  describe("Scheduled Cleanup Route (/api/cron/cleanup)", () => {
    it("rejects unauthorized requests with missing or bad CRON_SECRET", async () => {
      const req = new Request("http://localhost/api/cron/cleanup", {
        method: "POST",
        headers: { authorization: "Bearer wrong-secret" },
      });
      const res = await cleanupPost(req);
      expect(res.status).toBe(401);
    });

    it("accepts valid CRON_SECRET and deletes expired assets", async () => {
      const req = new Request("http://localhost/api/cron/cleanup", {
        method: "POST",
        headers: { authorization: "Bearer super-secret-cron-token-1234567890" },
      });

      const res = await cleanupPost(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.purgedJobs).toBe(1);
      expect(json.purgedUploads).toBe(1);
      expect(mockDestroy).toHaveBeenCalled();
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          fileDeletedAt: expect.anything(),
        })
      );
    });
  });
});
