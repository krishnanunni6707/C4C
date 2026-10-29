# Smart Campus Printing Platform (C4C & QDoc) — Full System Documentation & Technical Blueprint

> **Notice for LLM / Claude Context Import:**
> This document provides an exhaustive, self-contained technical specification of the **C4C (Smart Campus Printing System)** web application and the **QDocClient (QDoc Local Print Daemon)** desktop application. It details the system architecture, component structures, database models, WebSocket bridge protocols, security boundaries, file structures, development setup, and operational guidelines. Use this file as the primary context reference when assisting with coding, refactoring, feature additions, or debugging for this project.

---

## 1. Executive Summary & Core Purpose

### 1.1 What is C4C / QDoc?
**C4C (Campus Print & Queue Management)** and **QDoc (QDoc Control Engine)** form an end-to-end smart campus printing platform. It replaces outdated, manual printing processes (e.g., USB drive transfers, email attachments, unstructured physical queues) with a digital, secure, and auditable web-and-desktop printing pipeline.

### 1.2 Target Audience & User Roles
1. **Students:** Upload documents (PDFs/Images) via mobile or desktop web UI, customize pages (crop/rotate/reorder via an inline editor), configure print preferences (duplex, copies, color mode), track real-time queue position, and receive digital token slips.
2. **Lab Staff & Administrators:** Manage print queues per campus location, approve/claim/cancel jobs, monitor physical printer device statuses, manage location settings, broadcast system announcements, and inspect audit logs.
3. **Super Administrators:** Create campus locations, configure global system parameters, manage staff access, and control administrative roles.

---

## 2. High-Level Architecture & Technical Stack

The platform is split into two primary repositories working synchronously:
1. `C4C` — The Next.js 14 Web Application (Cloud & Client Web Interface).
2. `QDocClient` — The Python Desktop Print Engine / Windows Tray Daemon (Local Hardware Bridge).

```
 ┌─────────────────────────────────────────────────────────┐
 │               Student / Admin Web Browser               │
 │    Next.js 14 App Router + React + Tailwind + Motion   │
 └─────────────┬─────────────────────────────┬─────────────┘
               │                             │
    HTTPS / API Calls (Next.js)      Local WebSocket (ws://127.0.0.1:8765)
               │                             │
               ▼                             ▼
 ┌───────────────────────────┐   ┌───────────────────────────┐
 │ Cloud Backend Services    │   │  QDoc Local Print Daemon  │
 │ • Firebase Firestore      │   │  (Python + win32print)    │
 │ • Firebase Auth / NextAuth│   │  • System Tray App        │
 │ • Cloudinary (PDF Storage)│   │  • License & Origin Lock  │
 └───────────────────────────┘   └─────────────┬─────────────┘
                                               │
                                       OS Print Spooler
                                               │
                                               ▼
                                 ┌───────────────────────────┐
                                 │ Physical Campus Printers  │
                                 └───────────────────────────┘
```

### 2.1 Technical Stack Matrix

| Layer | Technology / Library | Purpose / Usage |
|---|---|---|
| **Web Framework** | Next.js 14 (App Router) | Server-side rendering, API route handlers, layout management |
| **Language** | TypeScript (Strict) | End-to-end type safety for Web App; Python 3.10+ for Daemon |
| **Styling & UI** | Tailwind CSS + Framer Motion | Modern dark-mode glassmorphism design system & micro-animations |
| **Auth & Sessions** | NextAuth.js v4 + Firebase Auth | Role-based authentication (`STUDENT`, `ADMIN`, `SUPER_ADMIN`), JWT sessions |
| **Database** | Firebase Firestore (v10) | NoSQL document storage for users, jobs, printers, logs, settings |
| **Cloud Storage** | Cloudinary | Authenticated PDF file uploads and secure asset delivery |
| **PDF Tools (Web)** | `pdf-lib` & `pdfjs-dist` | Page count validation, server PDF inspection, client inline PDF editing |
| **Desktop Engine** | Python 3.10+ (PyQt / Tkinter / `pystray`) | Windows tray application managing local printer interactions |
| **Local WS Bridge** | `websockets` (Asyncio) | High-performance JSON RPC bridge between Browser and Local Printer |
| **Print Spooler** | `win32print`, `win32api`, SumatraPDF | Direct Windows GDI spooling & SumatraPDF silent CLI execution |
| **Packaging** | PyInstaller + Inno Setup (`.iss`) | Single `.exe` compilation and Windows setup installer packaging |
| **Testing** | Vitest, `@testing-library/react`, Playwright | Unit tests, Firestore emulator tests, and End-to-End browser tests |

---

## 3. Detailed System Features & User Experience

### 3.1 Student Experience (`/student`)
* **Responsive Layouts:** Separate optimized views for mobile devices (`MobileStudentView.tsx`) and desktops (`DesktopStudentView.tsx`), automatically selected via viewport width.
* **Document Upload & Client-Side Editor (`PdfEditor.tsx`):**
  * Supports PDF, PNG, JPG uploads.
  * Allows students to crop, rotate, reorder, and select specific page ranges prior to uploading.
  * Real-time PDF preview powered by `pdfjs-dist`.
* **Print Preference Customization:**
  * Select target printer location.
  * Print Type: Single-sided (`SINGLE`) or Double-sided (`DOUBLE`).
  * Color Mode: Black & White (`BW`) or Color (`COLOR`).
  * Number of copies.
* **Dynamic Pricing Engine:** Calculates estimated cost server-side before job submission.
* **Real-time Queue Tracking & Digital Token Slip:** Displays active job status (`WAITING`, `PRINTING`, `READY`, `COLLECTED`, `CANCELLED`), token number, estimated wait time, and print location details.

### 3.2 Local Print Daemon (`QDocClient`)
* **Silent Background Operation:** Runs in the Windows System Tray without taking up taskbar space.
* **Direct Hardware Spooling:** Enumerates installed Windows printers (`win32print.EnumPrinters`) and dispatches raw base64 PDF payloads directly to the target printer.
* **Security & Tamper Protection:**
  * **Station Token Handshake:** Requires `{ "action": "auth", "token": "..." }` handshake matching `DAEMON_SECRET` before processing print commands.
  * **Domain Origin Whitelisting:** Rejects WebSocket connections if the HTTP `Origin` header does not match the configured web domain.
  * **Payload Validation:** Capped at 32 MiB, enforces 1–99 copies, and verifies PDF magic bytes (`%PDF-`) to reject disguised non-PDF binaries.

### 3.3 Admin & Lab Staff Management (`/admin`)
* **Queue Control Dashboard:** Filter jobs by status or location, claim job locks to prevent duplicate printing, initiate local silent printing, and mark jobs as `READY` or `COLLECTED`.
* **Printer & Location Setup:** Add/edit printer profiles, set default printers, configure hardware capabilities (e.g., duplex support, color support, Windows printer name mapping).
* **System Broadcast Panel:** Send instant notifications or broadcast messages to all connected campus users.
* **Audit Logs:** Full audit log history for system lifecycle events, failed login attempts, and administrative actions.

---

## 4. WebSocket Communication Protocol (Browser <-> QDoc Client)

The Web Application connects to the local daemon via WebSocket (`ws://127.0.0.1:8765` in dev; configurable via `NEXT_PUBLIC_PRINTER_WS_URL`).

```
Browser (Next.js App) ───────── WebSocket (ws://127.0.0.1:8765) ─────────► QDoc Python Daemon
```

### 4.1 Message Schemas

#### Action: Discover Installed Printers
* **Browser Request:**
  ```json
  {
    "action": "get_printers"
  }
  ```
* **Daemon Response:**
  ```json
  {
    "status": "ready",
    "printers": ["HP LaserJet Pro M404", "EPSON L3150 Series", "Microsoft Print to PDF"],
    "default": "HP LaserJet Pro M404"
  }
  ```

#### Action: Print Document Payload
* **Browser Request:**
  ```json
  {
    "action": "print_file",
    "target_printer": "HP LaserJet Pro M404",
    "base64_data": "JVBERi0xLj... [Base64 Encoded PDF]",
    "options": {
      "copies": 2,
      "duplex": "duplex"  // Options: "single", "duplex", "duplexshort"
    }
  }
  ```
* **Daemon Response (Success):**
  ```json
  {
    "status": "success",
    "message": "Document submitted to printer stack"
  }
  ```
* **Daemon Response (Error):**
  ```json
  {
    "status": "error",
    "message": "Local validation check or print execution failed"
  }
  ```

---

## 5. File & Directory Structure

```
d:/C4C/
├── C4C/                                 # Next.js 14 Web Application Root
│   ├── app/                             # Next.js App Router
│   │   ├── (auth)/                      # Authentication pages (login, register)
│   │   ├── admin/                       # Admin Dashboard (/admin, /admin/queue, /admin/printers)
│   │   ├── api/                         # Next.js Server Route Handlers
│   │   │   ├── admin/                   # Admin endpoints (printers, users, settings, queue)
│   │   │   ├── auth/                    # NextAuth & custom firebase token routes
│   │   │   ├── locations/               # Location CRUD
│   │   │   ├── notifications/           # User & broadcast notifications
│   │   │   ├── payment/                 # Payment & pricing calculation endpoints
│   │   │   ├── print-jobs/              # Print job CRUD & quote calculations
│   │   │   └── upload/                  # Authenticated file upload handler
│   │   ├── creator/                     # Creator / Developer view
│   │   ├── student/                     # Student Portal (/student/upload, /student/queue)
│   │   ├── globals.css                  # Global Tailwind CSS and CSS variables
│   │   ├── layout.tsx                   # Root HTML layout & NextAuth Provider wrapper
│   │   └── page.tsx                     # Main Landing Page / Portal Entry
│   ├── components/                      # React UI Components
│   │   ├── admin/                       # Admin Sidebar, Navbar, BroadcastPanel, JobActions
│   │   ├── student/                     # DesktopStudentView, MobileStudentView, PdfEditor
│   │   └── ui/                          # PrinterPanel, NotificationBell, Button, Input
│   ├── contexts/                        # React Contexts (AuthContext, NotificationContext)
│   ├── docs/                            # Internal engineering docs & specifications
│   ├── lib/                             # Core utilities and business logic
│   │   ├── api/                         # Authorization helpers (authz.ts), errors, validation
│   │   ├── firebase/                    # Firebase client & admin SDK initializations
│   │   ├── firestore/                   # Typed Firestore collections & queries
│   │   ├── hooks/                       # Custom hooks (usePrinter.ts)
│   │   ├── services/                    # Print service business logic (print-service.ts)
│   │   ├── auth.ts                      # NextAuth configuration
│   │   └── printerConfig.ts             # WebSocket URL & reconnect configuration
│   ├── public/                          # Static assets (images, icons)
│   ├── scripts/                         # Maintenance, migration, and dev seed scripts
│   ├── tests/                           # Vitest & Playwright test suites
│   ├── firestore.rules                  # Security rules for Firestore collections
│   ├── next.config.mjs                  # Next.js configuration (CSP headers, dynamic imports)
│   ├── package.json                     # Node.js dependencies and npm scripts
│   ├── tailwind.config.ts               # Tailwind design system configuration
│   └── tsconfig.json                    # TypeScript strict mode configuration
│
└── QDocClient/                          # Python Desktop Daemon Root
    ├── build/                           # PyInstaller build artifacts
    ├── dist/                            # Built executable destination (qdoc_client.exe)
    ├── build.bat                        # Batch script for automated PyInstaller compilation
    ├── logo.png                         # Desktop application icon and tray graphic
    ├── qdoc_client.py                   # Core Python application logic (Tray + WS Server + win32print)
    ├── qdoc_client.spec                 # PyInstaller specification configuration
    ├── qdoc_config.json                 # Persisted local configuration (ALLOWED_ORIGIN)
    ├── QDC.iss / setup.iss              # Inno Setup scripts for generating Windows setup installer
    └── README.md                        # Desktop Engine setup and operational guide
```

---

## 6. Data Models & Database Schemas (Firestore)

### 6.1 Collection: `users`
Document ID: `userId`
```typescript
interface User {
  id: string;
  admissionNumber: string; // Used for student login
  name: string;
  email: string;
  role: "STUDENT" | "ADMIN" | "SUPER_ADMIN";
  locationId: string | null; // Null for students or global super admins
  status: "ACTIVE" | "DISABLED";
  firstLogin: boolean;
  passwordHash: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 6.2 Collection: `print-jobs`
Document ID: `jobId`
```typescript
interface PrintJob {
  id: string;
  tokenNumber: number; // Incrementing daily/global sequential counter
  studentId: string;
  studentName: string;
  fileName: string;
  fileRef: {
    publicId: string; // Cloudinary authenticated asset ID
    bytes: number;
    sha256: string;
  };
  totalPages: number;
  copies: number;
  printType: "SINGLE" | "DOUBLE";
  colorMode: "BW" | "COLOR";
  paperSize: "A4";
  locationId: string;
  amount: number; // Calculated price in INR
  status: "WAITING" | "PRINTING" | "READY" | "COLLECTED" | "CANCELLED";
  paymentStatus: "PENDING" | "PAID";
  paymentMethod: "RAZORPAY";
  printLock?: {
    by: string; // Admin User ID holding the print lock
    at: Timestamp;
  };
  cancelReason?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 6.3 Collection: `printers`
Document ID: `printerId`
```typescript
interface Printer {
  id: string;
  name: string; // Display name
  windowsName: string; // Exact printer name in Windows OS driver spooler
  locationId: string;
  supportsColor: boolean;
  supportsDuplex: boolean;
  status: "ONLINE" | "OFFLINE" | "ERROR" | "PAPER_OUT";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 6.4 Collection: `settings`
Document Path: `settings/systemSettings`
```typescript
interface SystemSettings {
  singleSidedPrice: number; // e.g. 2.00 INR
  doubleSidedPrice: number; // e.g. 3.00 INR
  colorPriceMultiplier: number;
  maxCopies: number; // e.g. 50
  maxPagesPerJob: number; // e.g. 300
  maxFileSizeMB: number; // e.g. 10
  fileRetentionHours: number; // e.g. 48
  colorEnabled: boolean;
}
```

---

## 7. Security Architecture & Controls

1. **Centralized Authorization (`lib/api/authz.ts`):** Every API endpoint resolves the caller's session using `requireActor()`. Requests are checked against role boundaries (`requireRole`), location boundaries (`requireLocation`), and ownership rules before reading or writing Firestore.
2. **Rate Limiting (`lib/security/rate-limit.ts`):** Auth endpoints enforce 5 failed attempts per user per 15 minutes, and 30 requests per IP per 15 minutes to prevent brute-force attacks.
3. **SSRF & File Validation Protection:** File uploads are processed through signed Cloudinary upload tokens. PDF headers (`%PDF-`) and page counts are strictly validated on the server via `pdf-lib` before a job document is created.
4. **WebSocket Domain Isolation:** The Python daemon inspects the `Origin` header during the WebSocket handshake. If the domain does not match `ALLOWED_ORIGIN`, the connection is closed immediately with code `1008 (Policy Violation)`.
5. **Local Executive Tamper Protection:** The Python client verifies the presence and Fernet decryption of `license.key` / `.unni` on launch to ensure binary assets have not been modified or un-authorizedly redistributed.

---

## 8. Setup, Configuration & Development Guide

### 8.1 Prerequisites
* **Node.js:** `>= 18.17`
* **Python:** `>= 3.10` (for `QDocClient` development or executable building)
* **Firebase CLI:** Installed globally (`npm install -g firebase-tools`)
* **Inno Setup Compiler:** Required if building the Windows setup installer (`.iss`)

### 8.2 Environment Variables (`C4C/.env.local`)
Create `.env.local` inside the `C4C` directory:
```env
# NextAuth Security
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_generated_base64_secret

# WebSocket Daemon Target
NEXTPUBLIC_PRINTER_WS_URL=ws://127.0.0.1:8765

# Firebase Credentials
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-firebase-project-id

# Cloudinary Integration
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### 8.3 Running the Web Application (`C4C`)
```bash
# Navigate to web app folder
cd C4C

# Install dependencies
npm install

# Start local development server (HTTP 3000)
npm run dev

# Start local Firebase Firestore Emulator (Port 8080)
npm run emu

# Run Vitest test suite
npm run test

# Build production bundle
npm run build
```

### 8.4 Running & Packaging the Local Daemon (`QDocClient`)
```bash
# Navigate to QDocClient folder
cd QDocClient

# Create and activate Python virtual environment
python -m venv qdoc_win_env
qdoc_win_env\Scripts\activate

# Install Python dependencies
pip install websockets pystray pillow pywin32 wmi cryptography

# Run daemon directly
python qdoc_client.py

# Build single EXE using PyInstaller
build.bat
# Output binary: dist/qdoc_client.exe
```

---

## 9. Developer Guidelines & Context Rules for LLM / Claude

When continuing development, debugging, or extending functionality for this codebase in another chat session, strictly adhere to the following rules:

1. **Strict TypeScript & Zod Validation:** Never use `any` in new web code. All incoming API request bodies must be validated using `zod` schemas.
2. **Centralized API Helper Pattern:** Wrap all API route handlers with `handleRoute()` from `lib/api/errors.ts` and use `requireActor()` from `lib/api/authz.ts`.
3. **No Direct UI State Mutations:** Maintain transient state inside local React hooks or context components before dispatching server updates.
4. **Canonical Enums:** Use canonical enums from `lib/domain/enums.ts` (`SINGLE`/`DOUBLE`, `BW`/`COLOR`, `WAITING`/`PRINTING`/`READY`/`COLLECTED`/`CANCELLED`) instead of raw string literals.
5. **WebSocket Error Handling:** Always handle WebSocket disconnection states gracefully in UI components via `usePrinter.ts`. Never assume physical hardware is connected without verifying `connectionStatus`.
6. **Design Aesthetics:** Maintain the dark-mode glassmorphism visual theme with purple accent highlights (`hsl(260, 80%, 60%)`), clean typography (Inter / Geist), and micro-animations via Framer Motion.

---
*Documentation compiled and validated for C4C & QDoc Control Engine codebase.*
