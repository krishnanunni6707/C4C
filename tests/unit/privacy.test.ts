import { describe, it, expect, vi, beforeEach } from "vitest";
import { toPublicUser, toPublicJob } from "@/lib/mappers";
import { redactPII, logger } from "@/lib/logger";
import { DELETE as deleteStudent } from "@/app/api/admin/students/[id]/route";
import { GET as verifySessionGet } from "@/app/api/auth/verify-session/route";
import { POST as cronCleanupPost } from "@/app/api/cron/cleanup/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/firestore/users", () => ({
  getUserById: vi.fn(),
}));

vi.mock("@/lib/storage/cloudinary", () => ({
  destroyAsset: vi.fn(),
}));

vi.mock("@/lib/firestore/activity-logs", () => ({
  createActivityLog: vi.fn(),
}));

const mockDocDelete = vi.fn().mockResolvedValue({});
vi.mock("@/lib/firebase/admin", () => ({
  adminDb: {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        delete: mockDocDelete,
        get: vi.fn().mockResolvedValue({ exists: false }),
      })),
      where: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue({
        docs: [
          {
            data: () => ({ cloudinaryPublicId: "test-public-id" }),
            ref: { delete: mockDocDelete },
          },
        ],
        size: 1,
        empty: false,
      }),
    })),
  },
}));

import { getServerSession } from "next-auth";
import { getUserById } from "@/lib/firestore/users";
import { destroyAsset } from "@/lib/storage/cloudinary";
import { createActivityLog } from "@/lib/firestore/activity-logs";
import { adminDb } from "@/lib/firebase/admin";

describe("Data Minimisation & Privacy Hardening (P-07)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("toPublicUser mapper", () => {
    it("strips passwordHash and internal credentials", () => {
      const internalUser = {
        id: "user-123",
        name: "Jane Doe",
        admissionNumber: "ADM999",
        passwordHash: "$2a$10$abcdefghijklmnopqrstuvwxyz1234567890",
        passwordSalt: "secretsalt",
        tempPassword: "tempPassword123!",
        role: "STUDENT" as const,
        department: "Computer Science",
        semester: 4,
        status: "ACTIVE" as const,
      };

      const publicUser = toPublicUser(internalUser);

      expect((publicUser as any).passwordHash).toBeUndefined();
      expect((publicUser as any).passwordSalt).toBeUndefined();
      expect((publicUser as any).tempPassword).toBeUndefined();
      expect(publicUser.id).toBe("user-123");
      expect(publicUser.name).toBe("Jane Doe");
      expect(publicUser.admissionNumber).toBe("ADM999");
      expect(publicUser.semester).toBe(4);
      expect(publicUser.disabled).toBe(false);
    });
  });

  describe("toPublicJob mapper", () => {
    it("strips fileUrl and storage keys", () => {
      const internalJob = {
        id: "job-123",
        tokenNumber: "042",
        studentId: "student-1",
        studentName: "John Smith",
        admissionNumber: "ADM100",
        fileName: "assignment.pdf",
        fileUrl: "https://res.cloudinary.com/cloud/authenticated/s--xyz--/v1/assignment.pdf",
        cloudinaryPublicId: "campus-printing/private/assignment_xyz",
        uploadId: "upload-abc",
        razorpayOrderId: "order_12345",
        razorpayPaymentId: "pay_67890",
        status: "WAITING" as const,
        paymentStatus: "PAID" as const,
        totalPages: 5,
        copies: 1,
        colorMode: "BW" as const,
        printType: "SINGLE" as const,
        paperSize: "A4" as const,
        amount: 10,
        locationId: "loc-1",
        createdAt: { seconds: 1700000000 } as any,
      };

      const publicJob = toPublicJob(internalJob, { isStudentView: true });

      expect((publicJob as any).fileUrl).toBeUndefined();
      expect((publicJob as any).cloudinaryPublicId).toBeUndefined();
      expect((publicJob as any).uploadId).toBeUndefined();
      expect((publicJob as any).razorpayOrderId).toBeUndefined();
      expect((publicJob as any).razorpayPaymentId).toBeUndefined();
      expect(publicJob.tokenNumber).toBe("042");
      expect(publicJob.status).toBe("WAITING");
      expect(publicJob.amount).toBe(10);
    });
  });

  describe("logger & redactPII", () => {
    it("redacts sensitive fields in objects", () => {
      const sensitiveObj = {
        name: "Alice Wonderland",
        admissionNumber: "ADM123",
        email: "alice@campus.edu",
        password: "SuperSecretPassword123!",
        token: "ws-auth-token-xyz",
        fileUrl: "https://res.cloudinary.com/secret/file.pdf",
        copies: 2,
        status: "WAITING",
      };

      const redacted = redactPII(sensitiveObj) as any;

      expect(redacted.name).toBe("[REDACTED]");
      expect(redacted.admissionNumber).toBe("[REDACTED]");
      expect(redacted.email).toBe("[REDACTED]");
      expect(redacted.password).toBe("[REDACTED]");
      expect(redacted.token).toBe("[REDACTED]");
      expect(redacted.fileUrl).toBe("[REDACTED]");
      expect(redacted.copies).toBe(2);
      expect(redacted.status).toBe("WAITING");
    });

    it("redacts emails and URLs in plain strings", () => {
      const text = "User test@example.com uploaded https://example.com/test.pdf";
      const redacted = redactPII(text);
      expect(redacted).toBe("User [REDACTED_EMAIL] uploaded [REDACTED_URL]");
    });
  });

  describe("DELETE /api/admin/students/[id] (Right to Erasure)", () => {
    it("rejects unauthenticated requests with 401", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const req = new Request("http://localhost/api/admin/students/student-1", {
        method: "DELETE",
      });

      const res = await deleteStudent(req, { params: { id: "student-1" } });
      expect(res.status).toBe(401);
    });

    it("rejects non-SUPER_ADMIN (e.g. regular ADMIN) with 403", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "admin-1", role: "ADMIN", locationId: "loc-1" },
      } as any);

      const req = new Request("http://localhost/api/admin/students/student-1", {
        method: "DELETE",
      });

      const res = await deleteStudent(req, { params: { id: "student-1" } });
      expect(res.status).toBe(403);
    });

    it("rejects non-student accounts with 400", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "super-1", role: "SUPER_ADMIN" },
      } as any);

      vi.mocked(getUserById).mockResolvedValueOnce({
        id: "admin-2",
        name: "Admin Two",
        role: "ADMIN",
      } as any);

      const req = new Request("http://localhost/api/admin/students/admin-2", {
        method: "DELETE",
      });

      const res = await deleteStudent(req, { params: { id: "admin-2" } });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/Only student data may be erased/);
    });

    it("erases student data and logs audit event when called by SUPER_ADMIN", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "super-1", name: "Super User", role: "SUPER_ADMIN" },
      } as any);

      vi.mocked(getUserById).mockResolvedValueOnce({
        id: "student-to-delete",
        name: "Bob Student",
        admissionNumber: "ADM555",
        role: "STUDENT",
      } as any);

      const req = new Request("http://localhost/api/admin/students/student-to-delete", {
        method: "DELETE",
      });

      const res = await deleteStudent(req, { params: { id: "student-to-delete" } });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);

      expect(createActivityLog).toHaveBeenCalledWith(
        expect.objectContaining({
          adminId: "super-1",
          action: "STUDENT_DATA_ERASURE",
          targetId: "student-to-delete",
        })
      );
    });
  });

  describe("verify-session route restriction", () => {
    it("returns 404 in production environment", async () => {
      const origEnv = process.env.NODE_ENV;
      try {
        (process.env as any).NODE_ENV = "production";
        const res = await verifySessionGet();
        expect(res.status).toBe(404);
      } finally {
        (process.env as any).NODE_ENV = origEnv;
      }
    });
  });
});
