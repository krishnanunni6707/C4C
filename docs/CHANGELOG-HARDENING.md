# Hardening Changelog

All significant changes made during the hardening and production-readiness process are recorded here, newest first.

## [Phase 4 — Print daemon and infrastructure]

### P-15 — Cleanups, hook extraction, NextAuth typing, and admin pagination
- Completely eliminated `any` casts in `lib/auth.ts`:
  - Extended `JWT` interface in `types/next-auth.d.ts` with optional lifecycle fields (`iat`, `exp`, `jti`, etc.).
  - Strictly typed authorization request headers (`Record<string, string | string[] | undefined>`).
  - Implemented typed session invalidation in `jwt` callback returning `{ ...token, id: undefined, exp: 0 }` and typed `session` callback returning expired `DefaultSession`.
- Extracted shared student wizard hooks to deduplicate hundreds of lines across desktop and mobile views:
  - `lib/hooks/usePrintSettings.ts`: manages settings, staging, file transitions, and draft persistence integration.
  - `lib/hooks/usePricing.ts`: fetches server settings, derives duplex sheet counts, price per sheet, and computes dynamic job costs.
  - `lib/hooks/usePayment.ts`: encapsulates client-side PDF baking (`pdf-lib`), downloading, upload streaming, draft creation, and Razorpay verification.
  - Refactored `components/student/DesktopStudentView.tsx` and `components/student/MobileStudentView.tsx` to consume shared hooks with zero change to visual appearance or user workflow.
- Implemented cursor-based pagination across admin list endpoints:
  - `GET /api/admin/students`: supports `limit` (default 50, max 100) and `startAfter` cursor; restricts print job stats calculation to paged students to avoid unbounded whole-collection scans; returns `{ users, hasMore, lastDocId }`.
  - `GET /api/admin/queue`: supports `limit` (default 50, max 100), `status`, and `startAfter` cursor; returns `{ jobs, hasMore, lastDocId }`.
  - Added composite index (`role`, `name`) for `users` collection in `firestore.indexes.json`.
- Enforced `Cache-Control: no-store, no-cache, must-revalidate` across all dynamic API endpoints in `next.config.mjs`, `middleware.ts`, and `lib/api/guards.ts`.
- Added unit tests in `tests/unit/cleanups-quality.test.ts` (8 tests) verifying typed session expiration, hook calculations, admin pagination parameters, and security headers.

### P-14 — Security headers, environment validation, and error sanitization
- Implemented comprehensive HTTP security headers in `next.config.mjs`:
  - `Content-Security-Policy`: strict directives allowing own origin, Razorpay (`checkout.razorpay.com`, `api.razorpay.com`), Cloudinary (`res.cloudinary.com`), and local loopback WebSockets (`ws://127.0.0.1:*`); `'unsafe-eval'` is disabled in production builds.
  - `X-Frame-Options: DENY` (disallows clickjacking/iframe embedding).
  - `X-Content-Type-Options: nosniff` (blocks MIME-type sniffing).
  - `Referrer-Policy: strict-origin-when-cross-origin`.
  - `Permissions-Policy: camera=(), microphone=(), geolocation=(), browsing-topics=()`.
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` (HSTS).
- Removed misleading `experimental.serverActions.bodySizeLimit` from `next.config.mjs`.
- Created centralized environment validation module `lib/env.ts`:
  - Strict Zod schema validating all required variables (`NEXTAUTH_*`, `FIREBASE_ADMIN_*`, `CLOUDINARY_*`, `RAZORPAY_*`) at startup with fail-fast behavior.
  - Formats error logs to list missing variable names without ever printing secrets or credentials.
  - Integrated into `lib/firebase/admin.ts`, `lib/storage/cloudinary.ts`, and core services.
- Created safe error response and monitoring utility `lib/errors.ts`:
  - Sanitized all API error responses (`/api/upload`, `/api/payment/razorpay/verify`, `/api/payment/razorpay/webhook`, `/api/print-jobs/draft`, `/api/admin/reconciliation`) to return generic messages paired with unique request IDs (`req_<ts>_<random>`), eliminating internal stack trace and `details: error.message` leakage.
  - Added Sentry-compatible error reporting behind `SENTRY_DSN` with deep PII redaction via `lib/logger.ts`.
- Git History Secret Scan & Remediation:
  - Scanned commit history and identified exposed Firebase Admin private key in historical commits (`e72765c` and `a458dc5`).
  - Documented complete key rotation and `git-filter-repo` history purging procedure in Section 6 of `docs/OWNER_ACTIONS.md` (refraining from autonomous history rewriting per safety policy).
- Dependency and Repo Cleanups:
  - Upgraded Next.js and `eslint-config-next` to `14.2.35`.
  - Added `"audit": "npm audit --omit=dev --audit-level=high"` script to `package.json`.
  - Deleted duplicate `implimentationplan.md` in repository root and deleted stray test artifact `EXP 13 OUTPUT.pdf`.
  - Updated outdated security claims in `PROJECT_DOCUMENTATION.md`.
- Added unit tests in `tests/unit/security-headers.test.ts` (7 tests).

### P-13 — Secure WebSocket print daemon and client hardening
- Hardened WebSocket configuration in `lib/printerConfig.ts`:
  - Enforced strictly local loopback connection (`ws://127.0.0.1:8765`), rejecting remote or external URLs.
  - Configured exponential backoff with jitter and capped retries (1s initial delay, 1.5x multiplier, 30s max delay, capped at 10 attempts).
  - Defined payload limits (32 MiB max payload, 99 copies cap, 60s spooler response timeout).
- Upgraded `lib/hooks/usePrinter.ts` to protocol v2:
  - Implemented authentication handshake: sends `{ action: "auth", token: ... }` on connection; verifies station token before enabling print controls; rejects unauthenticated actions.
  - Implemented request correlation: correlates `print_file` dispatches with daemon replies (`accepted`, `completed`, `failed`) via unique message IDs with 60-second timeouts.
  - Implemented secure memory cleanup: dereferences base64 file payloads immediately after socket dispatch.
  - Handled browser tab visibility: pauses auto-reconnection while tab is hidden and resumes immediately when re-focused.
- Hardened print execution lifecycle and failure recovery:
  - In `app/admin/queue/page.tsx`, printing only confirms to `READY` (`POST /api/admin/jobs/[id]/ready`) upon physical spooler success confirmation.
  - On spooler or connection failure, calls `POST /api/admin/jobs/[id]/fail` with error note, recovering job from `PRINTING` back to `WAITING` with error status displayed in the queue and an actionable Retry button.
  - Added `failJob` method in `lib/services/print-service.ts` with transactional status updates and audit logging.
- Created hardened reference Python print daemon in `scripts/daemon/qdoc_daemon.py`:
  - Strict `127.0.0.1` binding, Origin header validation against allowed origins, mandatory auth token handshake, PDF magic bytes validation (`%PDF-`), copies bounds (1-99), and secure temporary spool file cleanup.
- Added comprehensive unit test suite in `tests/unit/printer-daemon.test.ts` (12 tests) and updated `tests/unit/job-state-machine.test.ts` and `components/ui/PrinterPanel.tsx`.

## [Phase 3 — Authentication and access control]

### P-12 — Transactional token counter, SJF starvation guard, and composite indexes
- Replaced race-prone read-last-job token generator with atomic transactional counter `counters/printJobs`:
  - Increments sequentially (`RP1001`, `RP1002`, ...) using Firestore transactions with `{ merge: true }`.
  - Moved token allocation strictly inside the payment fulfillment transaction (`fulfillPendingOrder`), guaranteeing zero burned tokens on idempotent retries and preventing duplicate tokens under concurrent load.
- Replaced whole-collection document reads in `getNextQueuePosition` with efficient Firestore aggregation count queries (`.count().get()`).
- Added SJF starvation guard in `lib/firestore/sjf-queue.ts`:
  - Jobs waiting longer than `starvationThresholdMinutes` (default 15 minutes) are elevated to high-priority tier and served in strict FIFO order (oldest first).
  - Remaining jobs are ordered by windowed shortest-job-first (`totalPages * copies`) with creation-time tie breaking.
  - Aligned student queue endpoint (`/api/print-jobs/queue`) with admin queue so queue positions and ordering are consistent across all views.
- Added composite Firestore indexes to `firestore.indexes.json` covering all application multi-field queries across `printJobs`, `users`, `notifications`, and `uploads`.
- Added unit tests in `tests/unit/token-queue.test.ts` (8 tests).

### P-11 — Transactional job state machine and refund tracking
- Implemented strict state machine transitions in `lib/services/print-service.ts`:
  - Allowed transitions: `WAITING → PRINTING → READY → COLLECTED` and `WAITING|PRINTING → CANCELLED`.
  - Terminal states `COLLECTED` and `CANCELLED` cannot transition to any other status.
  - Starting a print job strictly requires `paymentStatus === "PAID"`.
  - All state transitions executed inside Firestore transactions (`runTransaction`), preventing race conditions.
  - Illegal transitions reject immediately with HTTP 409 Conflict (`JobStateTransitionError`).
- Added automatic refund tracking: cancelling a PAID job atomically marks `refundStatus: "REQUIRED"`, logs the cancellation reason, and informs the student in notification text. Documented manual Razorpay dashboard refund steps in `docs/OWNER_ACTIONS.md`.
- Restricted manual payment override (`POST /api/admin/jobs/[id]/payment`) and payment reversal (`POST /api/admin/jobs/[id]/unpay`) strictly to `SUPER_ADMIN`, enforcing a mandatory reason (≥5 characters) and audit logging in `activityLogs`.
- Made notifications atomic: student notifications (`PRINTING_STARTED`, `PRINT_READY`, `PRINT_CANCELLED`, `PAYMENT_CONFIRMED`) are written within the same Firestore transaction as the status update.
- Updated `JobDetailActions.tsx` to remove unauthorized payment buttons from location admins and support reasons for cancellation, overrides, and reversals.
- Added unit tests in `tests/unit/job-state-machine.test.ts` (19 tests).

### P-10 — Secure password generation and admin user management
- Replaced insecure `Math.random()` password generator with cryptographically secure generator `generateTempPassword` using `crypto.randomInt` and unambiguous character alphabet (`SAFE_ALPHABET` avoiding `0, O, o, 1, l, I`) with a minimum length of 12 characters.
- Implemented single-write user creation in `lib/firestore/users.ts` (`createUser`): eliminated the double-write vulnerability by pre-generating/hashing passwords once and saving in a single `docRef.set()` call.
- Validated custom passwords across endpoints: minimum 10 characters, cannot equal admission number.
- Enforced role boundaries across all admin user management endpoints:
  - `ADMIN` role is restricted to creating and managing `STUDENT` accounts only. Attempts to modify or reset passwords of `ADMIN` or `SUPER_ADMIN` accounts return 403 Forbidden.
  - `SUPER_ADMIN` accounts cannot disable or demote their own account.
  - Enforced system continuity by prohibiting the disabling of the last active `SUPER_ADMIN` account.
- Hardened `POST /api/admin/students/bulk`:
  - Enforced 1,000-item batch cap per request.
  - Validated each row using a strict Zod schema (`admissionNumber`, `name`, `department`, `semester`, optional `email`, optional `phone`).
  - Implemented parallel password hashing and batched Firestore writes (in chunks of ≤450 operations per batch).
  - Generates and returns a downloadable credentials CSV once in the response; never logs plain-text passwords or credentials to server logs.
- Applied Zod validation across all user management routes (`/api/admin/students`, `/api/admin/admins`, status, reset-password).
- Added comprehensive unit test suite in `tests/unit/admin-user-mgmt.test.ts` (16 tests).

### P-09 — Login hardening, session freshness, and middleware enforcement
- Implemented dual-layer login rate limiting (per admission number AND per IP) enforcing 5 failed attempts per 15-minute window, with 15-minute account/IP lockout.
- Standardized authentication errors: equal timing via dummy bcrypt compare on non-existent or disabled users, preventing account enumeration.
- Enforced session freshness: re-evaluates active user record from Firestore every 60 seconds in the JWT callback; instantly invalidates sessions for disabled users or tokens issued prior to `passwordChangedAt`.
- Enforced session lifetime: reduced maxAge to 8 hours; configured strict cookie policies (`secure`, `httpOnly`, `sameSite=lax` in production). Added startup validation for `NEXTAUTH_URL` and `NEXTAUTH_SECRET`.
- Restricted `redirect` callback strictly to relative same-origin paths, blocking open redirects.
- Created `middleware.ts` (NextAuth `withAuth`): protects `/student/**`, `/admin/**`, `/dashboard/**`, and `/api/**` (excluding public allowlist). Returns JSON 401 for unauthenticated API requests. Enforces `firstLogin` lockdown (users must complete password change before accessing app resources) and role-based prefixes (`/admin` restricted to ADMIN and SUPER_ADMIN).
- Hardened `POST /api/auth/change-password`: requires current password for active users, enforces minimum 10-character policy, prohibits password matching admission number, and records `passwordChangedAt` timestamp to invalidate previous sessions across devices.
- Added comprehensive unit tests in `tests/unit/login-hardening.test.ts`.

### P-08 — Delete dangerous and debug routes
- Permanently deleted unauthenticated debug, test, and seed routes: `app/api/firebase-init`, `app/api/firebase-test`, `app/api/cloudinary-test`, `app/api/seed-users`, `app/api/admin/bootstrap-super-admin`, `app/test-session`, and `app/api/admin/migrate-locations`.
- Removed `BOOTSTRAP_SECRET` from `README.md` and project documentation; super admin creation is handled exclusively via offline script `scripts/create-super-admin.mjs`.
- Hardened `app/api/admin/db/clear`: permanently blocked in production (`process.env.NODE_ENV === "production"` returns 404), requires explicit environment authorization (`ALLOW_DB_CLEAR=1`), requires `SUPER_ADMIN` role, requires verification of the administrator's password via bcrypt, requires a typed confirmation phrase (`DELETE <target>`), and audit-logs the operation in `activityLogs`.
- Added unit tests in `tests/unit/dangerous-routes.test.ts` verifying that deleted paths are not present and that all `db/clear` security controls function properly.

## [Phase 2 — Privacy and data exposure]

### P-07 — Data minimisation, retention schedules, and privacy notice
- Created data minimisation mappers `toPublicUser` and `toPublicJob` in `lib/mappers.ts` ensuring `passwordHash`, internal salts, storage URLs, and private IDs are never leaked in API responses.
- Applied `toPublicUser` across student and admin management endpoints (`/api/admin/students`, `/api/admin/admins`, `/api/admin/students/[id]`, `/api/admin/admins/[id]`).
- Applied `toPublicJob` across user and queue endpoints (`/api/print-jobs/user`, `/api/admin/queue`, `/api/admin/jobs/[id]`).
- Built `lib/logger.ts` structured logger with deep recursive PII redaction (names, admission numbers, emails, passwords, file URLs, payment IDs, secrets) and replaced raw `console` calls in critical endpoints.
- Restricted `/api/auth/verify-session` to non-production environments (returns 404 in production).
- Extended retention cleanup in `app/api/cron/cleanup/route.ts` to automatically purge notifications older than 30 days and permanently anonymize print jobs older than 1 year (scrubbing student name, admission number, and file metadata).
- Added `DELETE /api/admin/students/[id]` endpoint (restricted to `SUPER_ADMIN`) enabling full student data erasure on request ("Right to be Forgotten"), destroying associated Cloudinary assets, print jobs, notifications, uploads, and creating an audited record in `activityLogs`.
- Published comprehensive privacy documentation in `docs/PRIVACY.md` and student-facing privacy notice UI at `/privacy` (`app/privacy/page.tsx`).
- Added unit tests in `tests/unit/privacy.test.ts` covering data mappers, PII redaction, right to erasure authorization, and route restrictions.

### P-06 — Private server-backed notifications and Firestore rules lockdown
- Updated `firestore.rules` to lock down all client access (`allow read, write: if false;` on `notifications`, `users`, `printJobs`, and wildcard documents).
- Completely removed client Firebase SDK usage from the browser; replaced Firestore `onSnapshot` listeners in `contexts/NotificationContext.tsx` with authenticated 15-second polling (`GET /api/notifications`).
- Added window focus / tab visibility refresh listeners to re-sync notifications when switching back to the app.
- Hardened notification endpoints: `GET /api/notifications` returns only the authenticated session user's notifications and global broadcasts with `Cache-Control: no-store`; `POST /api/notifications/mark-read` enforces notification ownership (rejects attempts to mark other users' private notifications with 403 Forbidden).
- Hardened `POST /api/admin/notifications/broadcast` with role enforcement (ADMIN / SUPER_ADMIN only), input validation and length limits (title ≤ 80 chars, message ≤ 500 chars), and transactional rate limiting (maximum 5 broadcasts per minute).
- Created `lib/security/rate-limit.ts` using Firestore transaction counters with fallback.
- Added comprehensive unit tests in `tests/unit/notifications.test.ts` and Firestore security rules emulator tests in `tests/emu/firestore-rules.test.ts`.

### P-05 — Lock down job and queue APIs with route guards
- Created centralized authorization guards in `lib/api/guards.ts`: `requireRole(...)`, `requireAdmin(locationScoped)`, and `requireJobAccess(...)`.
- Migrated all API routes to use centralized guards, eliminating hand-rolled and inconsistent session checks.
- Hardened `GET /api/print-jobs/queue`: students receive strictly anonymized queue data (token number, status, position, locationId) with no student names, admission numbers, file names, or storage URLs; admins are strictly scoped to their assigned location; super admins have global access.
- Hardened `GET /api/print-jobs/user`: returns only the authenticated student's jobs, stripping `fileUrl`, `cloudinaryPublicId`, and internal secrets from payloads.
- Added comprehensive route authorization audit test `tests/unit/route-guards.test.ts` that walks every route file under `app/api/**/route.ts` and asserts that every non-allowlisted route calls a guard, alongside granular test suites for role boundaries, admin location scoping, and job access ownership.

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
