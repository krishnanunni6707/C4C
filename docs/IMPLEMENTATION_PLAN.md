# QDoc / C4C — Implementation Plan

Fixes the failures found in the code review of the **C4C** web app and the **QDocClient** Windows print client, then brings the product to a production-ready state for campus rollout.

| | |
|---|---|
| Version | 1.0 |
| Date | 21 September 2026 |
| Repos | `C4C` (Next.js 14 web app), `QDocClient` (Python Windows tray app) |
| Companion | `IMPLEMENTATION_PROMPT.md` (prompt for the coding agent) |
| Input documents | `QDoc-System-Documentation` (system as built, section 17 lists the issues) |

---

## 0. How to use this plan

1. Work **phase by phase**. Each phase ends at a **gate** where a human reviews and approves before the next phase starts.
2. Inside a phase, work **task by task** in the order given. Every task has files, steps, acceptance criteria and tests. A task is done only when its acceptance criteria pass and its tests exist and pass.
3. Tick the task in the tracker (section 2) and add a line to `docs/CHANGELOG-HARDENING.md` when it is done.
4. Anything marked **OWNER** cannot be done by the agent (credentials, billing, signing certificates, force-push). The agent prepares the exact steps and stops.
5. When a task needs a decision that this plan does not settle, write it in `docs/DECISIONS.md` (context, options, choice, reason) and continue with the recommended option.

### Priority and effort labels

| Label | Meaning |
|---|---|
| P0 | Must be done before any student uses the system |
| P1 | Must be done before the pilot (printing must work reliably) |
| P2 | Must be done before campus rollout (scale, operations) |
| P3 | Experience improvements |
| S / M / L | About half a day / one to two days / three to five days for one developer |

---

## 1. Ground rules (apply to every task)

**Safety**
- Never print, log, commit or paste a secret value. Secrets live only in host environment settings and local untracked `.env.local`. When a task touches credentials, refer to variable **names** only.
- Never run a destructive operation (delete, migrate, clear) against production. Every script must support `--dry-run` (default on) and `--project <id>`; it prints what it would change before doing it.
- Work on branches named `hardening/<phase>-<task-id>-<slug>`. One pull request per task. No force-push to `main`.
- Take a Firestore export and tag the repository (`pre-hardening`) before the first migration runs.

**Quality**
- TypeScript strict. No `any` in new code except at validated boundaries. Zod schemas for every request body and for every value read from Firestore that came from a client.
- Every API route uses the shared helpers from `lib/api/` (auth, errors, validation). No route hand-rolls session checks after task S-03.
- Every new behaviour has a test. Bug fixes start with a failing test.
- Conventional Commits (`fix:`, `feat:`, `chore:`, `test:`, `docs:`). Small commits.
- User-facing strings are added through one place (`lib/i18n/messages.ts` after task U-08; until then a `lib/ui-messages.ts` constants file) so wording can change without touching logic.

**Compatibility**
- Data migrations are idempotent and reversible where possible (keep the old field for one release, remove it in a later cleanup task).
- Web app and print client are released independently. The web app must keep working with the **old** client until `D-04` is deployed to every center (the protocol handshake in `D-04` provides version negotiation).

---

## 2. Tracker

Update the **Status** column as work proceeds (`todo`, `doing`, `review`, `done`, `blocked`).

### Phase 0 — Preparation
| ID | Task | Repo | Pri | Effort | Depends | Status |
|---|---|---|---|---|---|---|
| 0.1 | Baseline, branches, tags, backup | both | P0 | S | | todo |
| 0.2 | Staging environment and emulators | C4C | P0 | M | 0.1 | todo |
| 0.3 | Tooling: tests, lint, secret scan, CI skeleton | both | P0 | M | 0.1 | todo |

### Phase 1 — Security (Gate A)
| ID | Task | Repo | Pri | Effort | Depends | Status |
|---|---|---|---|---|---|---|
| S-01 | Rotate and purge leaked secrets | C4C | P0 | S | 0.1 | todo |
| S-02 | Remove development routes, pages and seed accounts | C4C | P0 | S | 0.1 | todo |
| S-03 | Central authorization layer, applied to all routes | C4C | P0 | M | 0.3 | todo |
| S-04 | Fresh sessions, first-login enforcement, safe redirect | C4C | P0 | M | S-03 | todo |
| S-05 | Login hardening: rate limit, secure temp passwords | C4C | P0 | M | S-04 | todo |
| S-06 | Server authority for job creation | C4C | P0 | M | S-03 | todo |
| S-07 | Private files, signed access, retention | C4C | P0 | M | S-06 | todo |
| S-08 | Firestore rules and authenticated live notifications | C4C | P0 | M | S-04 | todo |
| S-09 | API hygiene: validation, error shape, headers, db/clear | C4C | P0 | M | S-03 | todo |
| S-10 | Dependency upgrade | C4C | P0 | S | 0.3 | todo |
| S-11 | Security test suite and Gate A review | C4C | P0 | M | S-01..S-10 | todo |

### Phase 2 — Print path (Gate B)
| ID | Task | Repo | Pri | Effort | Depends | Status |
|---|---|---|---|---|---|---|
| D-01 | Canonical enums and data migration | C4C | P1 | M | S-11 | todo |
| D-02 | Token counter in a transaction | C4C | P1 | S | D-01 | todo |
| D-03 | Job state machine, transactional transitions, print lock | C4C | P1 | M | D-01 | todo |
| D-04 | Print protocol v2 and daemon core changes | Client | P1 | L | 0.3 | todo |
| D-05 | Daemon robustness: paths, logging, single instance, config | Client | P1 | M | D-04 | todo |
| D-06 | Daemon printing engine (SumatraPDF) and test print | Client | P1 | M | D-04 | todo |
| D-07 | Web print flow v2: acknowledgements, retry, printer selection | C4C | P1 | L | D-03, D-04 | todo |
| D-08 | Upload pipeline: direct upload, limits, PDF and images only | C4C | P1 | L | S-07 | todo |
| D-09 | Fixed-window queue ordering and settings screen | C4C | P1 | S | D-01 | todo |
| D-10 | Installer, signing, release process | Client | P1 | M | D-05, D-06 | todo |
| D-11 | End-to-end print tests and hardware acceptance | both | P1 | M | D-07, D-08, D-10 | todo |

### Phase 3 — Reliability and operations (Gate C)
| ID | Task | Repo | Pri | Effort | Depends | Status |
|---|---|---|---|---|---|---|
| R-01 | Firestore indexes and Firebase project config | C4C | P2 | S | | todo |
| R-02 | Pagination, aggregations, no full scans | C4C | P2 | M | R-01 | todo |
| R-03 | Denormalised statistics | C4C | P2 | M | R-02 | todo |
| R-04 | Observability: errors, logs, health, alerts | C4C | P2 | M | | todo |
| R-05 | Backups and restore drill | ops | P2 | M | | todo |
| R-06 | Cleanup jobs (files, orphans) | C4C | P2 | S | S-07 | todo |
| R-07 | CI/CD, preview deploys, branch protection | both | P2 | M | 0.3 | todo |
| R-08 | Load and cost test | C4C | P2 | M | R-02 | todo |
| R-09 | Documentation refresh and runbooks | both | P2 | M | all above | todo |

### Phase 4 — Experience (Gate D)
| ID | Task | Repo | Pri | Effort | Depends | Status |
|---|---|---|---|---|---|---|
| U-01 | Queue position and estimated wait | C4C | P3 | M | D-09 | todo |
| U-02 | Student cancel and reprint | C4C | P3 | S | D-03 | todo |
| U-03 | Upload and submit UX | C4C | P3 | M | D-08 | todo |
| U-04 | Staff console: kiosk view, retry, cancel, token lookup | C4C | P3 | M | D-07 | todo |
| U-05 | Daily summary, export, audit log viewer | C4C | P3 | M | R-02 | todo |
| U-06 | UPI QR payment (manual verification) and receipts | C4C | P3 | M | D-03 | todo |
| U-07 | Notifications: email and web push (optional) | C4C | P3 | M | S-08 | todo |
| U-08 | Accessibility, i18n, installable app | C4C | P3 | L | | todo |
| U-09 | Quotas and reports | C4C | P3 | M | R-03 | todo |
| U-10 | State, empty and error screens; device QA | C4C | P3 | M | | todo |

### Phase 5 — Pull-based print agent (Gate E, optional but recommended)
| ID | Task | Repo | Pri | Effort | Depends | Status |
|---|---|---|---|---|---|---|
| A-01 | Design, data model and API contract | both | P3 | M | Gate B | todo |
| A-02 | Device enrolment and tokens | C4C | P3 | M | A-01 | todo |
| A-03 | Agent runtime: poll, lease, print, report | Client | P3 | L | A-02 | todo |
| A-04 | Web: devices, printer mapping, auto-print | C4C | P3 | M | A-02 | todo |
| A-05 | Migration, feature flag, retire browser path | both | P3 | M | A-03, A-04 | todo |
| A-06 | Soak test and rollout | both | P3 | M | A-05 | todo |

---

## 3. Phase 0 — Preparation

### 0.1 Baseline, branches, tags, backup (P0, S)

**Steps**
1. In both repos: `git status` must be clean. Tag the current commit `pre-hardening` and push the tag.
2. Create `docs/` folder items: `CHANGELOG-HARDENING.md`, `DECISIONS.md` (empty templates).
3. Run `npm ci && npm run lint && npm run build` in `C4C`; record results and warnings in `docs/BASELINE.md`. Do the same for the client (`pip install -r requirements.txt`, run the app import check).
4. **OWNER:** export Firestore (`gcloud firestore export gs://<bucket>/pre-hardening`) and confirm the export exists.

**Acceptance:** tag exists in both repos; `docs/BASELINE.md` lists the build result; export path recorded in `docs/DECISIONS.md`.

### 0.2 Staging environment and emulators (P0, M)

**Why:** every later task needs a place to test without touching production data.

**Steps**
1. **OWNER:** create a second Firebase project (`<name>-staging`), a separate Cloudinary folder or sub-account, and a Vercel preview environment with its own variables. Names of variables are in `.env.example` (create it; names only, no values).
2. Add `firebase.json` and `.firebaserc` with `emulators` for Firestore (port 8080) and the UI. Add `npm run emu` (`firebase emulators:start --only firestore`) and `npm run test:emu` (`firebase emulators:exec --only firestore "vitest run --config vitest.emu.config.ts"`).
3. `lib/firebase/admin.ts`: when `FIRESTORE_EMULATOR_HOST` is set, initialise with a dummy project ID and no credentials so tests never need a real key.
4. Add `scripts/seed-dev.mjs` that seeds **only the emulator** (refuses to run if `FIRESTORE_EMULATOR_HOST` is unset): one location, one printer, one Super Admin, one Admin, three students. Passwords come from the script arguments, not from code.

**Acceptance:** `npm run emu` starts; `npm run test:emu` runs a sample test that writes and reads a document; seed script refuses to run without the emulator variable.

### 0.3 Tooling: tests, lint, secret scan, CI skeleton (P0, M)

**Steps**
1. `C4C`: add `vitest`, `@vitest/coverage-v8`, `@testing-library/react`, `@playwright/test`, `@firebase/rules-unit-testing`, `zod` (already present), `eslint-plugin-security`. Configs: `vitest.config.ts` (unit), `vitest.emu.config.ts` (emulator), `playwright.config.ts`.
2. Add `husky` + `lint-staged`: run eslint and type-check on staged files.
3. Add **gitleaks**: `.gitleaks.toml`, pre-commit hook, and a GitHub Action `secret-scan.yml` that fails on any finding, including history on the default branch.
4. CI skeleton `.github/workflows/ci.yml`: install, lint, type-check, unit tests, emulator tests, build. (Extended in R-07.)
5. `QDocClient`: add `pytest`, `pytest-asyncio`, `ruff`. `tests/` folder with one smoke test. Workflow `client-ci.yml` on `windows-latest`: install, ruff, pytest.

**Acceptance:** CI passes on a trivial PR in both repos; committing a fake key locally is blocked by the hook; the Action fails when a fake key is pushed to a test branch.

---

## 4. Phase 1 — Security (P0). Gate A at the end

### S-01 Rotate and purge leaked secrets (P0, S)

**Problem:** the Firebase Admin private key is hard-coded in `scripts/add-student.mjs`, committed at HEAD and in history, on a remote with branches `main`, `student` and `Admin`. The same key is in the untracked `.env.local`, which also holds the Cloudinary API secret and a guessable `NEXTAUTH_SECRET`.

**Steps**
1. **OWNER (do first, today):**
   - Google Cloud Console → IAM → Service accounts → the Firebase Admin service account → Keys: create a new key, then **delete the old key**.
   - Cloudinary: regenerate the API secret.
   - Generate a new `NEXTAUTH_SECRET` with `openssl rand -base64 32`.
   - Update the values in Vercel (production, preview) and in every local `.env.local`. Redeploy.
   - All current sessions become invalid after the secret change. That is expected.
2. Agent: rewrite `scripts/add-student.mjs` (and any other file in `scripts/`) to read `FIREBASE_ADMIN_*` from `process.env` via `dotenv/config`, and to refuse to run when `NODE_ENV=production` unless `--i-know-this-is-production` is passed. Remove every literal credential.
3. Agent: prepare the history purge commands in `docs/PURGE-HISTORY.md` using `git filter-repo --replace-text` (replacement file lists patterns, never the secret value itself) or `--path scripts/add-student.mjs --invert-paths` followed by re-adding the cleaned file. **OWNER** runs them on a fresh clone, force-pushes all branches and tags, and asks all collaborators to re-clone.
4. Add `.env.example` (names only). Ensure `.gitignore` covers `.env*`, `*.pem`, `*serviceAccount*.json`.
5. Scan every other file for secrets (gitleaks over full history) and fix or list findings.

**Acceptance:** `gitleaks detect --log-opts="--all"` reports nothing after the purge; the old key returns "invalid" when used; the app works in production with the new values; `scripts/add-student.mjs` contains no credentials.
**Tests:** unit test that the script exits with an error when the env variables are missing.

### S-02 Remove development routes, pages and seed accounts (P0, S)

**Delete:** `app/api/seed-users`, `app/api/firebase-test`, `app/api/firebase-init`, `app/api/cloudinary-test`, `app/api/admin/bootstrap-super-admin`, `app/test-session`, empty `app/api/debug-user` and `app/api/debug-set-password` directories.

**Replace with**
- `scripts/create-super-admin.mjs`: interactive (prompts for admission number, name, password; password is bcrypt-hashed with 12 rounds, never echoed), writes one `users` document with `role: "SUPER_ADMIN"`, `firstLogin: true`. Refuses to overwrite an existing user. Supports `--dry-run` and `--project`.
- `scripts/init-settings.mjs`: creates `settings/systemSettings` with the defaults if it does not exist. Idempotent.
- `scripts/audit-users.mjs` (read-only): lists users whose admission number is in a deny-list (`ADMIN001`, `S1001`, plus any that match `^TEST`, `^DEMO`) and any account with `firstLogin: true` older than 14 days. Output is a table to the console; no writes.

**OWNER:** run `audit-users.mjs` against **production** and delete or disable any account it lists (through the admin UI or the console).

**Acceptance:** those URLs return 404 in a preview deployment; `grep -R "Admin@123\|Student@123\|Test@1234" .` finds nothing; audit script output attached to the PR (redacted).
**Tests:** a route-inventory test that fails if any file under `app/api` is not listed in `docs/API-INVENTORY.md`, so routes cannot appear silently again.

### S-03 Central authorization layer (P0, M)

**Problem:** routes hand-roll `getServerSession` checks. Admins can act on any user (including Super Admins), any Admin can edit pricing and printers, and any signed-in student can call admin-shaped routes such as `/api/print-jobs/queue`.

**Create `lib/api/authz.ts`**
```ts
export type Actor = { id: string; role: Role; locationId: string | null; status: "ACTIVE" | "DISABLED"; firstLogin: boolean };

export async function requireActor(req?: Request): Promise<Actor>;            // fresh read of the user (see S-04); throws ApiError 401
export function requireRole(actor: Actor, ...roles: Role[]): void;              // throws ApiError 403
export function requireLocation(actor: Actor, locationId: string): void;        // ADMIN must match; SUPER_ADMIN passes
export async function requireCanManageUser(actor: Actor, targetId: string): Promise<User>;
//   SUPER_ADMIN: may manage any user except themselves for disable/demote
//   ADMIN: may manage only role === "STUDENT"; never another ADMIN or SUPER_ADMIN
//   STUDENT: never
export async function requireJobAccess(actor: Actor, jobId: string, mode: "read" | "write"): Promise<PrintJob>;
//   STUDENT: own jobs, read only (and cancel in U-02)
//   ADMIN: jobs whose locationId === actor.locationId
//   SUPER_ADMIN: read all; write allowed
```
Also create `lib/api/errors.ts` (`ApiError(status, code, publicMessage)`, `handleRoute(fn)` wrapper that catches, logs with a request ID, returns `{ error, code, requestId }` and **never** the internal message) and `lib/api/validate.ts` (`parseBody(schema, req)`).

**Apply to every route** using the target matrix in Appendix C. Notable changes:
- `admin/students/[id]/reset-password`, `admin/students/[id]/status`, `admin/admins/[id]/reset-password`, `admin/admins/[id]/status`, `admin/students/[id]` (GET): call `requireCanManageUser`.
- `admin/settings` PATCH: `SUPER_ADMIN` only. GET stays readable by admins.
- `admin/printers*`: ADMIN limited to printers of their location (needs `printers.locationId`, added in D-01; until then compare on the existing `location` field and record a TODO).
- `admin/notifications/broadcast`: ADMIN and SUPER_ADMIN; ADMIN broadcasts only to students (all students), SUPER_ADMIN to all users.
- `print-jobs/queue`: remove for students (see S-07). If a queue view for students is wanted later, it returns anonymised rows (token, status, pages only) through a new route.
- `admin/queue`: ADMIN gets own location; SUPER_ADMIN may pass `?locationId=`.
- `admin/students` GET: ADMIN and SUPER_ADMIN; response omits fields not needed by the UI.

**Acceptance:** the authorization matrix test (S-11) passes for every route × role; an Admin cannot reset or disable a Super Admin or another Admin; a student receives 403 from every `/api/admin/*` route.
**Tests:** unit tests for each helper; one table-driven integration test per route group against the emulator.

### S-04 Fresh sessions, first-login enforcement, safe redirect (P0, M)

**Problems:** role, location and status are frozen in the JWT for 24 hours; `firstLogin` is only enforced by a redirect on the login page; the `jwt` callback ignores `trigger === "update"`; the `redirect` callback uses `url.startsWith(baseUrl)`.

**Steps**
1. `requireActor` (S-03) loads the user document on each API call (Firestore read) and caches it in-process for at most 30 seconds keyed by user ID. If the user is missing or `DISABLED`, throw 401 `ACCOUNT_DISABLED`. Role and location come from the fresh document, not the token.
2. Server-side first-login gate: when `actor.firstLogin` is true, every route except `auth/change-password` and `auth/signout` returns 403 `PASSWORD_CHANGE_REQUIRED`. Server layouts (`app/student/layout.tsx`, `app/admin/layout.tsx`) call the same helper and `redirect("/first-login")`.
3. `change-password`: on success set `firstLogin: false`, set `passwordChangedAt`, and bump a `sessionVersion` integer on the user. The JWT stores `sessionVersion`; `requireActor` rejects tokens whose version is older (this also invalidates old sessions after a password reset or an account disable).
4. `lib/auth.ts`: handle `trigger === "update"` in the `jwt` callback by re-reading the user. Reduce session `maxAge` to 8 hours (`updateAge` 30 minutes).
5. `redirect` callback: allow only same-origin URLs: `const u = new URL(url, baseUrl); return u.origin === new URL(baseUrl).origin ? u.toString() : baseUrl;`. Add tests for `https://site.com.evil.tld`, `//evil.tld`, `javascript:` and relative paths.
6. Add `middleware.ts` using `next-auth/middleware` to keep unauthenticated users away from `/admin/*` and `/student/*` (defence in depth; real checks stay in the routes and layouts). Note that middleware cannot hit the database.

**Acceptance:** disabling a user makes their next API call return 401 within 30 seconds; resetting a password ends the target's other sessions; a student who has not changed the temporary password cannot use any API or page other than the change screen; all redirect test cases stay on the site.
**Tests:** emulator integration tests for disable, demote, password reset, and first-login gate.

### S-05 Login hardening (P0, M)

**Steps**
1. `lib/security/rate-limit.ts` with two backends chosen by env: `UPSTASH_REDIS_REST_URL`/`_TOKEN` present → `@upstash/ratelimit` sliding window; otherwise a Firestore-based limiter (`rateLimits/{key}` with count and windowStart, updated in a transaction). Keys: `login:user:<ADMISSION>` and `login:ip:<ip>`.
2. Policy: 5 failed attempts per admission number per 15 minutes → lock for 15 minutes; 30 attempts per IP per 15 minutes. Successful login resets the user counter. Return the same generic error (`INVALID_CREDENTIALS`) for wrong password, unknown user and rate-limited state, with `Retry-After` set. Do not reveal `ACCOUNT_DISABLED` at the login step: return the generic error and show the "contact the print center" hint on the login page for every failure.
3. Always run a bcrypt comparison, even for unknown users (compare against a fixed dummy hash) to remove the timing difference.
4. `lib/security/passwords.ts`: `generateTempPassword()` uses `crypto.randomInt`, 12 characters from an alphabet without look-alikes (no `0 O o 1 l I`), guaranteed to include a digit and a symbol. Replace every use of `Math.random` for secrets. Password policy for user-chosen passwords: minimum 10 characters, not equal to admission number or name, not in a bundled list of the 10,000 most common passwords.
5. Log failed and locked attempts to `activityLogs` (action `LOGIN_FAILED`, `LOGIN_LOCKED`) with IP hash, not the raw IP.

**Acceptance:** the sixth wrong attempt within 15 minutes is refused even with the right password until the window passes; responses for unknown user and wrong password are indistinguishable in body, status and (statistically) time.
**Tests:** unit tests for the limiter; timing test with a tolerance; password generator property tests (length, alphabet, entropy of 1,000 samples).

### S-06 Server authority for job creation (P0, M)

**Problem:** `print-jobs/create` trusts `amount`, `totalPages`, `copies`, `locationId`, `fileUrl`. A student can pay ₹0, report one page to jump the queue, request 999,999 copies, or point `fileUrl` at an internal address (the admin file route fetches it server-side: SSRF).

**New contract** (`POST /api/print-jobs/create`), validated by zod:
```ts
{ fileRef: { publicId: string },          // Cloudinary public ID returned by the upload step
  copies: number,                          // integer, 1..settings.maxCopies (default 50)
  printType: "SINGLE" | "DOUBLE",
  colorMode: "BW" | "COLOR",               // COLOR allowed only if settings.colorEnabled
  paperSize: "A4",
  locationId: string,
  paymentMethod: "CASH" }
```
**Server steps**
1. Verify `publicId` starts with `campus-printing/<actor.id>/` (the actor's own folder). Reject anything else.
2. Ask Cloudinary Admin API for the resource (`bytes`, `format`, `resource_type`). Reject if it does not exist, if `bytes > settings.maxFileSizeMB`, or if the format is not in the allowed list (PDF only until D-08 extends it to images that are already converted to PDF client-side).
3. Download the file **server to server** using a signed URL (the Vercel 4.5 MB body limit applies to requests and responses of the function, not to outbound downloads). Check the `%PDF-` header, reject encrypted PDFs, count pages with `pdf-lib` (`PDFDocument.load(bytes, { ignoreEncryption: false })`). Reject 0 pages and pages > `settings.maxPagesPerJob` (default 300).
4. Check the location exists and `isActive`.
5. Compute `amount` from `settings` prices with `lib/domain/pricing.ts` (`priceJob({ pages, copies, printType, colorMode, prices })`, pure function, shared with the client for the estimate). Store `amount`, `totalPages`, `pricingSnapshot` (prices used), `fileRef` (publicId, bytes, sha256 of the bytes), never a raw URL.
6. Allocate the token (D-02) and write the job in one transaction with an idempotency key: the client sends `Idempotency-Key`; a repeated key returns the existing job instead of creating a second one.

**Client changes:** `DesktopStudentView` and `MobileStudentView` stop sending `amount`, `totalPages`, `fileUrl`; they show the server's estimate from `POST /api/print-jobs/quote` (same validation, no write) so the price shown equals the price charged.

**Acceptance:** tampering with any field in a crafted request is rejected or overridden; the stored amount always equals `priceJob(...)`; `fileUrl` cannot be supplied; double-clicking Submit creates one job.
**Tests:** pricing unit tests (single/double, odd pages, copies, colour); integration tests for every rejection path; SSRF regression test (an internal URL in a legacy `fileUrl` field is ignored).

### S-07 Private files, signed access, retention (P0, M)

**Problems:** Cloudinary raw uploads are public URLs; `/api/print-jobs/queue` returns every student's file URL to any student; files are never deleted.

**Steps**
1. Upload with `type: "authenticated"`, `resource_type: "raw"`, folder `campus-printing/<userId>/`, unique filename (UUID, not the user-supplied name). Keep the original name only in the job document.
2. Admin file access: `GET /api/admin/jobs/[id]/file-url` (uses `requireJobAccess(..., "write")`) returns a **signed** delivery URL for the authenticated asset. Spike (record in `DECISIONS.md`): (a) signed authenticated delivery URL fetched by the browser directly (check CORS); (b) if CORS blocks it, a streaming proxy route `GET /api/admin/jobs/[id]/file` that pipes the Cloudinary response (`new Response(stream)`), verified against the Vercel response limit with a 20 MB file. Choose (a) if it works.
3. Student JSON never includes file references; admin JSON includes them only on the detail route.
4. Delete `app/api/print-jobs/queue/route.ts` and its callers (`app/dashboard/queue`). If a student "queue" page is wanted, it uses the anonymised route from U-01.
5. Retention: setting `fileRetentionHours` (default 48). On `COLLECTED` and `CANCELLED`, schedule deletion: best-effort immediate `cloudinary.uploader.destroy(publicId, { resource_type: "raw", type: "authenticated" })`, plus the cleanup job in R-06 that removes any file older than the retention window whose job is terminal, and any upload with no job after 2 hours. Store `fileDeletedAt` on the job. The UI shows "file removed" for reprint requests after deletion (U-02 handles asking the student to upload again).

**Acceptance:** a stored file URL guessed or copied from a student's own response cannot be used to fetch anyone else's file; an unauthenticated request to an asset URL fails; files disappear after the retention window; no route returns a `fileUrl` to a student.
**Tests:** integration tests for access checks; a scripted check that an authenticated asset URL without a signature returns 401/404.

### S-08 Firestore rules and authenticated live notifications (P0, M)

**Problem:** `notifications` has `allow read: if true`; the app signs in with NextAuth, so `request.auth` is always null on the client.

**Steps**
1. `POST /api/auth/firebase-token` (signed-in users only): `getAuth().createCustomToken(actor.id, { role })`. The client calls `signInWithCustomToken` in `NotificationContext` after sign-in and refreshes the token before it expires (1 hour).
2. Rules (Appendix D): notifications readable when `resource.data.studentId == request.auth.uid` or `resource.data.isBroadcast == true`; all writes denied; everything else denied. The client runs two listeners: one with `where("studentId","==",uid)`, one with `where("isBroadcast","==",true)`.
3. Add rules unit tests with `@firebase/rules-unit-testing` (unauthenticated read denied; other student's notification denied; own allowed; broadcast allowed; any write denied; every other collection denied).
4. Notification documents must not contain file names or amounts. Change the message templates to "Your job RP1042 is ready" style (token only).
5. Deploy rules through CI (R-07) and manually once via `firebase deploy --only firestore:rules` to staging first.

**Acceptance:** an unauthenticated client cannot read any notification; a signed-in student sees only their own and broadcast items; all rules tests pass.

### S-09 API hygiene (P0, M)

**Steps**
1. Every route wrapped with `handleRoute` and using `parseBody` (zod). Reject unknown fields (`.strict()`), cap string lengths, integers for counts, finite non-negative numbers for money.
2. Error shape everywhere: `{ error: string, code: string, requestId: string }`. Log the real error with the request ID server-side. No `details: e.message` in any response.
3. `admin/settings` PATCH: schema with ranges (prices 0–100, `queueWindowMinutes` 1–30, `maxFileSizeMB` 1–25, `maxCopies` 1–100, `fileRetentionHours` 1–720). Accept all fields the UI edits, including the ones currently dropped (`queueWindowMinutes`, `maxFileSizeMB`).
4. `admin/db/clear`: require a fresh password re-entry (`password` field checked against the actor's hash) and the typed phrase `DELETE <scope>` on the **server**, write an activity log entry before deleting, refuse when `NODE_ENV=production` unless `ALLOW_DB_CLEAR=1` is set in the environment.
5. Security headers in `next.config.mjs`: `Content-Security-Policy` (start in report-only, then enforce; allow `self`, Cloudinary and Firebase hosts, and `ws://127.0.0.1:8765` in `connect-src`), `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy: same-origin`, `Permissions-Policy` (camera, microphone, geolocation off).
6. Remove `experimental.serverActions.bodySizeLimit` (it does not affect route handlers and misleads readers). Add a comment explaining the real limits.

**Acceptance:** fuzzing a route with unknown fields returns 400; no response body contains a stack trace or internal message; headers visible in a preview deployment; `db/clear` cannot run without the password and phrase.

### S-10 Dependency upgrade (P0, S)

**Steps:** upgrade `next` and `eslint-config-next` to the latest 14.2.x, run `npm audit` and fix high and critical findings, pin Node in `package.json` `engines` (>=18.17) and `.nvmrc`. Rebuild, run all tests, deploy to staging. Record any advisory that cannot be fixed in `DECISIONS.md`.

**Acceptance:** `npm audit --omit=dev` shows no high or critical; build and tests pass.

### S-11 Security test suite and Gate A (P0, M)

**Create** `tests/security/authz-matrix.test.ts`: a table of `{ route, method, role, expected }` covering every route in `docs/API-INVENTORY.md` for the roles anonymous, student, admin (own location), admin (other location), super admin, and disabled user. The test fails if a route is missing from the table.

**Gate A checklist (human review, all must be true)**
- [ ] Old credentials revoked; new ones in place; history purged.
- [ ] Development routes gone in production; audit shows no seed accounts.
- [ ] Authorization matrix passes.
- [ ] A student cannot see any other student's job, file or notification.
- [ ] Price, pages and copies are computed on the server.
- [ ] Login rate limiting works in staging.
- [ ] Rules tests pass; rules deployed.
- [ ] Penetration checklist (Appendix G) walked through on staging by someone who did not write the code.

---

## 5. Phase 2 — Print path (P1). Gate B at the end

Goal: printing works for real documents, reports success or failure truthfully, never prints on the wrong device, and can be retried.

### D-01 Canonical enums and data migration (P1, M)

**Problem:** the student form stores `single-sided` / `double-sided`; admin code tests `DOUBLE`; payment method is stored as `wallet`; Letter is offered while only A4 exists; colour is commented out; printers have a free-text `location` name.

**Steps**
1. Create `lib/domain/enums.ts` with the values in Appendix B and zod enums (`PrintTypeSchema`, `ColorModeSchema`, `PaymentMethodSchema`, `PaperSizeSchema`, `JobStatusSchema`, `PaymentStatusSchema`). Replace every string literal usage across `app/`, `components/`, `lib/`. Add an ESLint `no-restricted-syntax` rule that flags the old literals.
2. Student views: bind `printType` to `SINGLE`/`DOUBLE`, payment to `CASH`, paper to `A4`. Decide colour: **recommended** — add `settings.colorEnabled` (default `false`); show the colour option only when true and when the selected location has at least one colour printer (`printers.supportsColor`).
3. Add fields: `printers.locationId` (string), `printers.windowsName` (string, used by D-07), `printers.supportsColor` (boolean). Migration maps the existing `location` name to a `locationId` by exact name match; unmatched printers are listed in the dry-run report for manual fix.
4. Write `scripts/migrate-001-enums.mjs` (Appendix E): maps `single-sided`→`SINGLE`, `double-sided`→`DOUBLE`, `wallet`→`CASH`, missing `paperSize`→`A4`; adds `printers.locationId`. Idempotent, batched (400 writes per batch), `--dry-run` default, prints counts by change type, writes a backup JSON of the touched documents to a local folder.
5. Admin screens read only canonical values; for one release, a read-time normaliser (`normalizeJob`) accepts the legacy values so unmigrated data does not break the UI. Remove the normaliser in a later cleanup PR.

**Acceptance:** after migration, no job has a non-canonical enum value (verified by `scripts/verify-enums.mjs`); a double-sided job shows "Double-sided" everywhere and sends `duplex` to the printer (proved in D-11); the old literals no longer exist in the code base.
**Tests:** unit tests for `normalizeJob`; migration script tests against the emulator with mixed legacy data.

### D-02 Token counter in a transaction (P1, S)

**Steps:** create `counters/tokens` (`{ next: number }`). `allocateToken(tx)` reads and increments it inside the same transaction that creates the job. Initial value from the highest existing token +1 (migration `migrate-002-token-counter.mjs`). `db/clear` for print jobs resets the counter only when the request asks for it (`resetTokens: true`).

**Acceptance:** 200 concurrent creations in the emulator produce 200 distinct tokens with no gaps beyond aborted transactions.
**Tests:** concurrency test with `Promise.all`.

### D-03 Job state machine, transactional transitions, print lock (P1, M)

**Problem:** routes update status without checking the current status; two admins can start the same job; a job can go from `CANCELLED` to `PRINTING`.

**Steps**
1. `lib/domain/job-state.ts` with the transition table:
   - `WAITING → PRINTING | CANCELLED`
   - `PRINTING → READY | WAITING (retry) | CANCELLED`
   - `READY → COLLECTED | CANCELLED`
   - `COLLECTED`, `CANCELLED`: terminal.
   Payment: `PENDING ⇄ PAID`, but a job with status `COLLECTED` cannot be set to `PENDING`.
2. `lib/services/print-service.ts`: every transition runs in `runTransaction`, reads the current status, rejects illegal transitions with `409 ILLEGAL_TRANSITION`, then updates status, `updatedAt`, and writes the activity log and notification in the same commit.
3. Print lock: `POST /api/admin/jobs/[id]/claim` sets `printLock: { by, at }` if unlocked or older than 2 minutes, else `409 LOCKED_BY_OTHER`. `start` requires the caller to hold the lock and clears it. `release` clears it (used when a print fails). Lock expiry prevents a crashed browser from blocking a job forever.
4. `start` requires `paymentStatus === "PAID"`. The UI collects payment first (D-07 shows the confirmation).
5. Add the missing UI action for `cancel` (button in the job detail page and queue row menu) with a reason field (stored in `cancelReason`, shown to the student).

**Acceptance:** two simultaneous `claim` calls: exactly one succeeds; every illegal transition returns 409; the state diagram in the documentation matches the code.
**Tests:** table-driven tests over all (from, to) pairs; concurrency tests.

### D-04 Print protocol v2 and daemon core changes (P1, L) — repo `QDocClient`

Implement the protocol in Appendix A. Summary:
- Every message has `v`, `id` (client-generated UUID), `type`/`action`.
- Handshake `hello` returns the client version, protocol version, printers and capabilities. The web app uses it to decide between v1 behaviour (old clients) and v2.
- `print_file` is acknowledged twice: `accepted` (validated and queued) then `completed` (handed to the print engine successfully) or `failed` with a code. `completed` means "sent to the Windows print spooler", not "paper came out"; the UI wording reflects this.
- **No silent fallback.** If `printer` is not one of the installed printers the reply is `failed` with `PRINTER_NOT_FOUND`. A config flag `allow_fallback_printer` (default false) keeps the old behaviour for emergencies.
- `websockets.serve(..., max_size=MAX_PAYLOAD_BYTES)` where `MAX_PAYLOAD_BYTES` = `32 * 1024 * 1024` (base64 of about 24 MB). Reject with `TOO_LARGE` before decoding when the declared size is above the limit.
- The handler must not block the event loop: decoding, file writing and printing run through `loop.run_in_executor` with a single worker per printer so jobs to one printer are serialised and jobs to different printers run in parallel.
- Track connections in a `set`; the connected indicator is `len(connections) > 0`.
- Multiple allowed origins: `ALLOWED_ORIGINS` list in config (production and staging), compared case-insensitively after removing a trailing slash.
- Server-side idempotency: remember the last 200 `jobId`s for 10 minutes; a repeated `print_file` for a `jobId` already `completed` returns `completed` again without printing twice.

**Acceptance:** all message types in Appendix A behave as specified, verified by `tests/test_protocol.py` using a fake print engine; a 20 MB PDF passes; a request from a wrong origin is refused before any parsing; a repeated `jobId` never prints twice.

### D-05 Daemon robustness (P1, M) — repo `QDocClient`

**Steps**
1. Paths: `APP_DIR = %APPDATA%\QDoc` for `qdoc_config.json`, logs and the preferred-printer setting; `resource_path()` (`sys._MEIPASS` aware) for bundled files (`logo.png`, `SumatraPDF.exe`). No path may depend on the current working directory.
2. Logging: `logging` with `RotatingFileHandler` (1 MB × 5) in `APP_DIR\logs\qdoc.log`. Log connects, origins refused, job IDs, printer names, result and timings. **Never log document content or base64 data.** Tray menu gets "Open log folder".
3. Single instance: named mutex (`win32event.CreateMutex("Global\\QDocClient")`); a second launch shows a message ("QDoc is already running") and exits.
4. Startup errors are visible: if the port is in use or binding fails, show the dashboard in an error state with the reason, and write the log. Remove every bare `except: pass`.
5. Persist the preferred printer and allowed origins in the config file; validate the config on load (schema) and fall back to defaults with a log entry when corrupt.
6. Remove the licence gate, `MASTER_KEY`, the `cryptography` dependency, `wmi` and `get_machine_fingerprint` (the repo is MIT; the gate gave no protection). If licensing is wanted later, it is designed in A-01 as server-side device enrolment, not an embedded key.
7. Tray menu: Open Control Dashboard, Link Account, Open log folder, Send test print, Exit.
8. Thread safety: all Tk updates go through `root.after` from the main thread using a `queue.Queue` polled by the UI loop.

**Acceptance:** works when launched from any folder, including `C:\Windows\System32` as the working directory; second launch is refused politely; log file shows a job's lifecycle; dashboard shows a clear error when port 8765 is already in use.
**Tests:** pytest for config load/save, origin normalisation, single-instance behaviour (mock mutex), log redaction.

### D-06 Daemon printing engine (P1, M) — repo `QDocClient`

**Problem:** `ShellExecute printto` depends on the default PDF program (Edge has no `printto` verb), and `SetPrinter` changes the printer's global defaults and races between jobs.

**Steps**
1. Bundle **SumatraPDF** (portable, 64-bit) in `bin\` and print with
   `SumatraPDF.exe -print-to "<windows name>" -print-settings "<simplex|duplexlong|duplexshort>,<N>x,<monochrome|color>,paper=A4" -silent "<file>"`,
   waiting for the process (timeout 120 s). Exit code 0 → `completed`; otherwise `failed` with `PRINT_FAILED` and the first 200 characters of stderr in the log (not in the reply).
2. Licensing note for the release: SumatraPDF is GPLv3. Ship it as a separate, unmodified executable next to the client, include its licence text and source link in the installer (`THIRD-PARTY-NOTICES.txt`). Record the review in `DECISIONS.md`.
3. Remove `win32print.SetPrinter` and all default-mutating code. Per-job options travel only in the command line.
4. Fallback engine behind a flag (`engine: "shellexecute"`) for machines where Sumatra is blocked; it does not set printer defaults and reports `completed` only when `ShellExecute` returns success.
5. Temp files: created in `APP_DIR\spool\` with random names, deleted in a `finally` after the print process exits; on start-up delete any file older than 1 hour in that folder.
6. "Send test print": prints a bundled one-page PDF (printer name, date, client version) to the chosen printer; used by staff to verify a new installation.
7. Printer status: `list_printers` returns `name`, `isDefault`, `status` (from `win32print.GetPrinter` attributes: offline, paper out, error). The web app shows it in the printer picker.

**Acceptance:** double-sided and multi-copy jobs print correctly on the pilot printers; a second job with different settings does not inherit the first job's settings; unplugged printer yields `failed` (not `completed`).
**Tests:** command-line construction unit tests for every option combination; engine timeout test with a fake process; manual hardware checklist in D-11.

### D-07 Web print flow v2 (P1, L) — repo `C4C`

**Steps**
1. `lib/hooks/usePrinter.ts` rewrite:
   - Default URL `ws://127.0.0.1:8765` when `NEXT_PUBLIC_PRINTER_WS_URL` is unset.
   - Connection manager with exponential backoff and jitter (1 s → 30 s), pause when the tab is hidden.
   - `hello()` on connect; state includes `clientVersion`, `protocol`, `printers`.
   - `printFile({ jobId, printer, copies, duplex, colorMode, data }): Promise<PrintResult>` correlates replies by `id`, resolves on `completed`, rejects with a typed `PrinterError` on `failed`, times out after 90 seconds, and rejects immediately when the socket is not open (**never** returns success without a reply).
   - For clients that only speak v1: keep a compatibility path that treats the single `success`/`error` reply as `completed`/`failed` (no correlation).
2. `app/admin/queue/page.tsx` and `app/admin/queue/[jobId]/page.tsx` print flow:
   1. `POST .../claim` (D-03). On `LOCKED_BY_OTHER` show who has it.
   2. If payment is `PENDING`, show a confirmation dialog "Cash received: ₹X" before continuing; on confirm `POST .../payment`.
   3. Get the file (S-07 signed URL, or streamed route), check the size, base64-encode.
   4. `printFile(...)`. Show progress: "Sending → Sent to printer".
   5. On `completed`: `POST .../start`. On failure: `POST .../release`, keep the job in `WAITING`, show the mapped message (Appendix A error table) and a **Retry** button.
3. Printer selection: the picker lists printers registered for the admin's location (`printers` with `locationId`), each showing the daemon-reported status. A printer whose `windowsName` is not in the daemon's list is shown as "not found on this PC" and cannot be selected.
4. `app/admin/settings` → Printers: add the **Windows printer name** field as a dropdown fed by the daemon's list when connected (free text only when not connected), plus `supportsColor` and the location (locked for ADMIN, selectable for SUPER_ADMIN).
5. Print status bar (already in the admin layout) shows client version, protocol, connected origin and a "Send test print" button.
6. Add the copy and wording rules: "Sent to printer" is never described as "printed"; after `completed` the row shows "Check the tray, then Mark ready".

**Acceptance:** with the daemon stopped, Print shows a clear error and changes nothing; with a bad printer name, no paper and a clear error; a failed print leaves the job in `WAITING` with a Retry button; two admins cannot print the same job; the duplex setting reaches the printer (verified in D-11).
**Tests:** unit tests for `usePrinter` with a mock WebSocket (success, failure, timeout, close mid-job); component tests for the dialog and retry; Playwright flow in D-11.

### D-08 Upload pipeline (P1, L) — repo `C4C`

**Problem:** files pass through a Vercel route (4.5 MB body limit), the interface allows 50 MB, settings say 10 MB, Word/PowerPoint are accepted but cannot print, page counts for them are guessed from size.

**Steps**
1. Signed direct upload: `POST /api/upload/sign` returns `{ cloudName, apiKey, timestamp, signature, folder, publicId, type: "authenticated", resourceType: "raw" }` for the actor's folder with a fresh UUID public ID; nothing else is signed. The browser uploads straight to Cloudinary with `XMLHttpRequest` so progress events are available.
2. After upload the browser calls `create` (S-06) with the `publicId`; the server validates as described there. An upload that never gets a job is removed by R-06.
3. Size limit: one source of truth, `settings.maxFileSizeMB` (default 10, range 1–25), exposed by `GET /api/settings`, enforced in the browser before upload and on the server in S-06. **OWNER:** confirm the Cloudinary plan's raw-file limit is at least that value (free plans have historically capped files at about 10 MB).
4. Allowed inputs for the pilot: **PDF, PNG, JPG/JPEG**. Images are converted to PDF in the browser (already implemented in `PdfEditor.tsx`), **resized to at most 2480 px on the long edge and re-encoded as JPEG quality 0.85** so a phone photo does not become a 5 MB PDF. Remove `doc`, `docx`, `pptx` from `accept`, from the upload route and from `allowedFileTypes` in settings. Behind `settings.officeConversionEnabled` (default false) keep the UI ready for a later conversion service (out of scope here, listed in U-03 notes).
5. Client-side page count stays for the live price preview only; the server value is authoritative (S-06).
6. Compress option: after editing, if the final PDF is above the limit, offer "Reduce size" (re-render pages at lower resolution using pdf-lib image downsampling) instead of a bare error.
7. Remove the Vercel proxy upload route once the signed flow is live; keep it one release behind a flag for rollback.
8. Files retrieved by the admin browser: implement the choice from S-07 (signed URL or streaming), and ensure the daemon limit from D-04 (32 MiB) is above `maxFileSizeMB` × 1.34 (base64 overhead).

**Acceptance:** a 9 MB PDF submits and prints; a 12 MB file is refused before upload with a clear message; a DOCX is refused with "Save as PDF first" guidance; phone photos produce PDFs under 1 MB.
**Tests:** unit tests for image downscaling and size checks; integration test for the sign route (only the actor's folder is signed); Playwright upload with a large PDF against Cloudinary staging.

### D-09 Fixed-window queue ordering and settings screen (P1, S)

**Problem:** windows are anchored to the earliest waiting job, so positions reshuffle when that job leaves.

**Steps**
1. `lib/firestore/sjf-queue.ts`: window index = `floor(createdAtMs / windowMs)`; sort by (window index, `totalPages × copies`, `createdAt`, token). Pure function `orderQueue(jobs, windowMinutes)` with tests.
2. Settings screen field for `queueWindowMinutes` (1–30) with a plain-language explanation and a live example.
3. Add an **aging guarantee**: a job older than `maxWaitMinutes` (default 30) moves to the front of the next window regardless of size (prevents indefinite delay in a busy window).

**Acceptance:** the order of the remaining jobs does not change when the first job leaves; the worked example from the documentation yields B, C, A, D; property test: no job overtakes a job from an earlier window.

### D-10 Installer, signing, release process (P1, M) — repo `QDocClient`

**Steps**
1. Replace the ad-hoc installer with an **Inno Setup** script (`installer/qdoc.iss`): per-machine install to `Program Files\QDoc`, data in `%APPDATA%\QDoc`, Start Menu entry, "Start with Windows" option (Startup shortcut), uninstaller that leaves logs unless asked, version resource, licence and third-party notices pages.
2. Rewrite installer notes: correct menu names (Open Control Dashboard → Link Account), remove the "Link Web Account" text, explain "Send test print", and state that the "Insecure content" browser setting is normally **not** needed (only as a troubleshooting step).
3. PyInstaller spec: `upx=False`, `icon` set to a real `.ico`, `--onefile` kept or switched to onedir (decide by AV false-positive results on the pilot PCs; record in `DECISIONS.md`). Embed version from `VERSION` file.
4. **OWNER:** code-signing. Options: a standard code-signing certificate, or Azure Trusted Signing. Until a certificate exists, distribute through the college's software share with a published SHA-256 checksum and ask IT to allow-list the publisher/hash in SmartScreen and antivirus.
5. GitHub Action `release.yml` (Windows runner): tag `client-vX.Y.Z` → build exe → build installer → sign (when a certificate secret exists) → compute SHA-256 → attach both to a GitHub Release.
6. `docs/RELEASING.md` and an **update check**: the dashboard shows the current version and, when online, the latest release number (read-only; no auto-update in this phase).

**Acceptance:** clean install and uninstall on a fresh Windows 10 and Windows 11 VM; installer text matches the real UI; released artifacts have checksums; Windows Defender scan is clean.

### D-11 End-to-end print tests and hardware acceptance (P1, M) — both repos

**Automated**
- A small **mock daemon** (`tests/mock-daemon/server.ts`, Node `ws`) implementing protocol v2 with switches to simulate `PRINTER_NOT_FOUND`, `PRINT_FAILED`, slow replies, dropped connections.
- Playwright scenarios (staging, emulator data): student submit → admin claim → print → success → ready → collected; failure → retry; two admins racing; daemon offline; wrong printer; double-sided passes `duplex`; 9 MB PDF; refused 12 MB file; disabled student.

**Hardware (record results in `docs/ACCEPTANCE-PRINT.md`)** on every pilot printer model, on Windows 10 and 11:
| # | Case | Expected |
|---|---|---|
| 1 | 1-page PDF, 1 copy, single-sided | one page |
| 2 | 10-page PDF, 2 copies | 20 pages, collated as the driver defaults |
| 3 | Double-sided 5-page PDF | 3 sheets printed both sides |
| 4 | Photo JPG converted | one clean page |
| 5 | Two jobs in a row with different duplex settings | each honours its own setting |
| 6 | Printer offline | `failed`, job stays `WAITING` |
| 7 | Wrong printer name | `failed`, no paper anywhere |
| 8 | 9 MB PDF | prints |
| 9 | Client restarted mid-queue | web reconnects; next job prints |
| 10 | Encrypted or corrupt PDF | rejected at submit time |

**Gate B checklist**
- [ ] D-01 to D-10 merged; all automated tests green in CI.
- [ ] Hardware table complete on all pilot printer models.
- [ ] No known case where success is reported but nothing printed, or where the wrong printer is used.
- [ ] Installer signed or allow-listed; installed on the pilot PC by someone other than the developer following only the written guide.
- [ ] Rollback tested: previous client installer and previous web release both restore service.

---

## 6. Phase 3 — Reliability and operations (P2). Gate C at the end

### R-01 Firestore indexes and Firebase project config (P2, S)
Create `firestore.indexes.json` for every composite query in `lib/firestore/*` (collect them by running the emulator tests with `--debug` and by reading each `where` + `orderBy` combination). Expected: `printJobs` (`studentId`+`createdAt` desc; `locationId`+`status`+`createdAt`; `locationId`+`createdAt`; `status`+`createdAt`), `notifications` (`studentId`+`createdAt` desc; `isBroadcast`+`createdAt`), `activityLogs` (`timestamp` desc; `adminId`+`timestamp`), `users` (`role`+`admissionNumber`; `role`+`createdAt`). Commit `firebase.json` with rules and index paths; deploy with `firebase deploy --only firestore:indexes,firestore:rules`.
**Acceptance:** a fresh Firebase project plus `firebase deploy` makes every route work without "requires an index" errors (checked by the emulator-free staging smoke test).

### R-02 Pagination, aggregations, no full scans (P2, M)
- `GET /api/admin/queue?status=&cursor=&limit=` (default 50, max 100) cursor-based on (`createdAt`, `id`). Default view returns active statuses only; history is a separate tab with paging.
- `GET /api/admin/students?search=&status=&cursor=&limit=`: prefix search on `admissionNumber` using range queries (`>= q`, `< q + "\uf8ff"`) and a name-prefix field `nameLower`.
- Dashboard tiles use Firestore aggregation queries (`count()`, `sum('amount')`) with date filters instead of loading documents.
- Client polling: replace fixed 15 s `setInterval` by a `useVisiblePolling` hook (pauses when the tab is hidden, backs off when nothing changes, refreshes immediately on focus). Send `If-None-Match` with a hash of the queue so unchanged responses are `304`.
**Acceptance:** with 20,000 job documents in the emulator the queue route reads at most `limit` + a constant number of documents (asserted in a test using a read counter); dashboard reads do not grow with data size.

### R-03 Denormalised statistics (P2, M)
Maintain `users/{id}.stats = { jobCount, totalSpent, lastJobAt }` inside the same transaction as job creation and on `COLLECTED`. Migration `migrate-003-stats.mjs` backfills. The student list reads stats from the user document; no per-student job scans.
**Acceptance:** the students page performs one query per page of results; totals match a recount in a test.

### R-04 Observability: errors, logs, health, alerts (P2, M)
1. Sentry (`@sentry/nextjs`) for browser and server, release tagged with the Git SHA, PII scrubbing (drop request bodies and cookies, hash user IDs). Feature-flag via `SENTRY_DSN`.
2. Structured JSON logs from `handleRoute` (`requestId`, route, status, duration, actor ID hash, error code). No document content, file names, passwords or tokens.
3. `GET /api/health` (no auth): returns `{ ok, version, time }` after a cheap Firestore read (`settings/systemSettings` exists) with a 2 s timeout; never returns configuration.
4. **OWNER:** uptime monitor on `/api/health` (for example UptimeRobot or Better Stack) with SMS or email alerts to two people; budget alerts on Firebase and Cloudinary usage at 50%, 80%, 100%.
5. Client side: the daemon reports its version and a heartbeat when connected (`hello`); the admin bar shows "client outdated" if below `MIN_CLIENT_VERSION` (setting).
**Acceptance:** a forced error in staging appears in Sentry with the request ID and no PII; the uptime monitor alerts within 5 minutes when the health route is broken.

### R-05 Backups and restore drill (P2, M)
1. **OWNER:** a Cloud Storage bucket with a lifecycle rule (delete after 60 days) and a Cloud Scheduler job that runs a daily Firestore export (`gcloud firestore export`).
2. `docs/RUNBOOK-RESTORE.md`: step-by-step import into the **staging** project, integrity checks (counts per collection, sample documents), and how to roll production back to a point in time.
3. Run the restore drill once, time it, record the result. Repeat every term.
**Acceptance:** a full restore to staging succeeds using only the runbook; recorded restore time is under 60 minutes.

### R-06 Cleanup jobs (P2, S)
Vercel Cron (`vercel.json`) calling `GET /api/cron/cleanup` daily, protected by `CRON_SECRET` (`Authorization: Bearer`). It (a) deletes files for jobs in a terminal status older than `fileRetentionHours`, (b) deletes uploads under `campus-printing/` with no job after 2 hours, (c) deletes `notifications` older than 90 days and `rateLimits` older than 2 days, (d) writes a summary line to the logs. Dry-run mode via `?dry=1`.
**Acceptance:** in staging, an old test upload and an old terminal job's file are removed; a job still waiting is untouched.

### R-07 CI/CD, preview deploys, branch protection (P2, M)
- `ci.yml` (extend from 0.3): install (with cache), lint, type-check, unit, emulator tests (including rules tests), `next build`, Playwright smoke against a preview URL.
- Preview deployments per pull request (Vercel), staging deploy on merge to `main`, production deploy on tag `web-vX.Y.Z` with a manual approval step.
- **OWNER:** branch protection on `main`: required checks, one review, no direct pushes, linear history.
- `deploy-rules.yml`: deploy Firestore rules and indexes to staging automatically and to production on tagged release.
- Client: `client-ci.yml` from D-10 plus `release.yml`.
**Acceptance:** a deliberately failing test blocks merging; a tag produces a production deployment only after approval.

### R-08 Load and cost test (P2, M)
Use k6 against staging: 300 students sign in and submit a 2 MB PDF within 10 minutes; 5 admins refresh queues every 15 s. Measure p95 latency per route, error rate, Firestore reads/writes per job (target ≤ 40 reads and ≤ 15 writes per job lifecycle), Cloudinary bandwidth. Project the monthly cost for 2,000 active students.
**Acceptance:** p95 < 800 ms for reads and < 2.5 s for job creation; error rate < 0.5%; the projection fits the college budget or a plan change is recorded.

### R-09 Documentation refresh and runbooks (P2, M)
Rewrite `README.md` (real architecture, no mock-data or Razorpay text), add `docs/DEPLOY.md`, `docs/RUNBOOK-OPS.md` (daily/weekly), `docs/RUNBOOK-INCIDENTS.md` (site down, client not connecting, wrong prints, suspected key leak), `docs/API.md` generated from the route inventory, and issue version 1.1 of the system documentation (the yellow placeholders filled in, sections 12, 13, 14, 16 and 17 updated to match the new state).
**Acceptance:** a person who has not seen the project can deploy staging from the docs alone.

**Gate C checklist**
- [ ] Indexes and rules deployed by pipeline; fresh project bootstraps from the repo.
- [ ] Read counts bounded; load test passed.
- [ ] Alerts fire; restore drill done.
- [ ] Cleanup job verified.
- [ ] Documentation v1.1 published; runbooks reviewed by the support staff.

---

## 7. Phase 4 — Experience (P3). Gate D at the end

Each task ships behind its own setting or flag when it changes existing behaviour. Usability test each with three students and two staff before merging (record findings in `docs/UX-FINDINGS.md`).

### U-01 Queue position and estimated wait (P3, M)
`GET /api/print-jobs/[id]/status` (owner only) returns `{ status, position, jobsAhead, etaMinutes }`. Position comes from `orderQueue` for the job's location (D-09). ETA = sum of estimated seconds of jobs ahead ÷ active printers, where estimated seconds per job = `setup(15) + pages × copies × secondsPerPage` with `secondsPerPage` learned from a moving average of recent completed jobs (stored in `settings.stats`), bounded to sensible limits. Show "Position 3 · about 8 min" on the Active Jobs card and the token slip; update the landing page copy so it promises only what exists.
**Acceptance:** position matches the admin queue order; ETA within ±40% on the staging load scenario.

### U-02 Student cancel and reprint (P3, S)
Student may cancel their own job while `WAITING` (`POST /api/print-jobs/[id]/cancel`, ownership + state checked, reason optional). History rows get **Print again**: prefilled wizard with the same settings; if the file has been deleted (S-07), ask for the upload again with a friendly explanation.
**Acceptance:** cancel is impossible once printing has started; cancelled job frees its position immediately.

### U-03 Upload and submit UX (P3, M)
Progress bar with cancel; clear, specific messages from a message catalogue (too large, encrypted, corrupt, wrong type, offline); page-count and price breakdown component ("6 sheets × 2 copies × ₹3 = ₹36"); page range and "several pages per sheet" options (implemented by re-composing the PDF in the browser); file preview before submit; "Save as PDF" help link for Word/PowerPoint users; remembers last location and settings.
*Out of scope note:* Office-to-PDF conversion needs a small server (Gotenberg or LibreOffice in a container). If the college wants it, add a task after Gate D.
**Acceptance:** users complete a first submission unaided in usability tests; every failure path shows an actionable message.

### U-04 Staff console (P3, M)
- Kiosk view `/admin/kiosk`: large text, next three jobs, one-tap Print, auto-refresh, works on a wall display.
- Job row menu: Retry, Reprint, Cancel (with reason), Mark unpaid.
- Token lookup: a focused search box that accepts a typed or scanned token (barcode scanners type into the field); Enter opens the job. Token slip shows a QR code encoding the token (`qrcode` library) that staff can scan with any scanner app.
- Keyboard shortcuts (P print, R ready, C collected, / search) with a help overlay.
**Acceptance:** staff process a scripted set of 10 jobs faster than with the old screen (record times); the scanner path works with a real handheld scanner.

### U-05 Daily summary, export, audit log viewer (P3, M)
`/admin/reports`: today's jobs, pages, revenue by payment status, by printer; date range; CSV export (`GET /api/admin/reports/daily.csv`, streaming, formula-injection safe: cells starting with `= + - @` are prefixed with `'`). `/admin/activity`: paged audit log with filters (actor, action, date), read-only, Super Admin all centers, Admin own center.
**Acceptance:** end-of-day cash total equals the sum of paid jobs in the CSV; audit filters work with pagination.

### U-06 UPI QR payment (manual verification) and receipts (P3, M)
Settings: `upiId`, `merchantName`. The student payment step can show a QR built from `upi://pay?pa=<upi>&pn=<name>&am=<amount>&tn=<token>&cu=INR` (rendered client-side). Staff still confirm payment manually (no gateway). Receipt page `/student/receipt/[id]` (printable) with token, items, amount, method, time, verifier.
**Acceptance:** QR opens a UPI app with the right amount and note on Android and iOS; receipts match the stored amounts.
*Later option:* an online payment gateway with webhook verification (separate project, needs a merchant account).

### U-07 Notifications: email and web push (P3, M) — optional
Provider abstraction `lib/notify/`: in-app (existing), email via Resend or the college SMTP, web push via the Push API with VAPID keys. User preferences on the profile page; default in-app only. Message text avoids file names and amounts.
**Acceptance:** opt-in flow works; unsubscribed users receive nothing; failures never block job transitions.

### U-08 Accessibility, i18n, installable app (P3, L)
- Accessibility: axe checks in Playwright on every main page; keyboard-only completion of the student flow; visible focus; colour contrast; labels for every control; reduced-motion respected (the site is animation-heavy); target WCAG 2.2 AA. Fix all serious and critical findings.
- i18n: `next-intl` with English, Malayalam and Hindi; language switch on the top bar; all strings from the message catalogue; date/number formats localised (₹, `en-IN`).
- PWA: manifest, icons, offline shell page ("You are offline"), install prompt on mobile. No offline submission.
**Acceptance:** zero serious/critical axe violations on the listed pages; Malayalam UI reviewed by a native reader.

### U-09 Quotas and reports (P3, M)
Optional per-student limits (`dailyPageLimit`, `monthlyPageLimit`) enforced in job creation with a friendly message and remaining balance shown; admin override with reason (logged). Department and semester usage report.
**Acceptance:** limits enforced server-side in a test; overrides appear in the audit log.

### U-10 States, empty and error screens; device QA (P3, M)
Design loading skeletons, empty states (no jobs yet, no printers configured, no center active), and error boundaries for each route group (`error.tsx`, `not-found.tsx`) with a "Report a problem" link that includes the request ID. Test on real devices: a low-end Android phone, an iPhone, a 1366×768 laptop, the print-room PC. Fix layout and performance problems (Lighthouse mobile ≥ 85 performance, ≥ 95 accessibility on the main pages; reduce the heavy landing animations on low-power devices).
**Acceptance:** device matrix table in `docs/UX-FINDINGS.md` with no blocking issues.

**Gate D checklist**
- [ ] Usability findings addressed or consciously deferred (logged).
- [ ] Accessibility and device QA passed.
- [ ] Landing page and documentation describe exactly what exists.

---

## 8. Phase 5 — Pull-based print agent (P3, optional but recommended). Gate E

**Why:** today the admin's browser carries every file to the local daemon. That needs the browser tab open, depends on localhost WebSocket behaviour in each browser, and adds the size and origin problems that D-04 to D-08 work around. A pull-based agent removes all of that: the daemon fetches jobs itself over outbound HTTPS.

### A-01 Design, data model and API contract (M)
Write `docs/design/pull-agent.md` covering:
- **Devices:** `devices/{deviceId}` = `{ locationId, name, tokenHash, createdAt, lastSeenAt, clientVersion, printers: [{name, status, supportsColor}], enabled }`.
- **Job dispatch fields** on `printJobs`: `dispatch: { state: "NONE"|"REQUESTED"|"LEASED"|"SENT"|"FAILED", deviceId, printerId, leaseExpiresAt, attempts, lastError }`.
- **Endpoints** (all authenticated by `Authorization: Bearer <device token>`, rate limited, never usable from a browser session):
  - `POST /api/agent/enroll` (body: enrolment code, machine label) → device token (shown once).
  - `POST /api/agent/heartbeat` (printers, version) → returns settings the agent needs (poll interval, max file size).
  - `GET /api/agent/jobs/next` (long-poll up to 25 s) → `{ jobId, printerWindowsName, copies, duplex, colorMode, paperSize, signedUrl, sha256, bytes }` or 204.
  - `POST /api/agent/jobs/{id}/lease/extend`
  - `POST /api/agent/jobs/{id}/result` (`completed` | `failed` + code).
- **Rules:** a lease lasts 2 minutes and is extended while printing; expired leases return the job to `REQUESTED` (max 3 attempts, then `FAILED`); results are idempotent; the agent only ever sees jobs of its own location; signed URLs expire in 5 minutes if the storage provider supports it (otherwise the agent downloads through an authenticated route).
- **Security:** enrolment codes are single-use and expire in 15 minutes; device tokens are 256-bit random, stored hashed; revocation is immediate; the agent stores its token protected by Windows DPAPI (`CryptProtectData`), not in plain text.
**Acceptance:** design reviewed and approved at Gate D+.

### A-02 Device enrolment and tokens (C4C, M)
Super Admin creates an enrolment code for a location (`POST /api/admin/devices`), sees devices with last-seen time, can rename, disable, or revoke. Token hashing with SHA-256 (tokens are high-entropy), constant-time comparison. Audit log entries for every action.
**Acceptance:** an enrolment code works once and expires; a revoked device is rejected on its next request.

### A-03 Agent runtime (Client, L)
Reuse the D-05/D-06 engine. Loop: heartbeat every 30 s; long-poll `jobs/next`; on a job: verify size and SHA-256, download to `spool\`, print with the engine, report the result; extend lease during long jobs; exponential backoff on network errors; log everything (no content). The local WebSocket server stays for diagnostics only (`hello`, `list_printers`, `test_print`) and is disabled by default in agent mode.
**Acceptance:** works through a reboot, network loss mid-job (job returns to the queue, is retried, and never prints twice thanks to `jobId` idempotency), and printer offline.

### A-04 Web: devices, printer mapping, auto-print (C4C, M)
Admin queue: **Print** now means "request printing on printer P" (`dispatch: REQUESTED`); the row shows live state (Requested → Sending → Sent to printer / Failed with reason) via a status listener. Optional per-printer **Auto-print** (paid jobs at the top of the queue are dispatched automatically, with a per-printer concurrency of 1). Device status badge (online if `lastSeenAt` < 90 s).
**Acceptance:** with the admin tab closed, an auto-print job still prints; disabling the device stops dispatch.

### A-05 Migration, feature flag, retire browser path (both, M)
Feature flag `FEATURE_PULL_AGENT` per location. Both paths coexist for one term. When every center runs the agent for a full term without incident, remove `usePrinter` from the admin flow and the WebSocket server from the client (keep `test_print` in the dashboard).
**Acceptance:** switching a location between paths is possible without data loss; no job is dispatched by both paths.

### A-06 Soak test and rollout (both, M)
72-hour soak on the pilot PC with scripted jobs every 5 minutes, including deliberate failures (paper out, network cut, restart). Then enable center by center.
**Acceptance:** zero duplicate prints, zero lost jobs, lease recovery observed in logs.

**Gate E checklist**
- [ ] Soak passed; incident runbook updated; rollback to the browser path tested.

---

## 9. Cross-cutting

### 9.1 Data migrations (order)
| Order | Script | Purpose | Reversible |
|---|---|---|---|
| 1 | `migrate-001-enums.mjs` | enum values, printers.locationId | yes (backup JSON) |
| 2 | `migrate-002-token-counter.mjs` | create `counters/tokens` | yes |
| 3 | `migrate-003-stats.mjs` | user statistics backfill | yes |
| 4 | `migrate-004-settings-defaults.mjs` | add new settings fields with defaults | yes |
| 5 | `migrate-005-file-refs.mjs` | move legacy `fileUrl` to `fileRef` where recoverable; mark others `fileDeletedAt` | partial |
Rules: staging first; dry-run output reviewed by a human; export taken; production run during low usage; verification script after each.

### 9.2 Environment variables (changes)
| Name | Action |
|---|---|
| `NEXTAUTH_SECRET`, `FIREBASE_ADMIN_*`, `CLOUDINARY_API_SECRET` | rotate (S-01) |
| `BOOTSTRAP_SECRET` | delete (S-02) |
| `NEXT_PUBLIC_PRINTER_WS_URL` | set, default in code (D-07) |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | optional (S-05) |
| `CRON_SECRET` | new (R-06) |
| `SENTRY_DSN` | new, optional (R-04) |
| `ALLOW_DB_CLEAR` | new, unset in production (S-09) |
| `FEATURE_PULL_AGENT` | new (A-05) |

### 9.3 Release and rollback
- Web: Vercel keeps previous deployments; rollback = promote the previous deployment. Data migrations are additive so the previous release still runs on migrated data for one cycle (that is why `normalizeJob` stays for a release).
- Client: keep the previous installer on the software share; rollback = reinstall it. Protocol handshake means either side can be one version behind.
- After each release: run the production smoke test (sign in as a test student in a test center, submit, print a test page, cancel), then delete the test data.

### 9.4 Communication
Before the pilot: a one-page guide for students (how to submit; use PDF), a two-page guide for staff (queue, print, retry, mark ready), and a message template for downtime. Confirm the fallback procedure for internet outages with the print-center staff.

---

## Appendix A — Print protocol v2

Transport: WebSocket, JSON text frames, `ws://127.0.0.1:8765`, origin allow-list. Every frame has `v` (2) and `id` (UUID chosen by the sender). Replies repeat the `id` of the request. Frames larger than the limit close the connection with code 1009 before any parsing.

**Requests (browser → client)**
| `action` | Fields | Reply |
|---|---|---|
| `hello` | `{ webVersion }` | `hello` |
| `list_printers` | | `printers` |
| `print_file` | `jobId`, `printer` (Windows name), `copies` (1–100), `duplex` (`single`\|`duplex`\|`duplexshort`), `colorMode` (`BW`\|`COLOR`), `paper` (`A4`), `file`: `{ encoding: "base64", data, sha256?, bytes }` | `accepted`, then `completed` or `failed` |
| `test_print` | `printer` | `accepted`, then `completed` or `failed` |
| `cancel` | `jobId` | `cancelled` or `failed` (`NOT_CANCELLABLE`) |

**Replies (client → browser)**
```json
{ "v": 2, "id": "<same id>", "type": "hello", "clientVersion": "1.2.0", "protocol": 2,
  "printers": [{ "name": "HP LaserJet 1020", "isDefault": true, "status": "READY" }],
  "capabilities": ["duplex", "color", "test_print"] }

{ "v": 2, "id": "…", "jobId": "…", "type": "accepted" }
{ "v": 2, "id": "…", "jobId": "…", "type": "completed", "spooledAt": "2026-09-21T10:14:03Z" }
{ "v": 2, "id": "…", "jobId": "…", "type": "failed", "code": "PRINTER_NOT_FOUND", "message": "Printer is not installed on this PC." }
```

**Error codes and the message the admin sees**
| Code | Meaning | Admin message |
|---|---|---|
| `BAD_REQUEST` | malformed or missing fields | "The print request was invalid. Reload the page." |
| `UNAUTHORIZED_ORIGIN` | origin not allowed | "This PC's QDoc client is linked to a different website address." |
| `TOO_LARGE` | above the size limit | "File is too large for this client." |
| `NOT_PDF` | data is not a PDF | "File is not a valid PDF." |
| `PRINTER_NOT_FOUND` | no such installed printer | "Printer name does not match a printer on this PC." |
| `PRINTER_OFFLINE` | printer reports offline or error | "Printer is offline or needs attention." |
| `PRINT_FAILED` | print engine returned an error or timed out | "Printing failed. Check the printer and retry." |
| `BUSY` | queue for that printer is full (more than 5 waiting) | "Printer is busy. Try again in a moment." |
| `DUPLICATE` | `jobId` already completed (returns `completed` instead when idempotent) | (none) |

**Compatibility with v1**
A v1 client ignores unknown fields and answers `print_file` with `{ "status": "success" | "error", "message" }`. The web app detects v1 by the absence of `type: "hello"` within 1.5 s and switches to the compatibility path.

**Limits:** 32 MiB per frame; 100 copies; 5 queued jobs per printer; `jobId` idempotency memory 200 entries / 10 minutes.

---

## Appendix B — Canonical types

| Type | Values |
|---|---|
| `Role` | `STUDENT`, `ADMIN`, `SUPER_ADMIN` |
| `UserStatus` | `ACTIVE`, `DISABLED` |
| `JobStatus` | `WAITING`, `PRINTING`, `READY`, `COLLECTED`, `CANCELLED` |
| `PaymentStatus` | `PENDING`, `PAID` |
| `PaymentMethod` | `CASH` (later `QR`) |
| `PrintType` | `SINGLE`, `DOUBLE` |
| `ColorMode` | `BW`, `COLOR` |
| `PaperSize` | `A4` |
| `PrinterStatus` | `ONLINE`, `OFFLINE` |
| Token | `RP` + integer ≥ 1001 |

Job document additions: `fileRef { publicId, bytes, sha256 }`, `pricingSnapshot`, `printLock { by, at }`, `cancelReason`, `fileDeletedAt`, `updatedAt`, `dispatch` (Phase 5).
User additions: `sessionVersion`, `passwordChangedAt`, `stats`, `nameLower`.

---

## Appendix C — Target authorization matrix

`own` = the actor's own record; `loc` = the actor's location; `—` = forbidden.

| Route group | Anonymous | Student | Admin | Super Admin |
|---|---|---|---|---|
| `auth/*` sign-in | yes | yes | yes | yes |
| `auth/change-password` | — | own | own | own |
| `locations`, `settings` (read) | — | yes | yes | yes |
| `upload/sign`, `print-jobs/quote`, `print-jobs/create` | — | yes | — | — |
| `print-jobs/user`, `print-jobs/[id]/status`, `print-jobs/[id]/cancel` | — | own | — | — |
| `notifications/mark-read` | — | own | own | own |
| `admin/queue`, `admin/jobs/[id]` (read) | — | — | loc | all |
| `admin/jobs/[id]/claim|release|start|ready|collect|cancel|payment|unpay|file-url` | — | — | loc | all |
| `admin/students` (list, create, bulk) | — | — | yes | yes |
| `admin/students/[id]` (read, status, reset-password) | — | — | student targets only | any user except self for disable |
| `admin/admins*` | — | — | — | yes |
| `admin/printers*` | — | — | loc | all |
| `admin/locations*` | — | — | — | yes |
| `admin/settings` read | — | — | yes | yes |
| `admin/settings` write | — | — | — | yes |
| `admin/notifications/broadcast` | — | — | students | all |
| `admin/reports*`, `admin/activity` | — | — | loc | all |
| `admin/devices*` (Phase 5) | — | — | — | yes |
| `admin/db/clear`, `admin/migrate-*` | — | — | — | yes (plus re-auth) |
| `agent/*` (Phase 5) | device token only | | | |
| `cron/cleanup` | bearer `CRON_SECRET` only | | | |
| `health` | yes | yes | yes | yes |

Every row must appear in `tests/security/authz-matrix.test.ts` for the six actors: anonymous, student, admin (own location), admin (other location), super admin, disabled user.

---

## Appendix D — Firestore rules target

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /notifications/{id} {
      allow read: if request.auth != null &&
        (resource.data.studentId == request.auth.uid || resource.data.isBroadcast == true);
      allow write: if false;
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```
Client queries must include the same constraints (`where("studentId","==",uid)` or `where("isBroadcast","==",true)`) or Firestore rejects them.

---

## Appendix E — Migration script contract

Every `scripts/migrate-*.mjs`:
1. Reads `--project` (required) and refuses to run when the project ID equals the production ID unless `--confirm-production <projectId>` matches.
2. `--dry-run` is the default; `--apply` performs writes.
3. Prints a summary table (collection, documents scanned, documents changed, by change type).
4. Writes `backup/<script>-<timestamp>.json` with the original values of every touched field before applying.
5. Writes in batches of at most 400 operations and is safe to re-run.
6. Exits non-zero when any document fails, and lists the IDs.
7. A matching `scripts/verify-*.mjs` re-reads and asserts the end state.

---

## Appendix F — Test plan

| Level | Tools | What |
|---|---|---|
| Unit | Vitest, pytest | pricing, queue ordering, state machine, authz helpers, password generator, redirect callback, protocol parsing, command-line builder |
| Integration (API) | Vitest + Firestore emulator | every route × role (matrix), transactions, concurrency (tokens, claim), migrations |
| Rules | `@firebase/rules-unit-testing` | notifications and default deny |
| Component | Testing Library | wizard, print dialog, retry, printer picker |
| End to end | Playwright + mock daemon | student and staff journeys, failure paths |
| Hardware | manual checklist (D-11) | real printers, Windows 10 and 11 |
| Accessibility | axe in Playwright | main pages |
| Load | k6 | R-08 |
| Security | matrix test + manual checklist (Appendix G) | Gate A |

Coverage targets: 85% lines on `lib/domain`, `lib/api`, `lib/services`; every route file exercised by at least one test.

---

## Appendix G — Security review checklist (staging, by a second person)

- [ ] Sign in as student A; try to read, cancel or download student B's job by ID: all denied.
- [ ] As student, call every `/api/admin/*` route: all 403.
- [ ] As Admin (center 1): open a center-2 job, printer, student-only action on an Admin, settings write: all denied.
- [ ] Craft a job-creation request with a foreign `publicId`, huge `copies`, `amount`, `fileUrl`: rejected or ignored.
- [ ] Guess or reuse an asset URL without signature: denied.
- [ ] Ten wrong passwords: locked; error text identical to unknown user.
- [ ] Disable an account; the session dies within 30 seconds.
- [ ] Try `?callbackUrl=` with an external site: stays on the site.
- [ ] Read notifications collection unauthenticated with the public Firebase config: denied.
- [ ] Search the repository and history with gitleaks: clean; old keys rejected by their providers.
- [ ] Response bodies and logs contain no stack traces, passwords, tokens or document data.
- [ ] Headers present (CSP, frame, referrer, content-type).
- [ ] `db/clear` refused without password, phrase and environment permission.

---

## Appendix H — Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Leaked key already abused | medium | high | rotate now; check Firebase audit logs and billing for unknown activity; review data for unexpected writes |
| Cloudinary plan cap below chosen size | medium | medium | check plan; lower `maxFileSizeMB` or move storage (Firebase Storage / S3) |
| SumatraPDF blocked or misbehaves on a PC | low | medium | ShellExecute engine flag; test on each PC model |
| Antivirus flags the unsigned exe | medium | medium | sign; allow-list by hash; avoid UPX |
| Signed download URLs blocked by CORS | medium | low | streaming proxy fallback; Phase 5 removes the issue |
| Firestore cost grows with polling | medium | medium | R-02, R-08, budget alerts |
| Print center has no internet | medium | high | documented paper fallback; consider on-prem cache later |
| Scope creep in Phase 4 | high | medium | gates; each task behind a flag; strict backlog order |
| Single developer availability | medium | high | keep docs and runbooks current; pair on Gate reviews |
| Data protection non-compliance | medium | high | retention policy (S-07), privacy notice, review by the college's data protection lead (DPDP Act 2023) |

---

## Appendix I — Definition of done and pull request checklist

A task is **done** when:
- [ ] Acceptance criteria met and demonstrated (screenshot, log, or test output in the PR).
- [ ] Tests added and passing in CI (unit, plus integration where the task touches routes or data).
- [ ] No new lint, type or audit warnings.
- [ ] Docs updated (`docs/`, API inventory, this tracker).
- [ ] No secret, personal data or document content in code, logs, fixtures or screenshots.
- [ ] Migration (if any) has dry-run output, backup, verify script, and rollback notes.
- [ ] Reviewed by a person other than the author.

Pull request template (`.github/pull_request_template.md`): task ID, summary, screenshots, test evidence, migration notes, rollback plan, checklist above.

---

## Appendix J — Actions only the OWNER can do

| When | Action |
|---|---|
| Before anything else | Rotate the Firebase Admin key, Cloudinary secret and `NEXTAUTH_SECRET` (S-01); check Firebase audit logs and billing for unknown activity |
| Phase 0 | Create staging Firebase project, Cloudinary folder or account, Vercel preview environment; export production Firestore |
| S-01 | Run the history purge and force-push; tell collaborators to re-clone |
| S-02 | Run the read-only audit on production and remove seed or test accounts |
| D-08 | Confirm Cloudinary plan file limit |
| D-10 | Obtain a code-signing certificate or Trusted Signing; or arrange AV allow-listing by hash |
| R-04 | Set up uptime monitoring and budget alerts |
| R-05 | Create backup bucket and scheduler |
| R-07 | Turn on branch protection |
| Before pilot | Choose the pilot center, train staff, print the guides, confirm the internet-outage fallback |