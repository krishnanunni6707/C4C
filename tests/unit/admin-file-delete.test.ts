import { describe, it, expect, vi, beforeEach } from "vitest";
import { DELETE as fileDelete } from "@/app/api/admin/jobs/[id]/file/route";
import { GET as filesGet, POST as filesPost } from "@/app/api/admin/files/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/storage/cloudinary", () => ({
  destroyAsset: vi.fn().mockResolvedValue(true),
  getSignedAssetUrl: vi.fn(),
}));

vi.mock("@/lib/firestore/activity-logs", () => ({
  createActivityLog: vi.fn().mockResolvedValue({ id: "log-1" }),
}));

const mockJobDocData = {
  id: "job-101",
  tokenNumber: "RP1042",
  fileName: "Operating_Systems.pdf",
  cloudinaryPublicId: "campus-printing/u1/os_notes",
  uploadId: "up-101",
  status: "PRINTING",
  studentId: "s-1",
  studentName: "Aarav Nair",
  admissionNumber: "CS21B042",
  amount: 68,
  totalPages: 24,
  copies: 2,
  createdAt: { toDate: () => new Date("2026-10-28T10:24:00Z") },
  fileDeletedAt: null,
};

const mockJobDocRef = {
  update: vi.fn().mockResolvedValue({}),
};

const mockUploadDocRef = {
  update: vi.fn().mockResolvedValue({}),
};

let currentJobData = { ...mockJobDocData };

vi.mock("@/lib/firebase/admin", () => ({
  adminDb: {
    collection: vi.fn((colName: string) => {
      if (colName === "printJobs") {
        return {
          doc: vi.fn((id: string) => ({
            get: vi.fn().mockImplementation(async () => {
              if (id === "job-101") {
                return {
                  exists: true,
                  id: "job-101",
                  data: () => currentJobData,
                  ref: mockJobDocRef,
                };
              }
              return { exists: false };
            }),
            update: mockJobDocRef.update,
          })),
          orderBy: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          get: vi.fn().mockResolvedValue({
            docs: [
              {
                id: "job-101",
                data: () => currentJobData,
                ref: mockJobDocRef,
              },
            ],
            size: 1,
            empty: false,
          }),
        };
      }
      if (colName === "uploads") {
        return {
          doc: vi.fn((id: string) => ({
            get: vi.fn().mockResolvedValue({
              exists: true,
              id: "up-101",
              data: () => ({ cloudinaryPublicId: "campus-printing/u1/os_notes" }),
            }),
            update: mockUploadDocRef.update,
          })),
          where: vi.fn().mockReturnThis(),
          get: vi.fn().mockResolvedValue({
            docs: [],
            size: 0,
            empty: true,
          }),
        };
      }
      return {
        doc: vi.fn(() => ({ get: vi.fn().mockResolvedValue({ exists: false }) })),
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue({ docs: [], size: 0, empty: true }),
      };
    }),
  },
}));

import { getServerSession } from "next-auth";
import { destroyAsset } from "@/lib/storage/cloudinary";
import { createActivityLog } from "@/lib/firestore/activity-logs";

describe("Super Admin File Deletion (DELETE /api/admin/jobs/[id]/file & /api/admin/files)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentJobData = { ...mockJobDocData, fileDeletedAt: null };
  });

  describe("DELETE /api/admin/jobs/[id]/file", () => {
    it("rejects unauthorized access when session is absent with 401", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const res = await fileDelete(new Request("http://localhost/api/admin/jobs/job-101/file"), {
        params: { id: "job-101" },
      });

      expect(res.status).toBe(401);
    });

    it("rejects regular ADMIN role with 403 Forbidden", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "admin-1", role: "ADMIN", locationId: "loc-1" },
      } as any);

      const res = await fileDelete(new Request("http://localhost/api/admin/jobs/job-101/file"), {
        params: { id: "job-101" },
      });

      expect(res.status).toBe(403);
    });

    it("returns 404 when job does not exist", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "super-1", role: "SUPER_ADMIN" },
      } as any);

      const res = await fileDelete(new Request("http://localhost/api/admin/jobs/non-existent/file"), {
        params: { id: "non-existent" },
      });

      expect(res.status).toBe(404);
    });

    it("returns 400 when file is already deleted", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "super-1", role: "SUPER_ADMIN" },
      } as any);

      currentJobData = { ...mockJobDocData, fileDeletedAt: { toDate: () => new Date() } as any };

      const res = await fileDelete(new Request("http://localhost/api/admin/jobs/job-101/file"), {
        params: { id: "job-101" },
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/already been deleted/);
    });

    it("successfully destroys asset, updates print job and creates activity log for SUPER_ADMIN", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "super-1", role: "SUPER_ADMIN", name: "Super User" },
      } as any);

      const res = await fileDelete(new Request("http://localhost/api/admin/jobs/job-101/file"), {
        params: { id: "job-101" },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);

      // Verify Cloudinary destroyAsset called with publicId
      expect(destroyAsset).toHaveBeenCalledWith("campus-printing/u1/os_notes");

      // Verify Firestore update on print job
      expect(mockJobDocRef.update).toHaveBeenCalledWith(
        expect.objectContaining({
          fileDeletedAt: expect.anything(),
          fileDeletedBy: "super-1",
          fileDeletedByName: "Super User",
          fileUrl: "",
        })
      );

      // Verify activity log
      expect(createActivityLog).toHaveBeenCalledWith(
        expect.objectContaining({
          adminId: "super-1",
          action: "FILE_DELETED",
          targetId: "job-101",
        })
      );
    });
  });

  describe("GET /api/admin/files", () => {
    it("rejects non-SUPER_ADMIN with 403", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "admin-1", role: "ADMIN" },
      } as any);

      const res = await filesGet();
      expect(res.status).toBe(403);
    });

    it("returns files list and storage statistics for SUPER_ADMIN", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "super-1", role: "SUPER_ADMIN" },
      } as any);

      const res = await filesGet();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.files).toHaveLength(1);
      expect(json.files[0].tokenNumber).toBe("RP1042");
      expect(json.files[0].fileDeleted).toBe(false);
      expect(json.stats).toEqual({
        totalUploads: 1,
        activeInStorage: 1,
        deletedFiles: 0,
      });
    });
  });

  describe("POST /api/admin/files", () => {
    it("rejects invalid action with 400", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "super-1", role: "SUPER_ADMIN" },
      } as any);

      const req = new Request("http://localhost/api/admin/files", {
        method: "POST",
        body: JSON.stringify({ action: "invalid_action" }),
      });

      const res = await filesPost(req);
      expect(res.status).toBe(400);
    });

    it("executes delete_job for a single job", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "super-1", role: "SUPER_ADMIN", name: "Super User" },
      } as any);

      const req = new Request("http://localhost/api/admin/files", {
        method: "POST",
        body: JSON.stringify({ action: "delete_job", jobId: "job-101" }),
      });

      const res = await filesPost(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(destroyAsset).toHaveBeenCalledWith("campus-printing/u1/os_notes");
      expect(mockJobDocRef.update).toHaveBeenCalledWith(
        expect.objectContaining({
          fileDeletedAt: expect.anything(),
        })
      );
    });

    it("executes purge_completed for completed/cancelled jobs", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "super-1", role: "SUPER_ADMIN", name: "Super User" },
      } as any);

      const req = new Request("http://localhost/api/admin/files", {
        method: "POST",
        body: JSON.stringify({ action: "purge_completed" }),
      });

      const res = await filesPost(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(createActivityLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "FILES_BULK_PURGED",
          targetId: "completed_jobs",
        })
      );
    });
  });
});
