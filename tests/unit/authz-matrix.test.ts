/**
 * Comprehensive Route-Authorization Matrix Test (Phase 5 / Appendix C)
 *
 * Evaluates route groups against 6 actor personas:
 * 1. Anonymous (Unauthenticated / No Session)
 * 2. Disabled User (session.user.disabled = true)
 * 3. Student (role: "STUDENT", locationId: null)
 * 4. Admin (Own Location) (role: "ADMIN", locationId: "loc-A")
 * 5. Admin (Other Location) (role: "ADMIN", locationId: "loc-B")
 * 6. Super Admin (role: "SUPER_ADMIN", locationId: null)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next-auth
let currentSession: any = null;
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(async () => currentSession),
}));

// Mock firestore helpers
vi.mock("@/lib/firestore/print-jobs", () => ({
  getPrintJobById: vi.fn(async (id: string) => {
    if (id === "job-loc-a-student-1") {
      return {
        id,
        locationId: "loc-A",
        studentId: "student-1",
        status: "WAITING",
        amount: 20,
      };
    }
    if (id === "job-loc-b-student-2") {
      return {
        id,
        locationId: "loc-B",
        studentId: "student-2",
        status: "WAITING",
        amount: 30,
      };
    }
    return null;
  }),
  getPrintJobsByStudent: vi.fn(async () => []),
}));

vi.mock("@/lib/firebase/admin", () => ({
  adminDb: {
    collection: vi.fn(() => ({
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      get: vi.fn(async () => ({ docs: [] })),
      doc: vi.fn(() => ({
        get: vi.fn(async () => ({ exists: true, data: () => ({ role: "STUDENT" }) })),
        update: vi.fn(async () => {}),
        delete: vi.fn(async () => {}),
      })),
    })),
  },
}));

vi.mock("@/lib/firestore/settings", () => ({
  getSettings: vi.fn(async () => ({ queueWindowMinutes: 5 })),
}));

// Actor definitions
const ACTORS = {
  ANONYMOUS: null,
  DISABLED: {
    user: { id: "student-dis", role: "STUDENT", disabled: true, admissionNumber: "DIS001" },
  },
  STUDENT: {
    user: { id: "student-1", role: "STUDENT", locationId: null, admissionNumber: "STU001" },
  },
  ADMIN_LOC_A: {
    user: { id: "admin-a", role: "ADMIN", locationId: "loc-A", admissionNumber: "ADM00A" },
  },
  ADMIN_LOC_B: {
    user: { id: "admin-b", role: "ADMIN", locationId: "loc-B", admissionNumber: "ADM00B" },
  },
  SUPER_ADMIN: {
    user: { id: "super-1", role: "SUPER_ADMIN", locationId: null, admissionNumber: "SUP999" },
  },
};

describe("Phase 5: Target Route Authorization Matrix (Appendix C)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Anonymous & Disabled Rejection Across Protected Endpoints", () => {
    it("Anonymous (401) and Disabled (403) on Student routes", async () => {
      const { GET: getJobs } = await import("@/app/api/print-jobs/user/route");
      const req = new Request("http://localhost/api/print-jobs/user");

      // Anonymous -> 401
      currentSession = ACTORS.ANONYMOUS;
      const resAnon = await getJobs();
      expect(resAnon.status).toBe(401);

      // Disabled -> 403
      currentSession = ACTORS.DISABLED;
      const resDis = await getJobs();
      expect(resDis.status).toBe(403);
    });

    it("Anonymous (401) and Disabled (403) on Admin Queue route", async () => {
      const { GET: getQueue } = await import("@/app/api/admin/queue/route");
      const req = new Request("http://localhost/api/admin/queue");

      currentSession = ACTORS.ANONYMOUS;
      const resAnon = await getQueue(req);
      expect(resAnon.status).toBe(401);

      currentSession = ACTORS.DISABLED;
      const resDis = await getQueue(req);
      expect(resDis.status).toBe(403);
    });

    it("Anonymous (401) and Disabled (403) on Super Admin route", async () => {
      const { GET: getAdmins } = await import("@/app/api/admin/admins/route");

      currentSession = ACTORS.ANONYMOUS;
      const resAnon = await getAdmins();
      expect(resAnon.status).toBe(401);

      currentSession = ACTORS.DISABLED;
      const resDis = await getAdmins();
      expect(resDis.status).toBe(403);
    });
  });

  describe("2. Student Access Boundaries", () => {
    it("STUDENT can access student-specific routes (print-jobs/user)", async () => {
      const { GET: getJobs } = await import("@/app/api/print-jobs/user/route");
      currentSession = ACTORS.STUDENT;

      const res = await getJobs();
      expect(res.status).toBe(200);
    });

    it("STUDENT is forbidden from admin routes (admin/queue, admin/students)", async () => {
      const { GET: getQueue } = await import("@/app/api/admin/queue/route");
      const { GET: getStudents } = await import("@/app/api/admin/students/route");

      currentSession = ACTORS.STUDENT;

      const queueRes = await getQueue(new Request("http://localhost/api/admin/queue"));
      expect(queueRes.status).toBe(403);

      const studentsRes = await getStudents(new Request("http://localhost/api/admin/students"));
      expect(studentsRes.status).toBe(403);
    });

    it("STUDENT cannot read another student's job or perform admin job transitions", async () => {
      const { GET: getJob } = await import("@/app/api/admin/jobs/[id]/route");
      const { POST: startJob } = await import("@/app/api/admin/jobs/[id]/start/route");

      currentSession = ACTORS.STUDENT;

      // Another student's job -> 403
      const readRes = await getJob(new Request("http://localhost"), {
        params: { id: "job-loc-b-student-2" },
      });
      expect(readRes.status).toBe(403);

      // Student trying to start an admin job -> 403
      const startRes = await startJob(new Request("http://localhost", { method: "POST" }), {
        params: { id: "job-loc-a-student-1" },
      });
      expect(startRes.status).toBe(403);
    });
  });

  describe("3. Admin Location Scoping (Loc-A vs Loc-B)", () => {
    it("ADMIN can access queue and read jobs in their OWN location", async () => {
      const { GET: getQueue } = await import("@/app/api/admin/queue/route");
      const { GET: getJob } = await import("@/app/api/admin/jobs/[id]/route");

      currentSession = ACTORS.ADMIN_LOC_A;

      const queueRes = await getQueue(new Request("http://localhost/api/admin/queue"));
      expect(queueRes.status).toBe(200);

      const jobRes = await getJob(new Request("http://localhost"), {
        params: { id: "job-loc-a-student-1" },
      });
      expect(jobRes.status).toBe(200);
    });

    it("ADMIN is forbidden from accessing jobs belonging to ANOTHER location", async () => {
      const { GET: getJob } = await import("@/app/api/admin/jobs/[id]/route");

      // Admin from Loc-A tries to access Loc-B job -> 403
      currentSession = ACTORS.ADMIN_LOC_A;
      const res = await getJob(new Request("http://localhost"), {
        params: { id: "job-loc-b-student-2" },
      });
      expect(res.status).toBe(403);
    });

    it("ADMIN is forbidden from Super Admin endpoints (admin/admins)", async () => {
      const { GET: getAdmins } = await import("@/app/api/admin/admins/route");

      currentSession = ACTORS.ADMIN_LOC_A;
      const res = await getAdmins();
      expect(res.status).toBe(403);
    });
  });

  describe("4. Super Admin Global Access", () => {
    it("SUPER_ADMIN can access jobs across ANY location", async () => {
      const { GET: getJob } = await import("@/app/api/admin/jobs/[id]/route");
      currentSession = ACTORS.SUPER_ADMIN;

      // Access Loc-A job
      const resA = await getJob(new Request("http://localhost"), {
        params: { id: "job-loc-a-student-1" },
      });
      expect(resA.status).toBe(200);

      // Access Loc-B job
      const resB = await getJob(new Request("http://localhost"), {
        params: { id: "job-loc-b-student-2" },
      });
      expect(resB.status).toBe(200);
    });

    it("SUPER_ADMIN can access Super Admin-only routes (admin/admins)", async () => {
      const { GET: getAdmins } = await import("@/app/api/admin/admins/route");
      currentSession = ACTORS.SUPER_ADMIN;

      const res = await getAdmins();
      expect(res.status).toBe(200);
    });
  });

  describe("5. Cron & Public Bearer Authentication", () => {
    it("GET /api/cron/cleanup enforces CRON_SECRET authorization", async () => {
      const { GET: cleanup } = await import("@/app/api/cron/cleanup/route");

      // No secret -> 401
      const reqNoSecret = new Request("http://localhost/api/cron/cleanup");
      const resNoSecret = await cleanup(reqNoSecret);
      expect(resNoSecret.status).toBe(401);

      // Wrong secret -> 401
      const reqWrongSecret = new Request("http://localhost/api/cron/cleanup", {
        headers: { authorization: "Bearer invalid-secret" },
      });
      const resWrongSecret = await cleanup(reqWrongSecret);
      expect(resWrongSecret.status).toBe(401);
    });
  });
});
