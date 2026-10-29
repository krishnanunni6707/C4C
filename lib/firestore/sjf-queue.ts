/**
 * Window-based Shortest Job First (SJF) queue algorithm with starvation guard.
 *
 * Jobs that have been waiting longer than `starvationThresholdMinutes` are
 * promoted to the front of the queue in FIFO order (oldest first).
 *
 * Remaining jobs are grouped into time windows (`windowMinutes`) and sorted
 * shortest-job-first (`totalPages * copies`) within each window.
 */

import { FirestorePrintJob } from "@/lib/firebase/collections";

export interface QueuedJob extends FirestorePrintJob {
  queuePosition: number;
  isStarved?: boolean;
}

function toDate(ts: FirestorePrintJob["createdAt"]): Date {
  if (ts && typeof (ts as any).toDate === "function") return (ts as any).toDate();
  if (ts && typeof ts === "object" && "seconds" in (ts as any)) {
    return new Date((ts as any).seconds * 1000);
  }
  return new Date(ts as unknown as string | number);
}

export function applyWindowSJF(
  jobs: FirestorePrintJob[],
  windowMinutes = 5,
  starvationThresholdMinutes = 15,
  currentTime = new Date()
): QueuedJob[] {
  if (jobs.length === 0) return [];

  const nowMs = currentTime.getTime();
  const starvationThresholdMs = starvationThresholdMinutes * 60 * 1000;

  const starvedJobs: FirestorePrintJob[] = [];
  const regularJobs: FirestorePrintJob[] = [];

  for (const job of jobs) {
    const jobTime = toDate(job.createdAt).getTime();
    if (nowMs - jobTime >= starvationThresholdMs) {
      starvedJobs.push(job);
    } else {
      regularJobs.push(job);
    }
  }

  // Starved jobs are served first, strictly FIFO (oldest first)
  starvedJobs.sort(
    (a, b) => toDate(a.createdAt).getTime() - toDate(b.createdAt).getTime()
  );

  // Regular jobs use window-based SJF
  const regularResult: FirestorePrintJob[] = [];

  if (regularJobs.length > 0) {
    regularJobs.sort(
      (a, b) => toDate(a.createdAt).getTime() - toDate(b.createdAt).getTime()
    );

    const windowMs = windowMinutes * 60 * 1000;
    const earliestTime = toDate(regularJobs[0].createdAt).getTime();

    const windows: FirestorePrintJob[][] = [];

    for (const job of regularJobs) {
      const jobTime = toDate(job.createdAt).getTime();
      const windowIndex = Math.max(
        0,
        Math.floor((jobTime - earliestTime) / windowMs)
      );

      while (windows.length <= windowIndex) {
        windows.push([]);
      }
      windows[windowIndex].push(job);
    }

    for (const window of windows) {
      // Shortest first (totalPages * copies); tie-breaker is createdAt ascending
      window.sort((a, b) => {
        const pagesA = (a.totalPages || 1) * (a.copies || 1);
        const pagesB = (b.totalPages || 1) * (b.copies || 1);
        if (pagesA !== pagesB) return pagesA - pagesB;
        return toDate(a.createdAt).getTime() - toDate(b.createdAt).getTime();
      });
      regularResult.push(...window);
    }
  }

  const combined = [
    ...starvedJobs.map((j) => ({ ...j, isStarved: true })),
    ...regularResult.map((j) => ({ ...j, isStarved: false })),
  ];

  let position = 1;
  return combined.map((job) => ({
    ...job,
    queuePosition: position++,
  }));
}

