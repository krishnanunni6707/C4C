# QDoc — Smart Campus Printing System

## Overview

**QDoc** is a production-ready campus printing platform built with **Next.js 14**, **TypeScript**, **Firebase (Firestore + Storage)**, and **Razorpay** for payments. Students upload documents, configure print settings (including B&W or Color), pay securely via Razorpay, and receive a queue token. Administrators manage the print queue and dispatch jobs to physical printers via a local WebSocket daemon.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Auth | NextAuth.js (Credentials — Firestore-backed) |
| Database | Firebase Firestore |
| File Storage | Cloudinary |
| Payments | Razorpay (UPI, Cards, NetBanking) |
| Printer Comms | Python WebSocket Daemon (localhost:8765) |
| Styling | Tailwind CSS |

---

## Architecture

```
Browser (Student / Admin)
        │
        ├── /student ──► MobileStudentView.tsx  (< 768px)
        │             └─► DesktopStudentView.tsx (≥ 768px)
        │
        ├── /admin/queue ──► Print Queue Management
        │
        └── /api/... ──► Next.js API Routes
                          ├── /api/payment/razorpay/create-order
                          ├── /api/payment/razorpay/verify
                          ├── /api/upload
                          ├── /api/print-jobs/create
                          ├── /api/admin/queue
                          └── /api/admin/jobs/[id]/...

        Admin Browser ──WebSocket──► Python Daemon (localhost:8765)
                                             │
                                             └──► Physical Printer (OS print API)
```

---

## End-to-End Student Flow

1. **Login** — Student authenticates with Admission Number + Password (Firestore-backed).
2. **Upload** — Upload PDF/DOCX/PPTX. Multi-file merge and page-level editing supported.
3. **Edit PDF** — Reorder, delete, or merge pages using the embedded PDF editor.
4. **Print Settings** — Configure:
   - **Printer Hub Location** (campus-managed locations from Firestore)
   - **Copies**
   - **Color Mode** — **B&W** or **Color** (different pricing applies)
   - **Layout** — Single Sided or Duplex (Double Sided)
   - **Paper Size** — A4 or Letter
5. **Payment** — Razorpay modal opens. Student pays using UPI, Card, or NetBanking.
6. **Dispatch** — On payment confirmation, print job is created in Firestore with `PAID` status and a sequential queue token.
7. **Track** — Student tracks job status (WAITING → PRINTING → READY → COLLECTED) in real time.

---

## Admin Flow

1. **Login** as ADMIN or SUPER_ADMIN.
2. **Queue Page** (`/admin/queue`) shows all active print jobs.
3. Admin selects a printer from the dropdown and clicks **Print** — only PAID jobs can be printed.
4. The job is sent to the local Python daemon via WebSocket, which dispatches it to the physical printer.
5. Admin marks the job **Ready** → student is notified to collect.
6. Admin marks the job **Collected** to close the workflow.

> **Note:** The "Mark Unpaid" action has been removed. All print jobs require upfront payment through Razorpay before they appear in the print queue.

---

## Pricing Model

Pricing is configurable per-location from the admin settings (`/api/settings`):

| Mode | Single Sided | Duplex |
|---|---|---|
| B&W | ₹2 / sheet | ₹3 / sheet |
| Color | ₹5 / sheet | ₹8 / sheet |

Duplex reduces sheet count: 2 pages per sheet (ceiling for odd page counts).

---

## Local Print Daemon — WebSocket Integration

The admin browser connects directly to a locally running Python print service via WebSocket. This enables physical printer control without routing print data through the cloud.

### How it works

```
Admin Browser (Next.js) ──WebSocket──► Python Daemon (localhost:8765)
                                               │
                                               └──► Physical Printer (via OS print API)
```

1. On page load, `usePrinter` opens a WebSocket to `ws://127.0.0.1:8765`.
2. Sends `{ "action": "get_printers" }` to discover available printers.
3. Daemon responds with the printer list — these populate the admin queue dropdown.
4. On **Print** click, `handlePrint(base64Pdf, options)` sends a `print_file` payload.
5. Daemon responds with `{ "status": "success" | "error", "message": "..." }`.
6. Connection auto-reconnects every **5 seconds** on drop.

### WebSocket Message Contract

| Direction | Payload |
|---|---|
| → daemon | `{ "action": "get_printers" }` |
| ← daemon | `{ "status": "ready", "printers": [...], "default": "..." }` |
| → daemon | `{ "action": "print_file", "target_printer": "...", "base64_data": "...", "options": { "copies": 1, "duplex": "single" } }` |
| ← daemon | `{ "status": "success" \| "error", "message": "..." }` |

### Key Files

| File | Role |
|---|---|
| `lib/printerConfig.ts` | WS URL and reconnect config |
| `lib/hooks/usePrinter.ts` | WS lifecycle, settings state, print dispatch |
| `components/ui/PrinterPanel.tsx` | Drop-in UI panel for printer control |

---

## Setup & Development

```bash
# Clone the repo
git clone <repo-url>
cd C4C

# Install dependencies
npm install

# Copy the example env file and fill in all values
cp .env.example .env.local
```

### Required Environment Variables

```env
# NextAuth
NEXTAUTH_URL=http://localhost:3000          # Set to your domain in production
NEXTAUTH_SECRET=<run: openssl rand -base64 32>

# Firebase Client (browser-safe)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=

# Firebase Admin (server-only)
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_URL=

# Razorpay
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
NEXT_PUBLIC_RAZORPAY_KEY_ID=   # same value as RAZORPAY_KEY_ID
RAZORPAY_WEBHOOK_SECRET=       # from Razorpay Dashboard → Settings → Webhooks

# Bootstrap (one-time use — clear after first admin creation)
BOOTSTRAP_SECRET=
```

### Create the Super Admin

```powershell
# Set your desired super admin password, then run:
$env:SUPER_ADMIN_PASSWORD="YourStrongPassword!"
node --env-file=.env.local scripts/create-super-admin.mjs
```

Credentials: Admission Number `SAD001`, password = whatever you set as `SUPER_ADMIN_PASSWORD`.

### Run Development Server

```bash
npm run dev   # http://localhost:3000
```

---

## Building for Production

```bash
npm run build   # Optimized production bundle
npm start       # Start production server
```

Before deploying, ensure:
- `NEXTAUTH_URL` is set to your real domain (e.g., `https://qdoc.yourdomain.com`)
- `NEXTAUTH_SECRET` is a strong random value
- All Firebase, Cloudinary, and Razorpay keys are set in your hosting environment

---

## Key Files & Directories

```
app/
  student/          Student-facing pages (portal, token slip)
  admin/            Admin dashboard (queue, settings, printers)
  api/              API routes (upload, payment, print-jobs, admin)

components/
  student/
    DesktopStudentView.tsx   Full-width desktop UI (wizard: Upload → Edit → Settings → Payment)
    MobileStudentView.tsx    Mobile-optimized UI (bottom nav, dark mode support)
    RazorpayPaymentModal.tsx Razorpay checkout integration
    PdfEditor.tsx            In-browser PDF page editor
  ui/
    PrinterPanel.tsx         WebSocket-connected printer control panel
    NotificationBell.tsx     Real-time notification indicator

lib/
  auth.ts                   NextAuth config (Firestore-only, no dev backdoors)
  firebase/
    admin.ts                Firebase Admin SDK (server-only, emulator-aware)
    client.ts               Firebase Client SDK (validates all env vars at startup)
  firestore/                Firestore data access layer
  hooks/
    usePrinter.ts           Core WebSocket + printer hook
    useDraftPersistence.ts  Draft save/restore for print wizard

scripts/
  create-super-admin.mjs    One-time script to seed the Super Admin account
  add-student.mjs           Script to add individual students (all params via env vars)
```

---

## Security Notes

- **No hardcoded credentials** — all secrets are read from environment variables only.
- **No dev backdoors** — the auto-provision block for test users (`S1001`, `ADMIN001`, etc.) has been removed. All users must exist in Firestore.
- **Payment is mandatory** — jobs cannot be dispatched without a verified Razorpay payment. The "Mark Unpaid" admin action has been removed.
- **Signature verification is enforced** — the `/api/payment/razorpay/verify` route returns 503 if `RAZORPAY_KEY_SECRET` is unset; it never skips the HMAC check.
- **Seed endpoint is protected** — `/api/seed-users` requires an `X-Bootstrap-Secret` header matching `BOOTSTRAP_SECRET`.

---

*README last updated: October 2026 — reflects current production state.*
