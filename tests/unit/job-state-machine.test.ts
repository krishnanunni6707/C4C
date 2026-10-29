/**
 * Unit tests for P-11: Job state machine, transactional transitions, and refund tracking
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  printService,
  JobNotFoundError,
  JobStateTransitionError,
  JobPaymentRequiredError,
  VALID_TRANSITIONS,
} from "@/lib/services/print-service";

// Hoisted session
const mockSession = vi.hoisted(() => ({
  user: {
    id: "admin-1",
    name: "Admin User",
    email: "admin@test.com",
    role: "ADMIN" as "STUDENT" | "ADMIN" | "SUPER_ADMIN",
    admissionNumber: "ADM001",
    locationId: "loc-1",
  },
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(async () => mockSession),
}));

// Mock firestore adminDb & transaction
let currentJobData: any = null;

const mockTransaction = {
  get: vi.fn(async (docRef: any) => {
    if (!currentJobData) {
      return { exists: false, id: docRef.id, data: () => null };
    }
    return {
      exists: true,
      id: docRef.id,
      data: () => ({ ...currentJobData }),
    };
  }),
  update: vi.fn((docRef: any, data: any) => {
    if (currentJobData) {
      currentJobData = { ...currentJobData, ...data };
    }
  }),
  set: vi.fn((docRef: any, data: any) => {}),
  delete: vi.fn(),
};

const mockDocRef = {
  id: "job-101",
  get: vi.fn(async () => {
    if (!currentJobData) return { exists: false, data: (): any => null };
    return { exists: true, id: "job-101", data: (): any => ({ ...currentJobData }) };
  }),
  update: vi.fn(async (data: any) => {
    if (currentJobData) currentJobData = { ...currentJobData, ...data };
  }),
};

vi.mock("@/lib/firebase/admin", () => ({
  adminDb: {
    collection: vi.fn(() => ({
      doc: vi.fn((id?: string) => ({ ...mockDocRef, id: id || mockDocRef.id })),
    })),
    runTransaction: vi.fn(async (callback: any) => {
      return await callback(mockTransaction);
    }),
  },
}));

vi.mock("@/lib/firestore/activity-logs", () => ({
  createActivityLog: vi.fn(async () => {}),
}));

vi.mock("@/lib/storage/cloudinary", () => ({
  destroyAsset: vi.fn(async () => {}),
}));

vi.mock("@/lib/firestore/uploads", () => ({
  getUploadRecord: vi.fn(async () => null),
}));

describe("P-11: State machine transitions matrix", () => {
  it("enforces allowed transition rules", () => {
    expect(VALID_TRANSITIONS.WAITING).toEqual(["PRINTING", "CANCELLED"]);
    expect(VALID_TRANSITIONS.PRINTING).toEqual(["READY", "CANCELLED"]);
    expect(VALID_TRANSITIONS.READY).toEqual(["COLLECTED"]);
    expect(VALID_TRANSITIONS.COLLECTED).toEqual([]);
    expect(VALID_TRANSITIONS.CANCELLED).toEqual([]);
  });
});

describe("P-11: PrintService transactional transitions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentJobData = {
      id: "job-101",
      tokenNumber: "RP1001",
      studentId: "student-1",
      fileName: "assignment.pdf",
      status: "WAITING",
      paymentStatus: "PAID",
      locationId: "loc-1",
      locationName: "Library",
      amount: 15.0,
    };
  });

  it("successfully transitions WAITING -> PRINTING when paid and creates notification", async () => {
    const job = await printService.startJob("job-101", "admin-1");
    expect(job.status).toBe("PRINTING");
    expect(mockTransaction.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: "PRINTING" })
    );
    expect(mockTransaction.set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        type: "PRINTING_STARTED",
        studentId: "student-1",
      })
    );
  });

  it("rejects WAITING -> PRINTING if paymentStatus is PENDING", async () => {
    currentJobData.paymentStatus = "PENDING";
    await expect(printService.startJob("job-101", "admin-1")).rejects.toThrow(
      JobPaymentRequiredError
    );
  });

  it("successfully transitions PRINTING -> READY and creates notification", async () => {
    currentJobData.status = "PRINTING";
    const job = await printService.markReady("job-101", "admin-1");
    expect(job.status).toBe("READY");
    expect(mockTransaction.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: "READY" })
    );
    expect(mockTransaction.set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        type: "PRINT_READY",
        studentId: "student-1",
      })
    );
  });

  it("successfully transitions READY -> COLLECTED", async () => {
    currentJobData.status = "READY";
    const job = await printService.markCollected("job-101", "admin-1");
    expect(job.status).toBe("COLLECTED");
    expect(mockTransaction.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: "COLLECTED" })
    );
  });

  it("successfully cancels a WAITING paid job and flags refundStatus: REQUIRED", async () => {
    currentJobData.status = "WAITING";
    currentJobData.paymentStatus = "PAID";

    const job = await printService.cancelJob("job-101", "admin-1", "Out of paper");
    expect(job.status).toBe("CANCELLED");
    expect(mockTransaction.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: "CANCELLED",
        refundStatus: "REQUIRED",
        refundReason: "Out of paper",
      })
    );
    expect(mockTransaction.set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        type: "PRINT_CANCELLED",
        message: expect.stringContaining("refund has been flagged"),
      })
    );
  });

  it("cancelling an UNPAID job does NOT flag refundStatus", async () => {
    currentJobData.status = "WAITING";
    currentJobData.paymentStatus = "PENDING";

    const job = await printService.cancelJob("job-101", "admin-1", "Student requested cancel");
    expect(job.status).toBe("CANCELLED");
    const updateCall = mockTransaction.update.mock.calls[0][1];
    expect(updateCall.refundStatus).toBeUndefined();
  });

  it("rejects illegal transitions with JobStateTransitionError", async () => {
    // READY -> CANCELLED is illegal
    currentJobData.status = "READY";
    await expect(printService.cancelJob("job-101", "admin-1")).rejects.toThrow(
      JobStateTransitionError
    );

    // COLLECTED -> WAITING / CANCELLED is illegal
    currentJobData.status = "COLLECTED";
    await expect(printService.cancelJob("job-101", "admin-1")).rejects.toThrow(
      JobStateTransitionError
    );

    // CANCELLED -> PRINTING is illegal
    currentJobData.status = "CANCELLED";
    await expect(printService.startJob("job-101", "admin-1")).rejects.toThrow(
      JobStateTransitionError
    );
  });
});

describe("P-11: Payment override and revert", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentJobData = {
      id: "job-101",
      tokenNumber: "RP1001",
      studentId: "student-1",
      fileName: "assignment.pdf",
      status: "WAITING",
      paymentStatus: "PENDING",
      locationId: "loc-1",
      locationName: "Library",
      amount: 15.0,
    };
  });

  it("allows Super Admin to verify payment with mandatory reason", async () => {
    const job = await printService.verifyPayment("job-101", "super-admin-1", "Cash payment collected at front desk");
    expect(job.paymentStatus).toBe("PAID");
    expect(mockTransaction.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        paymentStatus: "PAID",
        manualPaymentReason: "Cash payment collected at front desk",
      })
    );
  });

  it("allows Super Admin to revert payment on WAITING job", async () => {
    currentJobData.paymentStatus = "PAID";
    currentJobData.status = "WAITING";

    const job = await printService.revertPayment("job-101", "super-admin-1", "Mistaken cash entry");
    expect(job.paymentStatus).toBe("PENDING");
    expect(mockTransaction.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        paymentStatus: "PENDING",
        unpayReason: "Mistaken cash entry",
      })
    );
  });

  it("disallows Super Admin from reverting payment if job is PRINTING", async () => {
    currentJobData.paymentStatus = "PAID";
    currentJobData.status = "PRINTING";

    await expect(
      printService.revertPayment("job-101", "super-admin-1", "Revert attempt")
    ).rejects.toThrow(JobStateTransitionError);
  });
});

describe("P-11: Route endpoints authorization and error mappings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession.user.role = "ADMIN";
    mockSession.user.locationId = "loc-1";
    currentJobData = {
      id: "job-101",
      tokenNumber: "RP1001",
      studentId: "student-1",
      fileName: "assignment.pdf",
      status: "WAITING",
      paymentStatus: "PAID",
      locationId: "loc-1",
      locationName: "Library",
      amount: 15.0,
    };
  });

  it("POST /api/admin/jobs/[id]/start returns 409 Conflict if job is unpaid", async () => {
    currentJobData.paymentStatus = "PENDING";
    const { POST } = await import("@/app/api/admin/jobs/[id]/start/route");
    const req = new Request("http://localhost/api/admin/jobs/job-101/start", { method: "POST" });
    const res = await POST(req, { params: { id: "job-101" } });
    expect(res.status).toBe(409);
  });

  it("POST /api/admin/jobs/[id]/ready returns 409 Conflict if job is WAITING", async () => {
    currentJobData.status = "WAITING";
    const { POST } = await import("@/app/api/admin/jobs/[id]/ready/route");
    const req = new Request("http://localhost/api/admin/jobs/job-101/ready", { method: "POST" });
    const res = await POST(req, { params: { id: "job-101" } });
    expect(res.status).toBe(409);
  });

  it("POST /api/admin/jobs/[id]/collect returns 409 Conflict if job is PRINTING", async () => {
    currentJobData.status = "PRINTING";
    const { POST } = await import("@/app/api/admin/jobs/[id]/collect/route");
    const req = new Request("http://localhost/api/admin/jobs/job-101/collect", { method: "POST" });
    const res = await POST(req, { params: { id: "job-101" } });
    expect(res.status).toBe(409);
  });

  it("POST /api/admin/jobs/[id]/cancel returns 409 Conflict if job is COLLECTED", async () => {
    currentJobData.status = "COLLECTED";
    const { POST } = await import("@/app/api/admin/jobs/[id]/cancel/route");
    const req = new Request("http://localhost/api/admin/jobs/job-101/cancel", { method: "POST" });
    const res = await POST(req, { params: { id: "job-101" } });
    expect(res.status).toBe(409);
  });

  it("POST /api/admin/jobs/[id]/payment rejects ADMIN callers with 403 Forbidden", async () => {
    mockSession.user.role = "ADMIN";
    const { POST } = await import("@/app/api/admin/jobs/[id]/payment/route");
    const req = new Request("http://localhost/api/admin/jobs/job-101/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Valid reason for payment" }),
    });
    const res = await POST(req, { params: { id: "job-101" } });
    expect(res.status).toBe(403);
  });

  it("POST /api/admin/jobs/[id]/payment rejects SUPER_ADMIN if reason is < 5 chars", async () => {
    mockSession.user.role = "SUPER_ADMIN";
    const { POST } = await import("@/app/api/admin/jobs/[id]/payment/route");
    const req = new Request("http://localhost/api/admin/jobs/job-101/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "no" }),
    });
    const res = await POST(req, { params: { id: "job-101" } });
    expect(res.status).toBe(400);
  });

  it("POST /api/admin/jobs/[id]/unpay rejects ADMIN callers with 403 Forbidden", async () => {
    mockSession.user.role = "ADMIN";
    const { POST } = await import("@/app/api/admin/jobs/[id]/unpay/route");
    const req = new Request("http://localhost/api/admin/jobs/job-101/unpay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Valid reason for unpay" }),
    });
    const res = await POST(req, { params: { id: "job-101" } });
    expect(res.status).toBe(403);
  });

  it("POST /api/admin/jobs/[id]/unpay allows SUPER_ADMIN with valid reason and returns 200", async () => {
    mockSession.user.role = "SUPER_ADMIN";
    currentJobData.paymentStatus = "PAID";
    currentJobData.status = "WAITING";

    const { POST } = await import("@/app/api/admin/jobs/[id]/unpay/route");
    const req = new Request("http://localhost/api/admin/jobs/job-101/unpay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Reverting mistaken cash entry" }),
    });
    const res = await POST(req, { params: { id: "job-101" } });
    expect(res.status).toBe(200);
  });
});
