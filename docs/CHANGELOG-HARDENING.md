# Hardening Changelog

All significant changes made during the hardening and production-readiness process are recorded here, newest first.

---

## [Phase 1 — Money]

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
