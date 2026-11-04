/**
 * lib/admin/job-date.ts
 *
 * Centralized datetime formatting for Admin Job pages in Asia/Kolkata timezone.
 */

export function parseTimestamp(ts: any): Date | null {
  if (!ts) return null;
  if (typeof ts?.toDate === "function") {
    return ts.toDate();
  }
  if (typeof ts === "object" && typeof ts.seconds === "number") {
    return new Date(ts.seconds * 1000);
  }
  const d = new Date(ts);
  return isNaN(d.getTime()) ? null : d;
}

export function formatKolkataDateTime(
  ts: any,
  options?: { includeYear?: boolean }
): string {
  const date = parseTimestamp(ts);
  if (!date) return "—";

  const includeYear = options?.includeYear ?? true;

  const datePart = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    month: "short",
    day: "numeric",
    ...(includeYear ? { year: "numeric" } : {}),
  }).format(date);

  const timePart = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);

  return `${datePart} • ${timePart}`;
}

export function formatKolkataShort(ts: any): string {
  return formatKolkataDateTime(ts, { includeYear: false });
}
