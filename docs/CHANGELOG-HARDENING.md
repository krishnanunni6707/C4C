# Hardening Changelog

All significant changes made during the hardening and production-readiness process are recorded here, newest first.

---

## [Phase 2 — Privacy and data exposure]

### P-04 — Private, signed file storage and retention cleanup
- Uploaded files to Cloudinary with `type: "authenticated"` so they are completely inaccessible via unauthenticated public URLs.
- Stopped returning raw delivery URLs to the client browser in `/api/upload`; store only `publicId`.
- Hardened admin file route `GET /api/admin/jobs/[id]/file` to generate short-lived signed delivery URLs (≤5 min) server-side and stream bytes back.
- Implemented strict SSRF protections in `GET /api/admin/jobs/[id]/file`: validates URL protocol (`https:`), hostname strictly matches `res.cloudinary.com`, and path prefix matches the environment cloud name.
- Returned PDF files as binary streams with `Content-Type` and `Content-Disposition`, setting `Cache-Control: no-store, no-cache, must-revalidate` (no base64 JSON).
- Updated admin queue UI to consume binary streams and convert to local printer payloads in memory.
- Added asset deletion on terminal states (`COLLECTED` and `CANCELLED`), recording `fileDeletedAt` on the print job document.
- Created `app/api/cron/cleanup/route.ts` protected by `CRON_SECRET` with timing-safe comparison (`crypto.timingSafeEqual`) to purge assets for jobs older than configurable retention period (default 7 days) and unconsumed uploads older than 24 hours.
- Documented manual operational steps in `docs/OWNER_ACTIONS.md` for migrating existing public Cloudinary assets, purging old assets, and configuring the cron schedule.
- Added unit tests in `tests/unit/storage.test.ts` for signed URL generation, SSRF validation, 410 Gone on deleted files, binary streaming, and cron authorization.

---

## [Phase 1 — Money]

### P-03 — Real page counting and upload validation
- Replaced unreliable client-side `estimatePages` with strict server-side page counting using `pdf-lib`.
- Validated magic bytes against file extensions (PDF `%PDF-`, PNG, JPEG) to reject renamed executables (e.g. `.exe` disguised as `.pdf`) and corrupted headers.
- Handled corrupt and password-protected/encrypted PDFs with explicit rejection (400) and user-friendly error messages.
- Rejected Office documents (`.docx`, `.doc`, `.pptx`) with clear guidance to export/save as PDF before uploading, updating UI accordingly.
- Enforced max file size limits (15 MB default, configurable via settings) and max page count limits (200 pages default).
- Streamed uploads to Cloudinary via `upload_stream` buffer streaming to avoid large base64 data URI overhead.
- Stored upload records in `uploads/{id}` with owner ID, Cloudinary public ID, exact page count, file size, mime type, and consumed flag.
- Sanitized filenames against path traversal characters (`..`, `/`, `\`) and restricted public IDs.
- Redacted PII from server logs (no file URLs or user IDs printed in console).
- Added comprehensive unit tests in `tests/unit/upload.test.ts` covering page counts, encrypted PDFs, corrupted headers, fake extensions, oversize files, and images.

### P-02 — Remove fake payments from production
- Removed simulated payment fallback in `components/student/RazorpayPaymentModal.tsx` when Razorpay key or SDK is missing.
- Restricted simulation controls exclusively to non-production environments with `PAYMENT_TEST_MODE=1`; in production, simulation UI and endpoints are permanently blocked.
- Added explicit checkout script loading with load-failure error handling and retry mechanism.
- Replaced hard-coded `student@campus.edu` prefill with authenticated session user information.
- Updated `DesktopStudentView.tsx` and `MobileStudentView.tsx` to use the unified server pricing and payment initialization flow.
- Added component tests in `tests/unit/payment-modal.test.tsx` verifying that no simulation paths or buttons are rendered in production.

### P-01 — Server-side pricing and payment binding
- Created `lib/pricing.ts` computing print costs strictly in integer paise with validation against zero, negative, fractional, and out-of-bound inputs.
- Created `POST /api/print-jobs/draft` to validate file uploads, ensure active locations, compute pricing on the server, create Razorpay orders, and persist `pendingOrders/{orderId}`.
- Hardened `POST /api/payment/razorpay/verify`: HMAC signature verification, verification of captured payment state via Razorpay API (`GET /v1/payments/{id}`), order amount check, student ownership check, and atomic Firestore transaction for job creation.
- Made payment fulfillment strictly idempotent: duplicate requests with the same payment ID or order ID safely return the existing job.
- Added `POST /api/payment/razorpay/webhook`: verifies raw body signature against `RAZORPAY_WEBHOOK_SECRET` with timing-safe comparison; processes `payment.captured` and `order.paid`.
- Added `GET /api/admin/reconciliation`: SUPER_ADMIN-only reconciliation endpoint detecting unfulfilled captured payments and unconfirmed jobs.
- Disabled client job creation via `POST /api/print-jobs/create`: direct calls are rejected with 400.
- Unit and emulator test suites added in `tests/unit/pricing.test.ts`, `tests/unit/payment.test.ts`, and `tests/emu/payment-flow.test.ts`.

---

## [Phase 0 — Preparation]

### 0.1 — Baseline, branches, tags, backup
- Branch `hardening/phase0-0.1-baseline` created in both `C4C` and `QDocClient`.
- Tag `pre-hardening` to be pushed by OWNER after key rotation (see `docs/DECISIONS.md` entry 0001).
- `docs/BASELINE.md` created with build/lint/type-check results.
- `docs/CHANGELOG-HARDENING.md` (this file) and `docs/DECISIONS.md` created.
- `docs/IMPLEMENTATION_PLAN.md` moved from repo root (`implimentationplan.md`).
