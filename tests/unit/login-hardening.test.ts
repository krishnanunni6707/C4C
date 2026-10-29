import { describe, it, expect, vi, beforeEach } from "vitest";
import { authOptions } from "@/lib/auth";
import { POST as changePasswordPost } from "@/app/api/auth/change-password/route";
import bcrypt from "bcryptjs";

// Mock firestore auth
vi.mock("@/lib/firestore/auth", () => ({
  getUserByAdmissionNumber: vi.fn(),
  getUserById: vi.fn(),
  verifyPassword: vi.fn(),
  hashPassword: vi.fn().mockResolvedValue("new-hash-123"),
  setNewPassword: vi.fn().mockResolvedValue(undefined),
}));

// Mock rate limit
vi.mock("@/lib/security/rate-limit", () => ({
  isRateLimited: vi.fn().mockResolvedValue({ locked: false, retryAfterSeconds: 0 }),
  recordRateLimitFailure: vi.fn().mockResolvedValue(undefined),
  resetRateLimit: vi.fn().mockResolvedValue(undefined),
}));

// Mock next-auth getServerSession for route guard
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/firestore/activity-logs", () => ({
  createActivityLog: vi.fn().mockResolvedValue(undefined),
}));

import {
  getUserByAdmissionNumber,
  getUserById,
  verifyPassword,
  setNewPassword,
} from "@/lib/firestore/auth";
import {
  isRateLimited,
  recordRateLimitFailure,
  resetRateLimit,
} from "@/lib/security/rate-limit";
import { getServerSession } from "next-auth";

describe("Login Hardening & Session Freshness (P-09)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const credentialsProvider = authOptions.providers.find(
    (p: any) => p.id === "credentials" || p.name === "Credentials"
  ) as any;
  const authorize = credentialsProvider?.options?.authorize;

  describe("Credentials Provider authorize()", () => {
    it("returns null on missing credentials", async () => {
      const res = await authorize({ admissionNumber: "", password: "" }, {} as any);
      expect(res).toBeNull();
    });

    it("performs dummy hash compare and records failure when user does not exist", async () => {
      vi.mocked(getUserByAdmissionNumber).mockResolvedValueOnce(null);
      vi.mocked(verifyPassword).mockResolvedValueOnce(false);

      const res = await authorize(
        { admissionNumber: "ADM999", password: "Password123!" },
        { headers: { "x-forwarded-for": "192.168.1.100" } } as any
      );

      expect(res).toBeNull();
      // Dummy compare called to equalize timing
      expect(verifyPassword).toHaveBeenCalledWith("Password123!", expect.stringMatching(/^\$2a\$/));
      expect(recordRateLimitFailure).toHaveBeenCalledWith("login:user:ADM999", 5, 900);
      expect(recordRateLimitFailure).toHaveBeenCalledWith("login:ip:192.168.1.100", 5, 900);
    });

    it("performs dummy hash compare and records failure when account is DISABLED", async () => {
      vi.mocked(getUserByAdmissionNumber).mockResolvedValueOnce({
        docId: "user-disabled",
        admissionNumber: "ADM002",
        name: "Disabled User",
        passwordHash: "$2a$12$realhash",
        status: "DISABLED",
      } as any);

      const res = await authorize(
        { admissionNumber: "ADM002", password: "Password123!" },
        { headers: { "x-real-ip": "10.0.0.1" } } as any
      );

      expect(res).toBeNull();
      expect(verifyPassword).toHaveBeenCalled();
      expect(recordRateLimitFailure).toHaveBeenCalledWith("login:user:ADM002", 5, 900);
    });

    it("throws locked out error when rate limit threshold is exceeded", async () => {
      vi.mocked(isRateLimited).mockResolvedValueOnce({ locked: true, retryAfterSeconds: 600 });

      await expect(
        authorize(
          { admissionNumber: "ADM001", password: "Password123!" },
          { headers: { "x-real-ip": "10.0.0.1" } } as any
        )
      ).rejects.toThrow(/Too many failed login attempts/);
    });

    it("successfully authenticates, resets rate limits, and returns user", async () => {
      vi.mocked(getUserByAdmissionNumber).mockResolvedValueOnce({
        docId: "student-1",
        name: "Alice",
        admissionNumber: "ADM001",
        department: "CSE",
        semester: 6,
        role: "STUDENT",
        status: "ACTIVE",
        firstLogin: false,
        passwordHash: "$2a$12$validhash",
      } as any);

      vi.mocked(verifyPassword).mockResolvedValueOnce(true);

      const user = await authorize(
        { admissionNumber: "ADM001", password: "CorrectPassword10!" },
        { headers: { "x-real-ip": "10.0.0.1" } } as any
      );

      expect(user).not.toBeNull();
      expect(user.id).toBe("student-1");
      expect(user.role).toBe("STUDENT");
      expect(resetRateLimit).toHaveBeenCalledWith("login:user:ADM001");
      expect(resetRateLimit).toHaveBeenCalledWith("login:ip:10.0.0.1");
    });
  });

  describe("JWT Callback & Session Freshness", () => {
    const jwtCallback = authOptions.callbacks?.jwt as any;

    it("populates token on initial sign in", async () => {
      const user = {
        id: "student-1",
        name: "Alice",
        admissionNumber: "ADM001",
        department: "CSE",
        semester: 6,
        role: "STUDENT",
        firstLogin: true,
      };

      const token = await jwtCallback({ token: {}, user });
      expect(token.id).toBe("student-1");
      expect(token.role).toBe("STUDENT");
      expect(token.firstLogin).toBe(true);
      expect(token.lastChecked).toBeDefined();
    });

    it("invalidates token when user is marked DISABLED in Firestore", async () => {
      const existingToken = {
        id: "user-1",
        role: "STUDENT",
        lastChecked: Date.now() - 70_000, // expired cache (>60s)
      };

      vi.mocked(getUserById).mockResolvedValueOnce({
        id: "user-1",
        status: "DISABLED",
      } as any);

      const refreshed = await jwtCallback({ token: existingToken });
      expect(refreshed.id).toBeUndefined();
    });

    it("invalidates token when password was changed after token issuance", async () => {
      const existingToken = {
        id: "user-1",
        role: "STUDENT",
        iat: 1700000000,
        lastChecked: Date.now() - 70_000,
      };

      vi.mocked(getUserById).mockResolvedValueOnce({
        id: "user-1",
        status: "ACTIVE",
        passwordChangedAt: { seconds: 1700001000 }, // changed 1000s AFTER token
      } as any);

      const refreshed = await jwtCallback({ token: existingToken });
      expect(refreshed.id).toBeUndefined();
    });

    it("refreshes role or location changes when user is updated", async () => {
      const existingToken = {
        id: "admin-1",
        role: "ADMIN",
        locationId: "loc-old",
        lastChecked: Date.now() - 70_000,
      };

      vi.mocked(getUserById).mockResolvedValueOnce({
        id: "admin-1",
        status: "ACTIVE",
        role: "SUPER_ADMIN",
        locationId: null,
        firstLogin: false,
      } as any);

      const refreshed = await jwtCallback({ token: existingToken });
      expect(refreshed.role).toBe("SUPER_ADMIN");
      expect(refreshed.locationId).toBeNull();
    });
  });

  describe("Redirect Callback", () => {
    const redirectCallback = authOptions.callbacks?.redirect as any;

    it("allows relative paths", async () => {
      const res = await redirectCallback({ url: "/student/queue", baseUrl: "http://localhost:3000" });
      expect(res).toBe("http://localhost:3000/student/queue");
    });

    it("allows same-origin URLs", async () => {
      const res = await redirectCallback({ url: "http://localhost:3000/admin", baseUrl: "http://localhost:3000" });
      expect(res).toBe("http://localhost:3000/admin");
    });

    it("rejects open redirects to external domains", async () => {
      const res = await redirectCallback({ url: "https://evil.com/login", baseUrl: "http://localhost:3000" });
      expect(res).toBe("http://localhost:3000");
    });
  });

  describe("POST /api/auth/change-password", () => {
    it("rejects password shorter than 10 characters with 400", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "user-1", role: "STUDENT" },
      } as any);

      const req = new Request("http://localhost/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ newPassword: "short" }),
      });

      const res = await changePasswordPost(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/at least 10 characters/);
    });

    it("rejects password equal to admission number with 400", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "user-1", role: "STUDENT" },
      } as any);

      vi.mocked(getUserById).mockResolvedValueOnce({
        id: "user-1",
        admissionNumber: "ADM12345678",
        firstLogin: true,
      } as any);

      const req = new Request("http://localhost/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ newPassword: "ADM12345678" }),
      });

      const res = await changePasswordPost(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/cannot be equal to your admission number/);
    });

    it("requires and verifies current password when firstLogin is false", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "user-1", role: "STUDENT" },
      } as any);

      vi.mocked(getUserById).mockResolvedValueOnce({
        id: "user-1",
        admissionNumber: "ADM001",
        firstLogin: false,
        passwordHash: "$2a$12$existinghash",
      } as any);

      vi.mocked(verifyPassword).mockResolvedValueOnce(false);

      const req = new Request("http://localhost/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword: "WrongCurrentPassword!", newPassword: "ValidNewPassword123!" }),
      });

      const res = await changePasswordPost(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/Current password is incorrect/);
    });

    it("successfully changes password during first-login without current password", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "user-1", role: "STUDENT" },
      } as any);

      vi.mocked(getUserById).mockResolvedValueOnce({
        id: "user-1",
        admissionNumber: "ADM001",
        firstLogin: true,
      } as any);

      const req = new Request("http://localhost/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ newPassword: "BrandNewSecurePassword123!" }),
      });

      const res = await changePasswordPost(req);
      expect(res.status).toBe(200);
      expect(setNewPassword).toHaveBeenCalledWith("user-1", "BrandNewSecurePassword123!");
    });
  });
});
