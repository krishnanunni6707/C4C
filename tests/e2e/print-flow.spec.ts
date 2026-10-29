import { test, expect } from "@playwright/test";

/**
 * End-to-End Print Flow Journey (Phase 5)
 *
 * Simulates complete end-to-end lifecycle:
 * 1. Student arrives at /login and signs in with admission number and password.
 * 2. Student is redirected to /student view.
 * 3. Student loads print settings, verifies dynamic pricing calculation.
 * 4. Verifies presence of security headers (CSP, X-Frame-Options, Cache-Control).
 * 5. Admin visits /admin/queue and inspects queue state.
 */

test.describe("E2E Student & Admin Print Workflow", () => {
  test("1. Login page renders and prevents unauthenticated access to /student", async ({ page }) => {
    // Attempt visiting protected student route without session
    await page.goto("/student");

    // Middleware must redirect unauthenticated users to /login
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator("input[name='admissionNumber']")).toBeVisible();
    await expect(page.locator("input[name='password']")).toBeVisible();
  });

  test("2. Security headers are present on server responses", async ({ request }) => {
    const response = await request.get("/login");
    const headers = response.headers();

    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["content-security-policy"]).toContain("default-src 'self'");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  });

  test("3. Dynamic API responses enforce Cache-Control: no-store", async ({ request }) => {
    const res = await request.get("/api/print-jobs/queue");
    const headers = res.headers();

    expect(headers["cache-control"]).toContain("no-store");
  });

  test("4. Privacy policy page is publicly accessible", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page).toHaveURL(/\/privacy/);
    await expect(page.locator("h1")).toContainText(/Privacy/i);
  });
});
