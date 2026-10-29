/**
 * tests/unit/security-headers.test.ts
 *
 * Unit tests for P-14: Security headers, CSP policy,
 * environment schema validation, and safe error sanitization.
 */

import { describe, it, expect } from "vitest";
import nextConfig from "@/next.config.mjs";
import { validateEnv, env } from "@/lib/env";
import { safeErrorResponse, generateRequestId } from "@/lib/errors";

describe("P-14: Security Headers in next.config.mjs", () => {
  it("removes the misleading experimental.serverActions.bodySizeLimit", () => {
    const experimental = (nextConfig as any).experimental;
    expect(experimental?.serverActions?.bodySizeLimit).toBeUndefined();
  });

  it("exports security headers covering all routes", async () => {
    expect(typeof nextConfig.headers).toBe("function");
    const headerConfigs = await nextConfig.headers!();
    expect(headerConfigs.length).toBeGreaterThan(0);

    const rootHeaders = headerConfigs.find((h) => h.source === "/:path*");
    expect(rootHeaders).toBeDefined();

    const headersMap = new Map(
      rootHeaders!.headers.map((h) => [h.key, h.value])
    );

    // 1. X-Frame-Options: DENY
    expect(headersMap.get("X-Frame-Options")).toBe("DENY");

    // 2. X-Content-Type-Options: nosniff
    expect(headersMap.get("X-Content-Type-Options")).toBe("nosniff");

    // 3. Referrer-Policy: strict-origin-when-cross-origin
    expect(headersMap.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");

    // 4. Permissions-Policy
    const permissions = headersMap.get("Permissions-Policy");
    expect(permissions).toBeDefined();
    expect(permissions).toContain("camera=()");
    expect(permissions).toContain("microphone=()");
    expect(permissions).toContain("geolocation=()");

    // 5. Strict-Transport-Security (HSTS)
    const hsts = headersMap.get("Strict-Transport-Security");
    expect(hsts).toBeDefined();
    expect(hsts).toContain("max-age=63072000");
    expect(hsts).toContain("includeSubDomains");

    // 6. Content-Security-Policy
    const csp = headersMap.get("Content-Security-Policy");
    expect(csp).toBeDefined();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("https://checkout.razorpay.com");
    expect(csp).toContain("https://res.cloudinary.com");
    expect(csp).toContain("ws://127.0.0.1:*");
    expect(csp).toContain("frame-ancestors 'none'");
  });
});

describe("P-14: Environment Schema Validation (lib/env.ts)", () => {
  it("exports validated env object with expected keys", () => {
    expect(env).toBeDefined();
    expect(env.FIREBASE_ADMIN_PROJECT_ID).toBeDefined();
    expect(env.CLOUDINARY_API_KEY).toBeDefined();
    expect(env.RAZORPAY_KEY_ID).toBeDefined();
  });

  it("validateEnv returns a valid configuration without throwing in test environment", () => {
    const validated = validateEnv();
    expect(validated.NODE_ENV).toBe("test");
    expect(validated.NEXTAUTH_URL).toBe("http://localhost:3000");
  });
});

describe("P-14: Safe Error Responses & Sanitation (lib/errors.ts)", () => {
  it("generates random request IDs with prefix req_", () => {
    const id1 = generateRequestId();
    const id2 = generateRequestId();
    expect(id1).toMatch(/^req_[a-z0-9]+_[a-z0-9]+$/);
    expect(id2).toMatch(/^req_[a-z0-9]+_[a-z0-9]+$/);
    expect(id1).not.toBe(id2);
  });

  it("sanitizes error responses and returns generic messages with requestId", async () => {
    const internalSecretError = new Error(
      "Firebase secret serviceAccountKey failed connection string: secret123!"
    );

    const response = safeErrorResponse(internalSecretError, { status: 500 });
    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.requestId).toBeDefined();
    expect(body.requestId).toMatch(/^req_/);
    expect(body.error).toBe(
      "An internal server error occurred. Please contact technical support."
    );
    // Crucial: Ensure secret and raw exception message are NEVER leaked to the client
    expect(body.details).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain("secret123!");
    expect(JSON.stringify(body)).not.toContain("serviceAccountKey");
  });

  it("allows custom public message for 4xx client errors while returning requestId", async () => {
    const validationError = new Error("Invalid password format");
    const response = safeErrorResponse(validationError, {
      status: 400,
      publicMessage: "Password must be at least 10 characters long.",
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.requestId).toBeDefined();
    expect(body.error).toBe("Password must be at least 10 characters long.");
    expect(body.details).toBeUndefined();
  });
});
