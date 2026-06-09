/**
 * Window-based Shortest Job First (SJF) queue algorithm.
 * Groups jobs into time windows and sorts by page count within each window.
 */

import { FirestorePrintJob } from "@/lib/firebase/collections";

export interface QueuedJob extends FirestorePrintJob {
  queuePosition: number;
}

function toDate(ts: FirestorePrintJob["createdAt"]): Date {
  if (ts && typeof ts.toDate === "function") return ts.toDate();
  return new Date(ts as unknown as string | number);
}

export function applyWindowSJF(
  jobs: FirestorePrintJob[],
  windowMinutes: number
): QueuedJob[] {
  if (jobs.length === 0) return [];

  // Sort by creation time first to find the earliest job
  const sorted = [...jobs].sort(
    (a, b) => toDate(a.createdAt).getTime() - toDate(b.createdAt).getTime()
  );

  const windowMs = windowMinutes * 60 * 1000;
  const earliestTime = toDate(sorted[0].createdAt).getTime();

  // Group jobs into windows
  const windows: FirestorePrintJob[][] = [];

  for (const job of sorted) {
    const jobTime = toDate(job.createdAt).getTime();
    const windowIndex = Math.floor((jobTime - earliestTime) / windowMs);

    // Ensure array is large enough
    while (windows.length <= windowIndex) {
      windows.push([]);
    }
    windows[windowIndex].push(job);
  }

  // Within each window, sort by totalPages * copies ascending (shortest first)
  const result: QueuedJob[] = [];
  let position = 1;

  for (const window of windows) {
    const windowSorted = [...window].sort(
      (a, b) => a.totalPages * a.copies - b.totalPages * b.copies
    );
    for (const job of windowSorted) {
      result.push({ ...job, queuePosition: position++ });
    }
  }

  return result;
}
