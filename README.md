# Smart Campus Printing System

## Overview
A modern, production‑ready printing management platform built with **Next.js 14** and **TypeScript**. It provides a seamless experience for students to submit print jobs, monitor their status, and for administrators to manage printers and queues. The system originally included a Razorpay payment integration, which has now been removed to simplify the workflow – students no longer need to pay through the web UI.

## Architecture
- **Frontend** – Next.js 14 (App Router) with React components.
  - `components/student/MobileStudentView.tsx` – responsive, glass‑morphism UI for mobile devices.
  - `components/student/DesktopStudentView.tsx` – full‑width desktop layout.
  - `app/student/page.tsx` – router entry that switches between mobile and desktop views based on viewport width.
  - Additional pages: upload, print‑preferences, queue, etc.
- **Backend API** – Server‑side route handlers under `app/api/...`.
  - `app/api/upload/route.ts` – handles file uploads.
  - `app/api/payment/create-order/route.ts` – **Razorpay** integration (now disabled; the handler retains a safe dynamic initialization pattern).
  - Other CRUD routes for managing printers, jobs, and user preferences.
- **Data Layer** – In‑memory mock data for demonstration; easily replace with a real database (e.g., Prisma, MongoDB) in production.

## End‑to‑End Flow
1. **Student Login** – The user authenticates (placeholder auth for now).
2. **Upload Print Job** – On the **Upload** page (`/student/upload`) the student selects a PDF/file and submits it. The file is stored via the `upload` API.
3. **Job Creation** – The uploaded file creates a `PrintJob` object (id, filename, token number, status).
4. **Job Queue** – The job appears in the **Queue** page (`/student/queue`) where students can see pending jobs.
5. **Print Preferences** – Using the **Print Preferences** page (`/student/print-preferences`) the student can set duplex, colour, and other options, which are saved to the job object.
6. **Desktop / Mobile UI** – The main **Student** page (`/student`) shows:
   - Active jobs (currently printing).
   - Available printers (library, lab, admin block).
   - Navigation bar (home, queue, upload, preferences).
   - The UI automatically switches to `MobileStudentView` for screens < 768 px and to `DesktopStudentView` otherwise.
7. **Payment (Removed)** – Previously a payment step using Razorpay was required. The integration code has been refactored to lazy‑load Razorpay only if environment variables are present, and the UI no longer prompts for payment.
8. **Job Completion** – Once a job finishes (simulated in the demo), the status updates and the student sees a **Completed** badge.
9. **Admin Actions (Future)** – Administrators can add/remove printers, approve jobs, and view analytics (not shipped yet).

## Local Print Daemon — WebSocket Integration

The frontend connects directly to a **locally running Python print service** on the client machine via WebSocket. This enables physical printer control without routing print data through the cloud.

### How it works

```
Browser (Next.js) ──WebSocket──► Python Daemon (localhost:8765)
                                        │
                                        └──► Physical Printer (via OS print API)
```

1. On page load, `usePrinter` opens a WebSocket to `ws://127.0.0.1:8765`.
2. It immediately sends `{ "action": "get_printers" }` to discover available printers.
3. The daemon responds with the printer list and default; these populate the UI dropdown.
4. When the user clicks **Print**, `handlePrint(base64Pdf)` sends a `print_file` job payload.
5. The daemon confirms with `{ "status": "success" | "error", "message": "..." }`.
6. If the connection drops, the hook auto-reconnects every **5 seconds**.

### Files

| File | Role |
|---|---|
| `lib/printerConfig.ts` | WS URL and reconnect config (single place to change for prod) |
| `lib/hooks/usePrinter.ts` | Custom hook — WS lifecycle, settings state, print dispatch |
| `components/ui/PrinterPanel.tsx` | Drop-in dark UI panel: status badge, printer picker, copies, duplex |

### Environment variable

The WebSocket URL is driven by an env var so you can switch without touching code:

```env
# .env.local  (development — default if var is absent)
NEXT_PUBLIC_PRINTER_WS_URL=ws://127.0.0.1:8765

# .env.production.local  (production)
NEXT_PUBLIC_PRINTER_WS_URL=wss://local.qdoc.edu:8765
```

### Usage — drop the panel into any client page

```tsx
import { PrinterPanel } from "@/components/ui/PrinterPanel";

// Option A — panel owns the Print button
<PrinterPanel getBase64Pdf={() => myBase64PdfString} />

// Option B — drive it imperatively via a ref
const ref = useRef<PrinterPanelHandle>(null);
ref.current?.print(myBase64PdfString);
<PrinterPanel ref={ref} />

// Option C — hook only, bring your own UI
import { usePrinter } from "@/lib/hooks/usePrinter";
const { connectionStatus, printers, handlePrint } = usePrinter();
```

### Python daemon message contract

| Direction | Payload |
|---|---|
| → daemon | `{ "action": "get_printers" }` |
| ← daemon | `{ "status": "ready", "printers": [...], "default": "..." }` |
| → daemon | `{ "action": "print_file", "target_printer": "...", "base64_data": "...", "options": { "copies": 1, "duplex": "single" } }` |
| ← daemon | `{ "status": "success" \| "error", "message": "..." }` |

## Setup & Development
```bash
# Clone the repo
git clone <repo-url>
cd C4C

# Install dependencies
npm install

# Copy the example env and fill in values
cp .env.example .env.local
# NEXT_PUBLIC_PRINTER_WS_URL=ws://127.0.0.1:8765   ← local daemon
# NEXTAUTH_SECRET=your_secret
# FIREBASE_* credentials

# Run the development server
npm run dev   # http://localhost:3000
```

## Building for Production
```bash
npm run build   # Generates an optimized production bundle
npm start       # Starts the production server
```

## Key Files & Directories
- `app/student/` – Next.js page routes for the student experience.
- `components/student/` – UI components (`MobileStudentView.tsx`, `DesktopStudentView.tsx`).
- `components/ui/PrinterPanel.tsx` – WebSocket-connected printer control panel.
- `app/api/` – API route handlers (`upload`, `payment/create-order`).
- `lib/hooks/usePrinter.ts` – Core WebSocket + printer settings hook.
- `lib/printerConfig.ts` – Daemon connection configuration.
- `public/` – Static assets (images, icons).

## Design & Aesthetics
The UI follows a premium **dark‑mode** theme with:
- HSL‑based purple accent colour (`hsl(260, 80%, 60%)`).
- Glass‑morphism cards with subtle blur and transparency.
- Micro‑animations for button hover, navigation transitions, and job status updates.
- Responsive layout using Tailwind utility classes.

## Future Work
- Connect to a real database and authentication system.
- Implement admin dashboard for printer management.
- Add email/SMS notifications on job completion.
- Integrate analytics for printing usage.

---
*This README was generated and updated automatically to reflect the full application flow and current feature set.*
