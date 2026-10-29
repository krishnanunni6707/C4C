/**
 * Unit tests for P-15: Cleanups and Quality
 * - Typing auth callbacks without any
 * - Extracted student hooks (usePricing, usePrintSettings, usePayment)
 * - Admin route pagination (students, queue)
 * - Cache-Control: no-store header enforcement
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToString } from "react-dom/server";
import nextConfig from "@/next.config.mjs";
import { NO_CACHE_HEADERS } from "@/lib/api/guards";
import { authOptions } from "@/lib/auth";
import { usePricing } from "@/lib/hooks/usePricing";
import { usePrintSettings } from "@/lib/hooks/usePrintSettings";

// Mock admin session
const mockSession = vi.hoisted(() => ({
  user: {
    id: "super-1",
    name: "Super Admin",
    email: "super@test.com",
    role: "SUPER_ADMIN" as const,
    admissionNumber: "ADM999",
    locationId: null,
  },
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(async () => mockSession),
}));

// Mock Firestore queries for adminDb
const mockDocs = [
  { id: "student-1", data: () => ({ name: "Alice", role: "STUDENT", admissionNumber: "ADM001" }) },
  { id: "student-2", data: () => ({ name: "Bob", role: "STUDENT", admissionNumber: "ADM002" }) },
  { id: "student-3", data: () => ({ name: "Charlie", role: "STUDENT", admissionNumber: "ADM003" }) },
];

const mockJobDocs = [
  { id: "job-1", data: () => ({ studentId: "student-1", amount: 10, paymentStatus: "PAID", status: "WAITING", createdAt: { seconds: 100 } }) },
  { id: "job-2", data: () => ({ studentId: "student-2", amount: 20, paymentStatus: "PAID", status: "WAITING", createdAt: { seconds: 200 } }) },
];

let queryLimit = 50;

const mockQueryChain: any = {
  where: vi.fn(() => mockQueryChain),
  orderBy: vi.fn(() => mockQueryChain),
  limit: vi.fn((n: number) => {
    queryLimit = n;
    return mockQueryChain;
  }),
  startAfter: vi.fn(() => mockQueryChain),
  get: vi.fn(async () => {
    return {
      docs: mockDocs.slice(0, queryLimit),
    };
  }),
};

vi.mock("@/lib/firebase/admin", () => ({
  adminDb: {
    collection: vi.fn((colName: string) => {
      if (colName === "printJobs") {
        return {
          ...mockQueryChain,
          get: vi.fn(async () => ({ docs: mockJobDocs })),
          doc: vi.fn(() => ({
            get: vi.fn(async () => ({ exists: true, id: "cursor-job" })),
          })),
        };
      }
      return {
        ...mockQueryChain,
        doc: vi.fn((id: string) => ({
          get: vi.fn(async () => ({ exists: true, id })),
        })),
      };
    }),
  },
}));

vi.mock("@/lib/firestore/settings", () => ({
  getSettings: vi.fn(async () => ({ queueWindowMinutes: 5 })),
}));

describe("P-15: Auth callback typing and session invalidation", () => {
  it("jwt callback returns expired token { id: undefined, exp: 0 } when user is disabled", async () => {
    vi.mock("@/lib/firestore/auth", () => ({
      getUserById: vi.fn(async () => ({ status: "DISABLED" })),
      getUserByAdmissionNumber: vi.fn(),
      verifyPassword: vi.fn(),
    }));

    const jwtCallback = authOptions.callbacks?.jwt;
    expect(jwtCallback).toBeDefined();

    if (jwtCallback) {
      const now = Date.now();
      const token = {
        id: "user-123",
        lastChecked: now - 100_000, // triggers refresh (> 60s)
      };

      const result = await (jwtCallback as any)({ token, user: undefined });
      expect(result.id).toBeUndefined();
      expect(result.exp).toBe(0);
    }
  });

  it("session callback returns expired session without user when token id is missing", async () => {
    const sessionCallback = authOptions.callbacks?.session;
    expect(sessionCallback).toBeDefined();

    if (sessionCallback) {
      const session = { expires: "2099-01-01" };
      const token = {}; // missing id

      const result = await (sessionCallback as any)({ session, token });
      expect(result.user).toBeUndefined();
      expect(new Date(result.expires).getTime()).toBeLessThan(Date.now());
    }
  });
});

describe("P-15: Extracted student hooks", () => {
  it("usePricing computes correct single-sided and double-sided costs", () => {
    const initialPricing = {
      bwSingleSidedPrice: 2,
      bwDoubleSidedPrice: 3,
      colorSingleSidedPrice: 5,
      colorDoubleSidedPrice: 8,
    };

    function TestPricing({ options, onData }: { options: any; onData: (d: any) => void }) {
      const data = usePricing(options);
      onData(data);
      return null;
    }

    // 10 pages B&W single-sided, 1 copy = 10 * 2 = 20
    let bwSingleData: any;
    renderToString(
      React.createElement(TestPricing, {
        options: {
          pagesCount: 10,
          copies: 1,
          colorMode: "BW",
          printType: "single-sided",
          initialPricing,
        },
        onData: (d) => {
          bwSingleData = d;
        },
      })
    );
    expect(bwSingleData.estimatedCost).toBe(20);
    expect(bwSingleData.isDuplex).toBe(false);
    expect(bwSingleData.sheetsCount).toBe(10);
    expect(bwSingleData.pricePerSheet).toBe(2);

    // 10 pages B&W double-sided, 2 copies = 5 sheets * 3 * 2 = 30
    let bwDuplexData: any;
    renderToString(
      React.createElement(TestPricing, {
        options: {
          pagesCount: 10,
          copies: 2,
          colorMode: "BW",
          printType: "double-sided",
          initialPricing,
        },
        onData: (d) => {
          bwDuplexData = d;
        },
      })
    );
    expect(bwDuplexData.estimatedCost).toBe(30);
    expect(bwDuplexData.isDuplex).toBe(true);
    expect(bwDuplexData.sheetsCount).toBe(5);
    expect(bwDuplexData.pricePerSheet).toBe(3);

    // 10 pages Color double-sided, 1 copy = 5 sheets * 8 = 40
    let colorDuplexData: any;
    renderToString(
      React.createElement(TestPricing, {
        options: {
          pagesCount: 10,
          copies: 1,
          colorMode: "COLOR",
          printType: "double-sided",
          initialPricing,
        },
        onData: (d) => {
          colorDuplexData = d;
        },
      })
    );
    expect(colorDuplexData.estimatedCost).toBe(40);
  });

  it("usePrintSettings initializes with defaults", () => {
    let settingsData: any;
    function TestSettings({ onData }: { onData: (d: any) => void }) {
      const data = usePrintSettings({
        userId: "test-user",
        locations: [{ id: "loc-1", name: "Main Hub" }],
      });
      onData(data);
      return null;
    }

    renderToString(
      React.createElement(TestSettings, {
        onData: (d) => {
          settingsData = d;
        },
      })
    );

    expect(settingsData.wizardStep).toBe("UPLOAD");
    expect(settingsData.selectedLocationId).toBe("loc-1");
    expect(settingsData.copies).toBe(1);
    expect(settingsData.colorMode).toBe("BW");
    expect(typeof settingsData.handleFilesChange).toBe("function");
    expect(typeof settingsData.resetSettings).toBe("function");
  });
});

describe("P-15: Admin route pagination", () => {
  it("GET /api/admin/students handles limit and cursor parameters", async () => {
    const { GET } = await import("@/app/api/admin/students/route");

    const req = new Request("http://localhost/api/admin/students?limit=2&cursor=student-1");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("users");
    expect(json).toHaveProperty("hasMore");
    expect(json).toHaveProperty("lastDocId");
    expect(res.headers.get("Cache-Control")).toContain("no-store");
  });

  it("GET /api/admin/queue handles limit, status, and cursor parameters", async () => {
    const { GET } = await import("@/app/api/admin/queue/route");

    const req = new Request("http://localhost/api/admin/queue?limit=10&status=WAITING&cursor=cursor-job");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("jobs");
    expect(json).toHaveProperty("hasMore");
    expect(json).toHaveProperty("lastDocId");
    expect(res.headers.get("Cache-Control")).toContain("no-store");
  });
});

describe("P-15: Security & Cache-Control header enforcement", () => {
  it("next.config.mjs specifies Cache-Control: no-store for /api/:path*", async () => {
    const headersConfig = await nextConfig.headers();
    const apiHeaderRule = headersConfig.find((r: any) => r.source === "/api/:path*");

    expect(apiHeaderRule).toBeDefined();
    const cacheControlHeader = apiHeaderRule?.headers.find((h: any) => h.key === "Cache-Control");
    expect(cacheControlHeader?.value).toBe("no-store, no-cache, must-revalidate");
  });

  it("guards export NO_CACHE_HEADERS with no-store, no-cache, must-revalidate", () => {
    expect(NO_CACHE_HEADERS["Cache-Control"]).toBe("no-store, no-cache, must-revalidate");
  });
});
