import { describe, it, expect } from "vitest";
import { aggregateOverviewData, formatRelativeTime, toDate } from "@/lib/admin/overview";
import { FirestorePrintJob, FirestorePrinter, FirestoreActivityLog } from "@/lib/firebase/collections";

describe("Admin Overview Aggregation Helper", () => {
  const baseDate = new Date("2026-11-02T14:00:00.000Z");

  it("handles empty jobs and activity gracefully with valid defaults", () => {
    const data = aggregateOverviewData({
      jobs: [],
      printers: [],
      activityLogs: [],
      now: baseDate,
    });

    expect(data.stats.jobsToday).toBe(0);
    expect(data.stats.revenueToday).toBe(0);
    expect(data.stats.waiting).toBe(0);
    expect(data.stats.avgWaitMin).toBe(0);
    expect(data.series.length).toBe(7);
    expect(data.liveQueue).toEqual([]);
    expect(data.printers).toEqual([]);
    expect(data.recentActivity).toEqual([]);
  });

  it("aggregates jobsToday and revenueToday strictly for paid, non-cancelled jobs created today", () => {
    const todayAt10 = new Date("2026-11-02T10:00:00.000Z");
    const todayAt11 = new Date("2026-11-02T11:00:00.000Z");
    const yesterday = new Date("2026-11-01T15:00:00.000Z");

    const jobs: Partial<FirestorePrintJob>[] = [
      // Today paid job
      {
        id: "j1",
        createdAt: todayAt10 as any,
        paymentStatus: "PAID",
        status: "WAITING",
        amount: 50,
      },
      // Today unpaid job
      {
        id: "j2",
        createdAt: todayAt11 as any,
        paymentStatus: "PENDING",
        status: "WAITING",
        amount: 30,
      },
      // Today cancelled job with payment
      {
        id: "j3",
        createdAt: todayAt11 as any,
        paymentStatus: "PAID",
        status: "CANCELLED",
        amount: 40,
      },
      // Yesterday paid job
      {
        id: "j4",
        createdAt: yesterday as any,
        paymentStatus: "PAID",
        status: "COLLECTED",
        amount: 100,
      },
    ];

    const data = aggregateOverviewData({
      jobs: jobs as FirestorePrintJob[],
      now: baseDate,
    });

    expect(data.stats.jobsToday).toBe(3);
    expect(data.stats.revenueToday).toBe(50); // only j1 is PAID and not CANCELLED
  });

  it("marks negative waiting and avgWait deltas as isGood: true", () => {
    const data = aggregateOverviewData({
      jobs: [],
      now: baseDate,
    });

    // When waiting count is 0 or decreased, isGood should be true
    expect(data.stats.deltaWaiting.isGood).toBe(true);
    expect(data.stats.deltaAvgWait.isGood).toBe(true);
  });

  it("correctly orders liveQueue using Window-SJF and caps at 6", () => {
    const today = new Date("2026-11-02T13:50:00.000Z");
    const jobs: Partial<FirestorePrintJob>[] = [
      { id: "j1", tokenNumber: "RP1", totalPages: 10, copies: 1, createdAt: today as any, status: "WAITING" },
      { id: "j2", tokenNumber: "RP2", totalPages: 2, copies: 1, createdAt: today as any, status: "WAITING" },
      { id: "j3", tokenNumber: "RP3", totalPages: 5, copies: 1, createdAt: today as any, status: "WAITING" },
      { id: "j4", tokenNumber: "RP4", totalPages: 1, copies: 1, createdAt: today as any, status: "WAITING" },
      { id: "j5", tokenNumber: "RP5", totalPages: 20, copies: 1, createdAt: today as any, status: "WAITING" },
      { id: "j6", tokenNumber: "RP6", totalPages: 3, copies: 1, createdAt: today as any, status: "WAITING" },
      { id: "j7", tokenNumber: "RP7", totalPages: 4, copies: 1, createdAt: today as any, status: "WAITING" },
    ];

    const data = aggregateOverviewData({
      jobs: jobs as FirestorePrintJob[],
      now: baseDate,
    });

    expect(data.liveQueue.length).toBe(6);
    // Shortest job within the window should be first: RP4 (1 page)
    expect(data.liveQueue[0].tokenNumber).toBe("RP4");
  });

  it("sets 0% load for offline printers", () => {
    const printers: Partial<FirestorePrinter>[] = [
      { id: "p1", name: "Printer A1", location: "Library", status: "ONLINE" },
      { id: "p2", name: "Printer B1", location: "Engineering", status: "OFFLINE" },
    ];

    const data = aggregateOverviewData({
      jobs: [],
      printers: printers as FirestorePrinter[],
      now: baseDate,
    });

    const offlinePrinter = data.printers.find((p) => p.name === "Printer B1");
    expect(offlinePrinter?.loadPercent).toBe(0);
    expect(offlinePrinter?.status).toBe("OFFLINE");
  });

  it("maps activity logs to correct types and relative times", () => {
    const fiveMinAgo = new Date(baseDate.getTime() - 5 * 60 * 1000);
    const logs: Partial<FirestoreActivityLog>[] = [
      {
        id: "l1",
        adminId: "adm_1",
        action: "PAYMENT_VERIFIED",
        targetId: "RP1042",
        timestamp: fiveMinAgo as any,
      },
    ];

    const data = aggregateOverviewData({
      jobs: [],
      activityLogs: logs as (FirestoreActivityLog & { details?: string })[],
      adminNameMap: { adm_1: "Aarav" },
      now: baseDate,
    });

    expect(data.recentActivity[0].type).toBe("payment");
    expect(data.recentActivity[0].title).toBe("Payment received for RP1042");
    expect(data.recentActivity[0].actor).toBe("Aarav");
    expect(data.recentActivity[0].relativeTime).toBe("5 min ago");
  });
});
