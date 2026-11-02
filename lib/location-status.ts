/**
 * Pure helpers and calculation constants for location status and hours.
 */

export const AVG_MINUTES_PER_JOB = 1.5;
export const JOBS_PER_PRINTER_CAPACITY = 3;
export const CAMPUS_NAME = "Main Campus";

export type OpenState = "open" | "closing" | "closed" | "unknown";

/**
 * Parses "HH:MM" into total minutes from midnight (0 to 1439).
 * Returns null if string format is invalid.
 */
export function parseTimeToMinutes(timeStr?: string | null): number | null {
  if (!timeStr || typeof timeStr !== "string") return null;
  const match = timeStr.trim().match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  return hours * 60 + minutes;
}

/**
 * Gets current minutes from midnight in Asia/Kolkata timezone for a given Date.
 */
export function getKolkataMinutes(now: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const hourPart = parts.find((p) => p.type === "hour")?.value ?? "0";
  const minutePart = parts.find((p) => p.type === "minute")?.value ?? "0";

  const hour = parseInt(hourPart, 10);
  const minute = parseInt(minutePart, 10);

  return (hour % 24) * 60 + minute;
}

/**
 * Determines location open state ("open", "closing", "closed", "unknown")
 * based on current time in Asia/Kolkata timezone.
 * "closing" = 60 minutes or less before close.
 */
export function getOpenState(
  now: Date,
  openTime?: string | null,
  closeTime?: string | null
): OpenState {
  const openMinutes = parseTimeToMinutes(openTime);
  const closeMinutes = parseTimeToMinutes(closeTime);

  if (openMinutes === null || closeMinutes === null) {
    return "unknown";
  }

  const currentMinutes = getKolkataMinutes(now);

  // Case 1: Standard hours (e.g. 08:00 to 18:00, openMinutes < closeMinutes)
  if (openMinutes < closeMinutes) {
    if (currentMinutes < openMinutes || currentMinutes >= closeMinutes) {
      return "closed";
    }
    const minutesToClose = closeMinutes - currentMinutes;
    if (minutesToClose <= 60) {
      return "closing";
    }
    return "open";
  }

  // Case 2: Overnight hours spanning midnight (e.g. 20:00 to 04:00, openMinutes > closeMinutes)
  if (openMinutes > closeMinutes) {
    const isOpen = currentMinutes >= openMinutes || currentMinutes < closeMinutes;
    if (!isOpen) {
      return "closed";
    }

    const minutesToClose =
      currentMinutes >= openMinutes
        ? 24 * 60 - currentMinutes + closeMinutes
        : closeMinutes - currentMinutes;

    if (minutesToClose <= 60) {
      return "closing";
    }
    return "open";
  }

  // Case 3: openMinutes === closeMinutes (open 24 hours if defined, or closed)
  return "closed";
}

/**
 * Progress bar and badge color based on load percentage:
 * - Up to 50%: indigo-600
 * - 51–79%: green-500
 * - 80–99%: amber-400
 * - 100%: rose-500
 */
export function loadColor(percent: number): string {
  if (percent <= 50) return "indigo-600";
  if (percent <= 79) return "green-500";
  if (percent <= 99) return "amber-400";
  return "rose-500";
}

/**
 * Progress bar tailwind background class helper
 */
export function loadColorBgClass(percent: number): string {
  if (percent <= 50) return "bg-indigo-600";
  if (percent <= 79) return "bg-green-500";
  if (percent <= 99) return "bg-amber-400";
  return "bg-rose-500";
}

/**
 * Formats "08:00", "18:00" to "8:00 AM – 6:00 PM" with en-dash (–).
 * Returns empty string if either time is missing or invalid.
 */
export function formatHours(
  openTime?: string | null,
  closeTime?: string | null
): string {
  const openM = parseTimeToMinutes(openTime);
  const closeM = parseTimeToMinutes(closeTime);

  if (openM === null || closeM === null) return "";

  const formatSingle = (totalMin: number): string => {
    const hours24 = Math.floor(totalMin / 60) % 24;
    const mins = totalMin % 60;
    const period = hours24 >= 12 ? "PM" : "AM";
    const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
    const formattedMins = mins.toString().padStart(2, "0");
    return `${hours12}:${formattedMins} ${period}`;
  };

  return `${formatSingle(openM)} \u2013 ${formatSingle(closeM)}`;
}

/**
 * Calculates estimated wait time in minutes:
 * ceil(queueAhead * AVG_MINUTES_PER_JOB / max(printersOnline, 1))
 * Returns null if printersOnline is 0.
 */
export function calculateEstWaitMinutes(
  queueAhead: number,
  printersOnline: number
): number | null {
  if (printersOnline <= 0) return null;
  return Math.ceil((queueAhead * AVG_MINUTES_PER_JOB) / Math.max(printersOnline, 1));
}

/**
 * Calculates load percent:
 * min(100, round(queueAhead / (max(printersOnline, 1) * JOBS_PER_PRINTER_CAPACITY) * 100))
 */
export function calculateLoadPercent(
  queueAhead: number,
  printersOnline: number
): number {
  const capacity = Math.max(printersOnline, 1) * JOBS_PER_PRINTER_CAPACITY;
  return Math.min(100, Math.round((queueAhead / capacity) * 100));
}
