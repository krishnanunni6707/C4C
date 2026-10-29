/**
 * Unit tests for P-12: Token numbers and queue correctness
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateTokenNumber,
  getNextQueuePosition,
} from "@/lib/firestore/print-jobs";
import { applyWindowSJF } from "@/lib/firestore/sjf-queue";
import type { FirestorePrintJob } from "@/lib/firebase/collections";

// Hoisted session
const mockSession = vi.hoisted(() => ({
  user: {
    id: "user-1",
    name: "Test User",
    email: "user@test.com",
    role: "STUDENT" as "STUDENT" | "ADMIN" | "SUPER_ADMIN",
    admissionNumber: "S001",
  },
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(async () => mockSession),
}));

// Mock firestore adminDb
let counterData: any = null;

const mockTransaction = {
  get: vi.fn(async (ref: any) => {
    if (!counterData) {
      return { exists: false, id: ref.id, data: () => null };
    }
    return { exists: true, id: ref.id, data: () => ({ ...counterData }) };
  }),
  set: vi.fn((ref: any, data: any) => {
    counterData = { ...(counterData || {}), ...data };
  }),
};

const mockCountGet = vi.fn(async () => ({ data: () => ({ count: 5 }) }));

const mockWhere = vi.fn();
const mockCollection = vi.fn(() => ({
  doc: vi.fn((id?: string) => ({ id })),
  where: mockWhere,
}));

mockWhere.mockReturnValue({
  where: mockWhere,
  count: vi.fn(() => ({
    get: mockCountGet,
  })),
  get: vi.fn(async () => ({ docs: [], size: 0 })),
  orderBy: vi.fn(() => ({
    get: vi.fn(async () => ({ docs: [] })),
  })),
});

vi.mock("@/lib/firebase/admin", () => ({
  adminDb: {
    collection: (...args: any[]) => (mockCollection as any)(...args),
    runTransaction: vi.fn(async (cb: any) => cb(mockTransaction)),
  },
}));

describe("P-12: Transactional token counter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    counterData = null;
  });

  it("initializes token counter at RP1001 when counter document does not exist", async () => {
    const token = await generateTokenNumber();
    expect(token).toBe("RP1001");
    expect(counterData.current).toBe(1001);
  });

  it("increments sequentially on subsequent calls", async () => {
    counterData = { current: 1042 };
    const token = await generateTokenNumber();
    expect(token).toBe("RP1043");
    expect(counterData.current).toBe(1043);
  });

  it("supports passing an external transaction object", async () => {
    counterData = { current: 1999 };
    const token = await generateTokenNumber(mockTransaction as any);
    expect(token).toBe("RP2000");
    expect(mockTransaction.get).toHaveBeenCalled();
    expect(mockTransaction.set).toHaveBeenCalled();
  });
});

describe("P-12: Queue count queries", () => {
  it("getNextQueuePosition uses count() aggregation instead of fetching documents", async () => {
    const nextPos = await getNextQueuePosition("loc-main");
    expect(nextPos).toBe(6); // count: 5 + 1
    expect(mockCountGet).toHaveBeenCalledTimes(1);
  });
});

describe("P-12: SJF Queue with starvation guard", () => {
  const baseDate = new Date("2026-10-29T12:00:00Z");

  function createMockJob(
    id: string,
    minutesAgo: number,
    totalPages: number,
    copies = 1
  ): FirestorePrintJob {
    const createdAtTime = new Date(baseDate.getTime() - minutesAgo * 60 * 1000);
    return {
      id,
      tokenNumber: `RP${id}`,
      studentId: `student-${id}`,
      studentName: `Student ${id}`,
      admissionNumber: `ADM${id}`,
      fileName: `doc-${id}.pdf`,
      fileUrl: `https://example.com/${id}.pdf`,
      totalPages,
      copies,
      colorMode: "BW",
      printType: "SINGLE",
      paperSize: "A4",
      amount: 10,
      paymentMethod: "RAZORPAY",
      paymentStatus: "PAID",
      status: "WAITING",
      locationId: "loc-1",
      locationName: "Library",
      createdAt: {
        seconds: Math.floor(createdAtTime.getTime() / 1000),
        nanoseconds: 0,
        toDate: () => createdAtTime,
      } as any,
    };
  }

  it("prioritizes starved jobs (>15 mins old) ahead of shorter newly submitted jobs", () => {
    // Job A: arrived 20m ago, 100 pages (large, old -> starved!)
    const jobA = createMockJob("A", 20, 100);
    // Job B: arrived 2m ago, 1 page (short, new)
    const jobB = createMockJob("B", 2, 1);
    // Job C: arrived 1m ago, 2 pages (short, new)
    const jobC = createMockJob("C", 1, 2);

    // Apply SJF with window 5m, starvation threshold 15m
    const queue = applyWindowSJF([jobB, jobC, jobA], 5, 15, baseDate);

    // Job A must be first because it is starved!
    expect(queue[0].id).toBe("A");
    expect(queue[0].queuePosition).toBe(1);
    expect(queue[0].isStarved).toBe(true);

    // Remaining jobs follow SJF (shortest first within window: B has 1 page, C has 2 pages)
    expect(queue[1].id).toBe("B");
    expect(queue[1].queuePosition).toBe(2);
    expect(queue[1].isStarved).toBe(false);

    expect(queue[2].id).toBe("C");
    expect(queue[2].queuePosition).toBe(3);
    expect(queue[2].isStarved).toBe(false);
  });

  it("orders multiple starved jobs in FIFO order (oldest first)", () => {
    // Job A arrived 25m ago (100 pages)
    const jobA = createMockJob("A", 25, 100);
    // Job B arrived 18m ago (50 pages)
    const jobB = createMockJob("B", 18, 50);
    // Job C arrived 3m ago (1 page)
    const jobC = createMockJob("C", 3, 1);

    const queue = applyWindowSJF([jobC, jobB, jobA], 5, 15, baseDate);

    expect(queue[0].id).toBe("A"); // 25m ago
    expect(queue[1].id).toBe("B"); // 18m ago
    expect(queue[2].id).toBe("C"); // 3m ago
  });

  it("applies window-based shortest job first when no jobs are starved", () => {
    // All arrived within 4 minutes:
    // Job 1: 5 pages, 3m ago
    const job1 = createMockJob("1", 3, 5);
    // Job 2: 1 page, 2m ago
    const job2 = createMockJob("2", 2, 1);
    // Job 3: 3 pages, 1m ago
    const job3 = createMockJob("3", 1, 3);

    const queue = applyWindowSJF([job1, job2, job3], 5, 15, baseDate);

    expect(queue[0].id).toBe("2"); // 1 page
    expect(queue[1].id).toBe("3"); // 3 pages
    expect(queue[2].id).toBe("1"); // 5 pages
  });

  it("returns empty array when jobs array is empty", () => {
    expect(applyWindowSJF([], 5, 15)).toEqual([]);
  });
});
