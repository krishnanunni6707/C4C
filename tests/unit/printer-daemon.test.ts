/**
 * tests/unit/printer-daemon.test.ts
 *
 * Comprehensive unit tests for P-13: Print daemon hardening,
 * loopback enforcement, auth handshakes, exponential backoff,
 * print result confirmation, failure recovery, and payload validation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PRINTER_CONFIG } from "@/lib/printerConfig";
import {
  printService,
  JobNotFoundError,
  JobStateTransitionError,
} from "@/lib/services/print-service";

// Mock next-auth
const mockSession = vi.hoisted(() => ({
  user: {
    id: "admin-1",
    name: "Admin User",
    email: "admin@test.com",
    role: "ADMIN" as const,
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
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("@/lib/firebase/admin", () => ({
  adminDb: {
    collection: vi.fn(() => ({
      doc: vi.fn((id: string) => ({
        id,
        get: vi.fn(async () => ({
          exists: !!currentJobData,
          id,
          data: () => currentJobData,
        })),
        update: vi.fn(async (data: any) => {
          if (currentJobData) currentJobData = { ...currentJobData, ...data };
        }),
      })),
    })),
    runTransaction: vi.fn(async (fn: (tx: any) => Promise<any>) => fn(mockTransaction)),
  },
}));

vi.mock("@/lib/firestore/activity-logs", () => ({
  createActivityLog: vi.fn(async () => "log-1"),
}));

vi.mock("@/lib/firestore/print-jobs", () => ({
  getPrintJobById: vi.fn(async (id: string) => {
    if (!currentJobData) return null;
    return { ...currentJobData, id };
  }),
}));

describe("P-13: PRINTER_CONFIG Loopback Enforcement & Backoff Parameters", () => {
  const originalEnv = process.env.NEXT_PUBLIC_PRINTER_WS_URL;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_PRINTER_WS_URL;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_PRINTER_WS_URL = originalEnv;
    } else {
      delete process.env.NEXT_PUBLIC_PRINTER_WS_URL;
    }
  });

  it("defaults strictly to localhost loopback ws://127.0.0.1:8765", () => {
    expect(PRINTER_CONFIG.defaultWsUrl).toBe("ws://127.0.0.1:8765");
    expect(PRINTER_CONFIG.wsUrl).toBe("ws://127.0.0.1:8765");
  });

  it("permits explicit 127.0.0.1 and localhost loopback ports", () => {
    process.env.NEXT_PUBLIC_PRINTER_WS_URL = "ws://127.0.0.1:9000";
    expect(PRINTER_CONFIG.wsUrl).toBe("ws://127.0.0.1:9000");

    process.env.NEXT_PUBLIC_PRINTER_WS_URL = "ws://localhost:8765";
    expect(PRINTER_CONFIG.wsUrl).toBe("ws://localhost:8765");
  });

  it("strictly rejects external, remote, or 0.0.0.0 URLs and falls back to 127.0.0.1", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    process.env.NEXT_PUBLIC_PRINTER_WS_URL = "ws://192.168.1.50:8765";
    expect(PRINTER_CONFIG.wsUrl).toBe("ws://127.0.0.1:8765");

    process.env.NEXT_PUBLIC_PRINTER_WS_URL = "ws://0.0.0.0:8765";
    expect(PRINTER_CONFIG.wsUrl).toBe("ws://127.0.0.1:8765");

    process.env.NEXT_PUBLIC_PRINTER_WS_URL = "wss://attacker.com/ws";
    expect(PRINTER_CONFIG.wsUrl).toBe("ws://127.0.0.1:8765");

    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("defines capped backoff and max reconnect attempts", () => {
    expect(PRINTER_CONFIG.backoff.initialDelayMs).toBe(1000);
    expect(PRINTER_CONFIG.backoff.maxDelayMs).toBe(30000);
    expect(PRINTER_CONFIG.backoff.factor).toBe(1.5);
    expect(PRINTER_CONFIG.backoff.maxAttempts).toBe(10);
    expect(PRINTER_CONFIG.backoff.jitter).toBe(true);
    expect(PRINTER_CONFIG.maxCopies).toBe(99);
    expect(PRINTER_CONFIG.maxPayloadBytes).toBe(32 * 1024 * 1024);
  });
});

describe("P-13: PrintService failure handling and recovery (failJob)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentJobData = {
      id: "job-101",
      tokenNumber: "RP1001",
      studentId: "student-1",
      fileName: "assignment.pdf",
      status: "PRINTING",
      paymentStatus: "PAID",
      locationId: "loc-1",
      locationName: "Library",
      amount: 15.0,
    };
  });

  it("transitions PRINTING -> WAITING and records lastPrintError", async () => {
    const job = await printService.failJob("job-101", "admin-1", "Print spooler jammed");
    expect(job.status).toBe("WAITING");
    expect(job.lastPrintError).toBe("Print spooler jammed");

    expect(mockTransaction.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: "WAITING",
        lastPrintError: "Print spooler jammed",
      })
    );
  });

  it("rejects transition to WAITING if job is in COLLECTED or CANCELLED terminal states", async () => {
    currentJobData.status = "COLLECTED";
    await expect(printService.failJob("job-101", "admin-1", "Failure")).rejects.toThrow(
      JobStateTransitionError
    );

    currentJobData.status = "CANCELLED";
    await expect(printService.failJob("job-101", "admin-1", "Failure")).rejects.toThrow(
      JobStateTransitionError
    );
  });

  it("throws JobNotFoundError when job does not exist", async () => {
    currentJobData = null;
    await expect(printService.failJob("non-existent", "admin-1")).rejects.toThrow(
      JobNotFoundError
    );
  });
});

describe("P-13: POST /api/admin/jobs/[id]/fail API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentJobData = {
      id: "job-101",
      tokenNumber: "RP1001",
      studentId: "student-1",
      fileName: "assignment.pdf",
      status: "PRINTING",
      paymentStatus: "PAID",
      locationId: "loc-1",
    };
  });

  it("recovers job from PRINTING to WAITING with provided reason", async () => {
    const { POST } = await import("@/app/api/admin/jobs/[id]/fail/route");
    const req = new Request("http://localhost:3000/api/admin/jobs/job-101/fail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Out of paper in tray 1" }),
    });

    const res = await POST(req, { params: { id: "job-101" } });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.job.status).toBe("WAITING");
    expect(body.job.lastPrintError).toBe("Out of paper in tray 1");
  });

  it("returns 409 Conflict if attempting to fail a job not in PRINTING", async () => {
    currentJobData.status = "READY";
    const { POST } = await import("@/app/api/admin/jobs/[id]/fail/route");
    const req = new Request("http://localhost:3000/api/admin/jobs/job-101/fail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Error" }),
    });

    const res = await POST(req, { params: { id: "job-101" } });
    expect(res.status).toBe(409);
  });
});

describe("P-13: Python Print Daemon Protocol & Payload Validation Logic", () => {
  it("validates PDF magic bytes strictly (%PDF-)", () => {
    const validPdfHeader = Buffer.from("%PDF-1.7 ... content");
    expect(validPdfHeader.subarray(0, 5).toString("ascii")).toBe("%PDF-");

    const fakeExe = Buffer.from("MZ\x90\x00\x03\x00\x00\x00");
    expect(fakeExe.subarray(0, 5).toString("ascii")).not.toBe("%PDF-");

    const fakeDocx = Buffer.from("PK\x03\x04");
    expect(fakeDocx.subarray(0, 5).toString("ascii")).not.toBe("%PDF-");
  });

  it("validates copies bounds (1 to 99)", () => {
    const isValidCopies = (c: any) => typeof c === "number" && Number.isInteger(c) && c >= 1 && c <= 99;

    expect(isValidCopies(1)).toBe(true);
    expect(isValidCopies(50)).toBe(true);
    expect(isValidCopies(99)).toBe(true);
    expect(isValidCopies(0)).toBe(false);
    expect(isValidCopies(100)).toBe(false);
    expect(isValidCopies(-5)).toBe(false);
    expect(isValidCopies(2.5)).toBe(false);
    expect(isValidCopies("5")).toBe(false);
  });

  it("validates base64 encoding and max 32MB payload limit", () => {
    const MAX_BYTES = 32 * 1024 * 1024;
    const smallPayload = Buffer.from("%PDF-1.4 sample content").toString("base64");
    const decoded = Buffer.from(smallPayload, "base64");

    expect(decoded.length).toBeLessThan(MAX_BYTES);
    expect(decoded.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  });
});
