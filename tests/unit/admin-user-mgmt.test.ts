/**
 * Unit tests for P-10: Password generation and admin user management
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateTempPassword,
  SAFE_ALPHABET,
  createUser,
  resetUserPassword,
} from "@/lib/firestore/users";

// Hoist mock session
const mockSession = vi.hoisted(() => ({
  user: {
    id: "admin-1",
    name: "Admin User",
    email: "admin@test.com",
    role: "ADMIN" as "STUDENT" | "ADMIN" | "SUPER_ADMIN",
    admissionNumber: "ADM001",
    locationId: "loc-main",
  },
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(async () => mockSession),
}));

// Mock firestore adminDb
const mockDocRef = {
  id: "new-user-123",
  set: vi.fn(async () => {}),
  update: vi.fn(async () => {}),
  delete: vi.fn(async () => {}),
  get: vi.fn(async () => ({ exists: false, data: () => null })),
};

const mockBatch = {
  set: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  commit: vi.fn(async () => {}),
};

const mockWhere = vi.fn();
const mockLimit = vi.fn();
const mockOrderBy = vi.fn();
const mockGet = vi.fn();

const queryChain = {
  where: mockWhere,
  limit: mockLimit,
  orderBy: mockOrderBy,
  get: mockGet,
};

mockWhere.mockReturnValue(queryChain);
mockLimit.mockReturnValue(queryChain);
mockOrderBy.mockReturnValue(queryChain);

const mockCollection = vi.fn(() => ({
  doc: vi.fn((id?: string) => ({
    ...mockDocRef,
    id: id || mockDocRef.id,
    get: vi.fn(async () => ({
      exists: true,
      id: id || mockDocRef.id,
      data: () => ({ id: id || mockDocRef.id }),
    })),
  })),
  where: mockWhere,
  limit: mockLimit,
  orderBy: mockOrderBy,
  get: mockGet,
}));

vi.mock("@/lib/firebase/admin", () => ({
  adminDb: {
    collection: (...args: any[]) => (mockCollection as any)(...args),
    batch: () => mockBatch,
  },
}));

vi.mock("@/lib/firestore/activity-logs", () => ({
  createActivityLog: vi.fn(async () => {}),
}));

describe("P-10: Password generation & entropy", () => {
  it("generates passwords of at least 12 characters", () => {
    const pw = generateTempPassword();
    expect(pw.length).toBeGreaterThanOrEqual(12);

    const pw16 = generateTempPassword(16);
    expect(pw16.length).toBe(16);

    // If requested with less than 12, enforces minimum 12
    const pwShort = generateTempPassword(6);
    expect(pwShort.length).toBe(12);
  });

  it("contains only characters from the SAFE_ALPHABET (no 0, O, o, 1, l, I)", () => {
    for (let i = 0; i < 50; i++) {
      const pw = generateTempPassword(16);
      for (const char of pw) {
        expect(SAFE_ALPHABET).toContain(char);
      }
      expect(pw).not.toMatch(/[0Oo1lI]/);
    }
  });

  it("generates distinct passwords across multiple calls", () => {
    const set = new Set<string>();
    for (let i = 0; i < 50; i++) {
      set.add(generateTempPassword(12));
    }
    expect(set.size).toBe(50);
  });
});

describe("P-10: lib/firestore/users single-write createUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates user in a single set() write and returns generated temp password", async () => {
    const result = await createUser({
      name: "Alice Smith",
      admissionNumber: "S101",
      department: "CSE",
      semester: 4,
      role: "STUDENT",
    });

    expect(result.user.name).toBe("Alice Smith");
    expect(result.user.admissionNumber).toBe("S101");
    expect(result.tempPassword.length).toBeGreaterThanOrEqual(12);
    expect(mockDocRef.set).toHaveBeenCalledTimes(1);
  });

  it("accepts valid custom password and writes doc once", async () => {
    const result = await createUser({
      name: "Bob Jones",
      admissionNumber: "S102",
      department: "ECE",
      semester: 6,
      role: "STUDENT",
      customPassword: "ValidCustomPassword123!",
    });

    expect(result.tempPassword).toBe("ValidCustomPassword123!");
    expect(mockDocRef.set).toHaveBeenCalledTimes(1);
  });

  it("rejects custom password shorter than 10 characters", async () => {
    await expect(
      createUser({
        name: "Bob Jones",
        admissionNumber: "S102",
        department: "ECE",
        semester: 6,
        role: "STUDENT",
        customPassword: "short",
      })
    ).rejects.toThrow(/at least 10 characters/);
    expect(mockDocRef.set).not.toHaveBeenCalled();
  });

  it("rejects custom password identical to admission number", async () => {
    await expect(
      createUser({
        name: "Bob Jones",
        admissionNumber: "S102",
        department: "ECE",
        semester: 6,
        role: "STUDENT",
        customPassword: "S102",
      })
    ).rejects.toThrow();
    expect(mockDocRef.set).not.toHaveBeenCalled();
  });
});

describe("P-10: resetUserPassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates passwordHash, sets firstLogin = true, and updates passwordChangedAt", async () => {
    const tempPassword = await resetUserPassword("user-999");
    expect(tempPassword.length).toBeGreaterThanOrEqual(12);
    expect(mockDocRef.update).toHaveBeenCalledTimes(1);
    const updateArg = (mockDocRef.update.mock.calls as any)[0][0];
    expect(updateArg.firstLogin).toBe(true);
    expect(updateArg.passwordHash).toBeDefined();
    expect(updateArg.passwordChangedAt).toBeDefined();
  });
});

describe("P-10: Route endpoints & role boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession.user.role = "ADMIN";
    mockSession.user.id = "admin-1";
    mockSession.user.locationId = "loc-main";
  });

  it("POST /api/admin/students validates inputs with Zod", async () => {
    const { POST } = await import("@/app/api/admin/students/route");

    const req = new Request("http://localhost/api/admin/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it("POST /api/admin/students forbids ADMIN from creating ADMIN or SUPER_ADMIN", async () => {
    mockSession.user.role = "ADMIN";
    const { POST } = await import("@/app/api/admin/students/route");

    const req = new Request("http://localhost/api/admin/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "New Admin",
        admissionNumber: "ADM99",
        department: "Administration",
        semester: 1,
        role: "ADMIN",
        locationId: "loc-1",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("POST /api/admin/admins forbids ADMIN role from accessing endpoint", async () => {
    mockSession.user.role = "ADMIN";
    const { POST } = await import("@/app/api/admin/admins/route");

    const req = new Request("http://localhost/api/admin/admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "New Admin",
        admissionNumber: "ADM99",
        locationId: "loc-1",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("POST /api/admin/admins allows SUPER_ADMIN to create ADMIN with single write", async () => {
    mockSession.user.role = "SUPER_ADMIN";
    mockWhere.mockReturnValue({
      limit: vi.fn(() => ({
        get: vi.fn(async () => ({ empty: true })),
      })),
    });

    const { POST } = await import("@/app/api/admin/admins/route");

    const req = new Request("http://localhost/api/admin/admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Admin Sarah",
        admissionNumber: "ADM02",
        locationId: "loc-1",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.user.tempPassword.length).toBeGreaterThanOrEqual(12);
    expect(mockDocRef.set).toHaveBeenCalledTimes(1);
  });

  it("POST /api/admin/students/[id]/status prevents ADMIN from modifying an ADMIN account", async () => {
    mockSession.user.role = "ADMIN";
    mockDocRef.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({ id: "target-admin", role: "ADMIN", admissionNumber: "ADM05" }),
    } as any);

    const { POST } = await import("@/app/api/admin/students/[id]/status/route");
    const req = new Request("http://localhost/api/admin/students/target-admin/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "DISABLED" }),
    });

    const res = await POST(req, { params: { id: "target-admin" } });
    expect(res.status).toBe(403);
  });

  it("POST /api/admin/students/[id]/reset-password prevents ADMIN from resetting an ADMIN password", async () => {
    mockSession.user.role = "ADMIN";
    mockDocRef.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({ id: "target-admin", role: "ADMIN", admissionNumber: "ADM05" }),
    } as any);

    const { POST } = await import("@/app/api/admin/students/[id]/reset-password/route");
    const req = new Request("http://localhost/api/admin/students/target-admin/reset-password", {
      method: "POST",
    });

    const res = await POST(req, { params: { id: "target-admin" } });
    expect(res.status).toBe(403);
  });

  it("POST /api/admin/admins/[id]/status prevents SUPER_ADMIN from disabling their own account", async () => {
    mockSession.user.role = "SUPER_ADMIN";
    mockSession.user.id = "super-admin-1";

    mockDocRef.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({ id: "super-admin-1", role: "SUPER_ADMIN", admissionNumber: "SA01" }),
    } as any);

    const { POST } = await import("@/app/api/admin/admins/[id]/status/route");
    const req = new Request("http://localhost/api/admin/admins/super-admin-1/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "DISABLED" }),
    });

    const res = await POST(req, { params: { id: "super-admin-1" } });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/own account/i);
  });

  it("POST /api/admin/students/bulk enforces 1000 item cap and returns credentials CSV", async () => {
    mockSession.user.role = "ADMIN";
    const { POST } = await import("@/app/api/admin/students/bulk/route");

    // Over 1000 items
    const tooMany = new Array(1001).fill(null).map((_, i) => ({
      admissionNumber: `STU${i}`,
      name: `Student ${i}`,
      department: "CSE",
      semester: 1,
    }));

    const reqTooMany = new Request("http://localhost/api/admin/students/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tooMany),
    });

    const resTooMany = await POST(reqTooMany);
    expect(resTooMany.status).toBe(400);

    // Valid batch of 2 students
    mockWhere.mockReturnValue({
      get: vi.fn(async () => ({ docs: [] })),
    });

    const validBatch = [
      { admissionNumber: "B101", name: "Bob", department: "CSE", semester: 2 },
      { admissionNumber: "B102", name: "Alice", department: "ECE", semester: 4 },
    ];

    const reqValid = new Request("http://localhost/api/admin/students/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validBatch),
    });

    const resValid = await POST(reqValid);
    expect(resValid.status).toBe(200);
    const json = await resValid.json();
    expect(json.success).toBe(true);
    expect(json.created).toBe(2);
    expect(json.credentials).toHaveLength(2);
    expect(json.credentialsCsv).toContain("Admission Number,Name,Temporary Password");
    expect(json.credentialsCsv).toContain("B101");
    expect(mockBatch.commit).toHaveBeenCalled();
  });
});
