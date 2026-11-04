import { FirestorePrintJob, FirestorePrinter, FirestoreActivityLog } from "@/lib/firebase/collections";
import { applyWindowSJF } from "@/lib/firestore/sjf-queue";

export type OverviewRange = "today" | "7d" | "30d" | "90d";

export interface OverviewDelta {
  value: number;
  formatted: string;
  isPositive: boolean;
  isGood: boolean;
}

export interface OverviewStats {
  jobsToday: number;
  revenueToday: number;
  waiting: number;
  avgWaitMin: number;
  deltaJobs: OverviewDelta;
  deltaRevenue: OverviewDelta;
  deltaWaiting: OverviewDelta;
  deltaAvgWait: OverviewDelta;
  sparklines: {
    jobs: number[];
    revenue: number[];
    waiting: number[];
    avgWait: number[];
  };
}

export interface OverviewSeriesItem {
  date: string;
  label: string;
  revenue: number;
  jobs: number;
}

export interface OverviewLiveJob {
  id: string;
  tokenNumber: string;
  studentName: string;
  fileName: string;
  totalPages: number;
  copies: number;
  status: "WAITING" | "PRINTING" | "READY" | "COLLECTED" | "CANCELLED";
  waitTimeMin: number;
}

export interface OverviewPrinter {
  id: string;
  name: string;
  location: string;
  status: "ONLINE" | "OFFLINE";
  loadPercent: number;
}

export interface OverviewActivity {
  id: string;
  action: string;
  title: string;
  actor: string;
  timestamp: string;
  relativeTime: string;
  type: "payment" | "status" | "user" | "other";
}

export interface OverviewData {
  range: OverviewRange;
  locationId: string | null;
  locationName: string | null;
  stats: OverviewStats;
  series: OverviewSeriesItem[];
  liveQueue: OverviewLiveJob[];
  printers: OverviewPrinter[];
  recentActivity: OverviewActivity[];
}

export function toDate(ts: unknown): Date {
  if (!ts) return new Date(0);
  if (ts instanceof Date) return ts;
  if (typeof ts === "object" && ts !== null) {
    if ("toDate" in ts && typeof (ts as { toDate: () => Date }).toDate === "function") {
      return (ts as { toDate: () => Date }).toDate();
    }
    if ("_seconds" in ts && typeof (ts as { _seconds: number })._seconds === "number") {
      return new Date((ts as { _seconds: number })._seconds * 1000);
    }
    if ("seconds" in ts && typeof (ts as { seconds: number }).seconds === "number") {
      return new Date((ts as { seconds: number }).seconds * 1000);
    }
  }
  if (typeof ts === "string" || typeof ts === "number") {
    const d = new Date(ts);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date(0);
}

export function formatRelativeTime(date: Date, now: Date): string {
  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return "just now";
  if (diffMin === 1) return "1 min ago";
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHour === 1) return "1 hour ago";
  if (diffHour < 24) return `${diffHour} hours ago`;
  if (diffDay === 1) return "1 day ago";
  return `${diffDay} days ago`;
}

/**
 * Pure aggregation function for print jobs data.
 * Aggregates stats, series, and top queue in a single pass.
 */
export function aggregateOverviewData({
  jobs,
  printers = [],
  activityLogs = [],
  adminNameMap = {},
  range = "7d",
  locationId = null,
  locationName = null,
  now = new Date(),
}: {
  jobs: FirestorePrintJob[];
  printers?: FirestorePrinter[];
  activityLogs?: (FirestoreActivityLog & { details?: string })[];
  adminNameMap?: Record<string, string>;
  range?: OverviewRange;
  locationId?: string | null;
  locationName?: string | null;
  now?: Date;
}): OverviewData {
  const nowMs = now.getTime();

  // 1. Calculate Time Boundaries
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTodayMs = startOfToday.getTime();

  // 7 days ago today boundary
  const startOfSameDayLastWeek = new Date(startOfTodayMs - 7 * 24 * 60 * 60 * 1000);
  const endOfSameDayLastWeek = new Date(startOfTodayMs - 6 * 24 * 60 * 60 * 1000);

  // 1 hour ago
  const oneHourAgoMs = nowMs - 60 * 60 * 1000;

  // Range window start
  let rangeDays = 7;
  if (range === "today") rangeDays = 1;
  else if (range === "30d") rangeDays = 30;
  else if (range === "90d") rangeDays = 90;

  // 2. Single-pass Aggregation Buckets
  let jobsToday = 0;
  let revenueToday = 0;
  let jobsLastWeekSameDay = 0;
  let revenueLastWeekSameDay = 0;

  let waitingCount = 0;
  let waitingOneHourAgo = 0;

  const activeJobsForQueue: FirestorePrintJob[] = [];
  const waitingWaitTimes: number[] = [];
  const completedTodayWaitTimes: number[] = [];
  const completedLastWeekWaitTimes: number[] = [];

  // Daily map for series and sparklines (last N days)
  const daysCount = Math.max(7, rangeDays);
  const dailyBuckets: Map<string, { date: Date; revenue: number; jobs: number; waiting: number; waitTimeSum: number; waitTimeCount: number }> = new Map();

  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dailyBuckets.set(key, { date: d, revenue: 0, jobs: 0, waiting: 0, waitTimeSum: 0, waitTimeCount: 0 });
  }

  for (const job of jobs) {
    const createdAt = toDate(job.createdAt);
    const jobTime = createdAt.getTime();
    const dateKey = createdAt.toISOString().slice(0, 10);
    const isPaid = job.paymentStatus === "PAID" && job.status !== "CANCELLED";
    const amount = Number(job.amount) || 0;

    // Daily bucket update
    const bucket = dailyBuckets.get(dateKey);
    if (bucket) {
      bucket.jobs += 1;
      if (isPaid) bucket.revenue += amount;
      if (job.status === "WAITING") bucket.waiting += 1;
    }

    // Today metrics
    if (jobTime >= startOfTodayMs) {
      jobsToday += 1;
      if (isPaid) {
        revenueToday += amount;
      }
      if (job.status === "COLLECTED" || job.status === "READY") {
        const finishedAt = toDate(job.readyAt || job.collectedAt || job.startedAt);
        const waitMin = Math.max(1, Math.round((finishedAt.getTime() - jobTime) / 60000));
        completedTodayWaitTimes.push(waitMin);
        if (bucket) {
          bucket.waitTimeSum += waitMin;
          bucket.waitTimeCount += 1;
        }
      }
    }

    // Same day last week metrics
    if (jobTime >= startOfSameDayLastWeek.getTime() && jobTime < endOfSameDayLastWeek.getTime()) {
      jobsLastWeekSameDay += 1;
      if (isPaid) {
        revenueLastWeekSameDay += amount;
      }
      if (job.status === "COLLECTED" || job.status === "READY") {
        const finishedAt = toDate(job.readyAt || job.collectedAt || job.startedAt);
        const waitMin = Math.max(1, Math.round((finishedAt.getTime() - jobTime) / 60000));
        completedLastWeekWaitTimes.push(waitMin);
      }
    }

    // Active status
    if (job.status === "WAITING") {
      waitingCount += 1;
      const waitMin = Math.max(0, Math.round((nowMs - jobTime) / 60000));
      waitingWaitTimes.push(waitMin);
      activeJobsForQueue.push(job);
    } else if (job.status === "PRINTING" || job.status === "READY") {
      activeJobsForQueue.push(job);
    }

    // Waiting 1 hour ago check (jobs that were waiting before 1h ago and not completed before then)
    if (jobTime <= oneHourAgoMs) {
      const finishedAt = job.startedAt || job.readyAt || job.collectedAt ? toDate(job.startedAt || job.readyAt || job.collectedAt).getTime() : Infinity;
      if (finishedAt > oneHourAgoMs && job.status !== "CANCELLED") {
        waitingOneHourAgo += 1;
      }
    }
  }

  // 3. Compute Averages & Deltas
  // Avg wait minutes: average of currently waiting jobs; if none, average of today's completed jobs; if none, 0
  let avgWaitMin = 0;
  if (waitingWaitTimes.length > 0) {
    avgWaitMin = Math.round(waitingWaitTimes.reduce((a, b) => a + b, 0) / waitingWaitTimes.length);
  } else if (completedTodayWaitTimes.length > 0) {
    avgWaitMin = Math.round(completedTodayWaitTimes.reduce((a, b) => a + b, 0) / completedTodayWaitTimes.length);
  }

  let avgWaitLastWeek = 0;
  if (completedLastWeekWaitTimes.length > 0) {
    avgWaitLastWeek = Math.round(completedLastWeekWaitTimes.reduce((a, b) => a + b, 0) / completedLastWeekWaitTimes.length);
  }

  // Delta Jobs: % vs last week
  let deltaJobsPct = 0;
  if (jobsLastWeekSameDay > 0) {
    deltaJobsPct = Math.round(((jobsToday - jobsLastWeekSameDay) / jobsLastWeekSameDay) * 100);
  } else if (jobsToday > 0) {
    deltaJobsPct = 100;
  }

  // Delta Revenue: % vs last week
  let deltaRevenuePct = 0;
  if (revenueLastWeekSameDay > 0) {
    deltaRevenuePct = Math.round(((revenueToday - revenueLastWeekSameDay) / revenueLastWeekSameDay) * 100);
  } else if (revenueToday > 0) {
    deltaRevenuePct = 100;
  }

  // Delta Waiting: % vs last hour (decrease is good!)
  let deltaWaitingPct = 0;
  if (waitingOneHourAgo > 0) {
    deltaWaitingPct = Math.round(((waitingCount - waitingOneHourAgo) / waitingOneHourAgo) * 100);
  } else if (waitingCount > 0) {
    deltaWaitingPct = 100;
  }

  // Delta Avg Wait: min difference vs last week (decrease is good!)
  const deltaAvgWaitDiff = avgWaitMin - (avgWaitLastWeek || avgWaitMin);

  // 4. Sparkline Arrays (Last 7 days)
  const last7DaysBuckets = Array.from(dailyBuckets.values()).slice(-7);
  const sparklineJobs = last7DaysBuckets.map((b) => b.jobs);
  const sparklineRevenue = last7DaysBuckets.map((b) => b.revenue);
  const sparklineWaiting = last7DaysBuckets.map((b) => b.waiting);
  const sparklineAvgWait = last7DaysBuckets.map((b) => (b.waitTimeCount > 0 ? Math.round(b.waitTimeSum / b.waitTimeCount) : avgWaitMin));

  // 5. Chart Series Generation
  const seriesBuckets = Array.from(dailyBuckets.values()).slice(-rangeDays);
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const series: OverviewSeriesItem[] = seriesBuckets.map((b) => {
    let label = dayNames[b.date.getDay()];
    if (range === "30d" || range === "90d") {
      label = `${b.date.getDate()} ${b.date.toLocaleString("en-US", { month: "short" })}`;
    }
    return {
      date: b.date.toISOString().slice(0, 10),
      label,
      revenue: b.revenue,
      jobs: b.jobs,
    };
  });

  // 6. Live Queue Ordering (Window-SJF)
  const orderedQueue = applyWindowSJF(activeJobsForQueue, 5, 15, now);
  const liveQueue: OverviewLiveJob[] = orderedQueue.slice(0, 6).map((j) => {
    const createdAt = toDate(j.createdAt);
    const waitTimeMin = Math.max(1, Math.round((nowMs - createdAt.getTime()) / 60000));
    return {
      id: j.id,
      tokenNumber: j.tokenNumber || "—",
      studentName: j.studentName || "Student",
      fileName: j.fileName || "document.pdf",
      totalPages: j.totalPages || 1,
      copies: j.copies || 1,
      status: j.status,
      waitTimeMin,
    };
  });

  // 7. Printer Fleet List with real queue load
  const totalActiveJobs = activeJobsForQueue.length;
  const printersList: OverviewPrinter[] = printers.map((p) => {
    if (p.status === "OFFLINE") {
      return {
        id: p.id,
        name: p.name,
        location: p.location,
        status: "OFFLINE",
        loadPercent: 0,
      };
    }
    // Calculate realistic load based on active jobs assigned to this location or fleet
    const locationJobs = activeJobsForQueue.filter(
      (j) => !p.location || j.locationName === p.location || j.locationId === p.id
    ).length;
    // Load percent between 10% and 95% if queue is active, or 0% if no jobs
    const loadPercent = totalActiveJobs > 0
      ? Math.min(95, Math.max(15, Math.round((locationJobs / Math.max(1, totalActiveJobs)) * 80 + 10)))
      : 0;

    return {
      id: p.id,
      name: p.name,
      location: p.location,
      status: "ONLINE",
      loadPercent,
    };
  });

  // 8. Recent Activity Mapping
  const recentActivity: OverviewActivity[] = activityLogs.slice(0, 5).map((log) => {
    const timestampDate = toDate(log.timestamp);
    const actor = adminNameMap[log.adminId] || "Admin";
    const relativeTime = formatRelativeTime(timestampDate, now);

    let title = log.details || "Activity performed";
    let type: OverviewActivity["type"] = "other";

    if (log.action === "PAYMENT_VERIFIED") {
      title = `Payment received for ${log.targetId}`;
      type = "payment";
    } else if (log.action === "JOB_READY") {
      title = `Job ${log.targetId} marked as Ready`;
      type = "status";
    } else if (log.action === "JOB_STARTED") {
      title = `Printing started for ${log.targetId}`;
      type = "status";
    } else if (log.action === "JOB_CANCELLED") {
      title = `Job ${log.targetId} cancelled`;
      type = "status";
    } else if (log.action === "USER_CREATED" || log.action === "STUDENT_CREATED") {
      title = log.details ? `New student registered: ${log.details}` : "New student registered";
      type = "user";
    }

    return {
      id: log.id,
      action: log.action,
      title,
      actor,
      timestamp: timestampDate.toISOString(),
      relativeTime,
      type,
    };
  });

  return {
    range,
    locationId,
    locationName,
    stats: {
      jobsToday,
      revenueToday,
      waiting: waitingCount,
      avgWaitMin,
      deltaJobs: {
        value: deltaJobsPct,
        formatted: `${deltaJobsPct >= 0 ? "+" : ""}${deltaJobsPct}% vs last week`,
        isPositive: deltaJobsPct >= 0,
        isGood: deltaJobsPct >= 0,
      },
      deltaRevenue: {
        value: deltaRevenuePct,
        formatted: `${deltaRevenuePct >= 0 ? "+" : ""}${deltaRevenuePct}% vs last week`,
        isPositive: deltaRevenuePct >= 0,
        isGood: deltaRevenuePct >= 0,
      },
      deltaWaiting: {
        value: deltaWaitingPct,
        formatted: `${deltaWaitingPct <= 0 ? "−" : "+"}${Math.abs(deltaWaitingPct)}% vs last hour`,
        isPositive: deltaWaitingPct >= 0,
        isGood: deltaWaitingPct <= 0, // Decrease in waiting is good
      },
      deltaAvgWait: {
        value: deltaAvgWaitDiff,
        formatted: `${deltaAvgWaitDiff === 0 ? "0" : `${deltaAvgWaitDiff < 0 ? "−" : "+"}${Math.abs(deltaAvgWaitDiff)}`} min vs last week`,
        isPositive: deltaAvgWaitDiff >= 0,
        isGood: deltaAvgWaitDiff <= 0, // Decrease in avg wait is good
      },
      sparklines: {
        jobs: sparklineJobs,
        revenue: sparklineRevenue,
        waiting: sparklineWaiting,
        avgWait: sparklineAvgWait,
      },
    },
    series,
    liveQueue,
    printers: printersList,
    recentActivity,
  };
}
