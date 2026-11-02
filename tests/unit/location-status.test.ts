import { describe, it, expect } from "vitest";
import {
  AVG_MINUTES_PER_JOB,
  JOBS_PER_PRINTER_CAPACITY,
  CAMPUS_NAME,
  parseTimeToMinutes,
  getOpenState,
  loadColor,
  loadColorBgClass,
  formatHours,
  calculateEstWaitMinutes,
  calculateLoadPercent,
} from "@/lib/location-status";

describe("Location Status Helpers", () => {
  describe("Constants", () => {
    it("exports required calculation constants", () => {
      expect(AVG_MINUTES_PER_JOB).toBe(1.5);
      expect(JOBS_PER_PRINTER_CAPACITY).toBe(3);
      expect(CAMPUS_NAME).toBe("Main Campus");
    });
  });

  describe("parseTimeToMinutes", () => {
    it("parses valid HH:MM formats correctly", () => {
      expect(parseTimeToMinutes("00:00")).toBe(0);
      expect(parseTimeToMinutes("08:00")).toBe(480);
      expect(parseTimeToMinutes("13:30")).toBe(810);
      expect(parseTimeToMinutes("23:59")).toBe(1439);
    });

    it("returns null for invalid inputs", () => {
      expect(parseTimeToMinutes(undefined)).toBeNull();
      expect(parseTimeToMinutes(null)).toBeNull();
      expect(parseTimeToMinutes("")).toBeNull();
      expect(parseTimeToMinutes("24:00")).toBeNull();
      expect(parseTimeToMinutes("8:00")).toBeNull();
      expect(parseTimeToMinutes("invalid")).toBeNull();
    });
  });

  describe("formatHours", () => {
    it("formats 24h ranges into 12h AM/PM strings with en-dash", () => {
      expect(formatHours("08:00", "18:00")).toBe("8:00 AM \u2013 6:00 PM");
      expect(formatHours("08:00", "16:00")).toBe("8:00 AM \u2013 4:00 PM");
      expect(formatHours("00:00", "12:00")).toBe("12:00 AM \u2013 12:00 PM");
      expect(formatHours("11:30", "23:45")).toBe("11:30 AM \u2013 11:45 PM");
    });

    it("returns empty string if either time is missing or invalid", () => {
      expect(formatHours(undefined, "18:00")).toBe("");
      expect(formatHours("08:00", undefined)).toBe("");
      expect(formatHours(null, null)).toBe("");
      expect(formatHours("bad", "18:00")).toBe("");
    });
  });

  describe("getOpenState with Asia/Kolkata timezone", () => {
    // Helper to create a Date corresponding to specific IST time
    // UTC is IST - 5 hours 30 minutes
    const createIstDate = (hour: number, minute: number): Date => {
      // 2026-10-30T<UTC_TIME>Z
      const date = new Date(Date.UTC(2026, 9, 30, 0, 0, 0));
      // Add IST offset: IST = UTC + 5:30 -> UTC = IST - 5:30
      const totalIstMinutes = hour * 60 + minute;
      const totalUtcMinutes = totalIstMinutes - 330;
      date.setUTCMinutes(totalUtcMinutes);
      return date;
    };

    it("returns unknown when openTime or closeTime is missing", () => {
      const now = createIstDate(12, 0);
      expect(getOpenState(now, undefined, "18:00")).toBe("unknown");
      expect(getOpenState(now, "08:00", undefined)).toBe("unknown");
      expect(getOpenState(now, null, null)).toBe("unknown");
    });

    it("correctly identifies standard business hours (08:00 – 18:00)", () => {
      // 07:45 IST -> closed (before open)
      expect(getOpenState(createIstDate(7, 45), "08:00", "18:00")).toBe("closed");

      // 08:00 IST -> open (just opened)
      expect(getOpenState(createIstDate(8, 0), "08:00", "18:00")).toBe("open");

      // 12:30 IST -> open
      expect(getOpenState(createIstDate(12, 30), "08:00", "18:00")).toBe("open");

      // 17:00 IST (exactly 60 min before close) -> closing
      expect(getOpenState(createIstDate(17, 0), "08:00", "18:00")).toBe("closing");

      // 17:45 IST (15 min before close) -> closing
      expect(getOpenState(createIstDate(17, 45), "08:00", "18:00")).toBe("closing");

      // 18:00 IST -> closed
      expect(getOpenState(createIstDate(18, 0), "08:00", "18:00")).toBe("closed");

      // 21:00 IST -> closed
      expect(getOpenState(createIstDate(21, 0), "08:00", "18:00")).toBe("closed");
    });

    it("correctly identifies overnight hours spanning midnight (20:00 – 04:00)", () => {
      // 19:30 IST -> closed
      expect(getOpenState(createIstDate(19, 30), "20:00", "04:00")).toBe("closed");

      // 20:15 IST -> open
      expect(getOpenState(createIstDate(20, 15), "20:00", "04:00")).toBe("open");

      // 01:00 IST (post midnight) -> open
      expect(getOpenState(createIstDate(1, 0), "20:00", "04:00")).toBe("open");

      // 03:15 IST (45 min before 04:00 close) -> closing
      expect(getOpenState(createIstDate(3, 15), "20:00", "04:00")).toBe("closing");

      // 04:00 IST -> closed
      expect(getOpenState(createIstDate(4, 0), "20:00", "04:00")).toBe("closed");

      // 12:00 IST -> closed
      expect(getOpenState(createIstDate(12, 0), "20:00", "04:00")).toBe("closed");
    });
  });

  describe("loadColor and loadColorBgClass", () => {
    it("returns correct color tokens based on percent scale", () => {
      // up to 50% -> indigo-600
      expect(loadColor(0)).toBe("indigo-600");
      expect(loadColor(45)).toBe("indigo-600");
      expect(loadColor(50)).toBe("indigo-600");
      expect(loadColorBgClass(50)).toBe("bg-indigo-600");

      // 51-79% -> green-500
      expect(loadColor(51)).toBe("green-500");
      expect(loadColor(60)).toBe("green-500");
      expect(loadColor(79)).toBe("green-500");
      expect(loadColorBgClass(60)).toBe("bg-green-500");

      // 80-99% -> amber-400
      expect(loadColor(80)).toBe("amber-400");
      expect(loadColor(85)).toBe("amber-400");
      expect(loadColor(99)).toBe("amber-400");
      expect(loadColorBgClass(85)).toBe("bg-amber-400");

      // 100% -> rose-500
      expect(loadColor(100)).toBe("rose-500");
      expect(loadColor(105)).toBe("rose-500");
      expect(loadColorBgClass(100)).toBe("bg-rose-500");
    });
  });

  describe("calculateEstWaitMinutes", () => {
    it("calculates ceiling of queue * 1.5 / printersOnline", () => {
      // 3 ahead, 5 printers -> ceil(3 * 1.5 / 5) = ceil(0.9) = 1
      expect(calculateEstWaitMinutes(3, 5)).toBe(1);

      // 5 ahead, 3 printers -> ceil(5 * 1.5 / 3) = ceil(2.5) = 3
      expect(calculateEstWaitMinutes(5, 3)).toBe(3);

      // 1 ahead, 4 printers -> ceil(1 * 1.5 / 4) = ceil(0.375) = 1
      expect(calculateEstWaitMinutes(1, 4)).toBe(1);

      // 0 ahead, 4 printers -> 0
      expect(calculateEstWaitMinutes(0, 4)).toBe(0);
    });

    it("returns null when printersOnline is 0", () => {
      expect(calculateEstWaitMinutes(3, 0)).toBeNull();
      expect(calculateEstWaitMinutes(0, 0)).toBeNull();
    });
  });

  describe("calculateLoadPercent", () => {
    it("calculates percentage capped at 100 based on capacity", () => {
      // 3 ahead, 5 printers -> capacity = 15 -> 3/15 = 20%
      expect(calculateLoadPercent(3, 5)).toBe(20);

      // 9 ahead, 3 printers -> capacity = 9 -> 9/9 = 100%
      expect(calculateLoadPercent(9, 3)).toBe(100);

      // 15 ahead, 3 printers -> capacity = 9 -> capped at 100%
      expect(calculateLoadPercent(15, 3)).toBe(100);

      // 0 ahead, 3 printers -> 0%
      expect(calculateLoadPercent(0, 3)).toBe(0);
    });
  });
});
