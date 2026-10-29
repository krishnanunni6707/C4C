# Owner Actions & Manual Setup Guide

This document tracks all manual operational actions required by the repository/infrastructure owner that cannot or should not be automated by code.

---

## 1. Razorpay Webhook Configuration (P-01)
To ensure print jobs are fulfilled even if a student closes their browser tab immediately after payment:
1. Log into your **Razorpay Dashboard** (Live or Test mode, as applicable).
2. Navigate to **Settings** → **Webhooks** → **Add New Webhook**.
3. **Webhook URL**:
   - Production: `https://<your-domain>/api/payment/razorpay/webhook`
   - Staging/Local testing: Use your ngrok or deployed tunnel URL.
4. **Secret**: Generate a secure random string (≥32 chars) and set it as `RAZORPAY_WEBHOOK_SECRET` in your `.env.local` / deployment environment variables. Enter the exact same secret in the Razorpay Webhook Secret field.
5. **Active Events**:
   - `payment.captured`
   - `order.paid`
6. Click **Save Webhook**.

---

## 2. Razorpay API Keys & Environment Variables (P-01, P-02)
Ensure the following variables are set in production:
- `RAZORPAY_KEY_ID`: Live key ID from Razorpay Dashboard (e.g. `rzp_live_...`).
- `RAZORPAY_KEY_SECRET`: Live key secret from Razorpay Dashboard.
- `NEXT_PUBLIC_RAZORPAY_KEY_ID`: Same key ID as above (needed by the client-side checkout modal).
- `RAZORPAY_WEBHOOK_SECRET`: Webhook secret matching the Razorpay dashboard configuration.
- `PAYMENT_TEST_MODE`: Must NOT be set to `"1"` in production. In production builds, simulated payments are permanently disabled and rejected by the server.

---

## 3. Cloudinary Authenticated Storage & Legacy Asset Purge (P-04)

All new uploads are stored with `type: "authenticated"` so they cannot be accessed through public URLs. To secure previously uploaded documents and configure retention:

### 3.1 Changing Existing Public Assets to Authenticated
If you have documents uploaded prior to hardening that must remain accessible for pending jobs:
1. Using the Cloudinary Node CLI or API:
   ```javascript
   const cloudinary = require("cloudinary").v2;
   // For each existing asset in campus-printing/
   await cloudinary.api.update("campus-printing/<studentId>/<fileId>", {
     type: "authenticated",
     resource_type: "raw"
   });
   ```
2. In the **Cloudinary Console**:
   - Go to **Settings** → **Security**.
   - Under **Restricted media types**, ensure raw files in authenticated mode require signed delivery URLs.
   - Under **Strict transformations**, enable URL signature verification.

### 3.2 Purging Legacy Assets Uploaded Prior to Hardening
To permanently purge old files uploaded before private authenticated storage was enforced:
1. In the **Cloudinary Console** → **Media Library**:
   - Navigate to the `campus-printing` folder.
   - Select all files uploaded before the hardening deployment and click **Delete**.
2. Or via Cloudinary Admin API:
   ```javascript
   await cloudinary.api.delete_resources_by_prefix("campus-printing/", {
     resource_type: "raw",
     type: "upload" // targets old public files
   });
   ```

### 3.3 Retention Cleanup Cron Configuration
A protected retention endpoint is available at `POST /api/cron/cleanup`.
1. Generate a strong random token (≥32 chars) and set it as `CRON_SECRET` in your hosting environment (e.g. Vercel Project Settings → Environment Variables).
2. Configure a daily scheduled job:
   - **Vercel Cron**: In `vercel.json`:
     ```json
     {
       "crons": [
         {
           "path": "/api/cron/cleanup",
           "schedule": "0 2 * * *"
         }
       ]
     }
     ```
   - **External Cron Service** (e.g., cron-job.org or GitHub Actions):
     Send a `POST` request to `https://<your-domain>/api/cron/cleanup` with header:
     `Authorization: Bearer <CRON_SECRET>` (or `x-cron-secret: <CRON_SECRET>`).

---

## 4. Manual Refund Processing for Cancelled Paid Jobs (P-11)
When an administrator cancels a print job that has already been paid (`paymentStatus === "PAID"`), the system transitions the job to `CANCELLED` and marks `refundStatus: "REQUIRED"`, noting the reason and timestamp in the job document and audit log.

To issue the refund to the student via Razorpay:
1. Log into your **Razorpay Dashboard** (`https://dashboard.razorpay.com/`).
2. Navigate to **Transactions** → **Payments**.
3. Locate the payment by searching for the `razorpayPaymentId` (found on the print job record) or searching by the student's email/admission number.
4. Click on the payment record and select **Issue Full Refund**.
5. Note the reason (e.g. "Print job cancelled by campus admin — <reason>") in the refund notes.
6. In Firestore or administrative console, locate the `printJobs` document and update:
   - `refundStatus`: `"PROCESSED"`
   - `refundProcessedAt`: Current timestamp
7. The refund is typically credited to the student's original payment method within 5–7 business days.

---

## 5. Local Print Station Daemon Setup & Authentication (P-13)

To ensure secure communication between the staff browser and local campus print hardware:

### 5.1 Running the Hardened Print Daemon
On each administrator print workstation connected to physical printers:
1. Ensure Python 3.10+ and the `websockets` package are installed:
   ```bash
   pip install websockets
   ```
2. Configure environment variables for the station daemon:
   ```bash
   export DAEMON_SECRET="<station-shared-secret>"
   export QDOC_ALLOWED_ORIGINS="https://<your-campus-domain>,http://localhost:3000"
   ```
3. Start the daemon (binds strictly to `127.0.0.1:8765`):
   ```bash
   python scripts/daemon/qdoc_daemon.py
   ```
   *(On Windows print stations, run as a Windows background service or Startup tray executable).*

### 5.2 Configuring the Station Token in the Admin Web App
1. When opening the Admin Queue on a print station computer, enter the station's `DAEMON_SECRET` into the station token settings.
2. The token is stored exclusively in browser session memory (`sessionStorage`) and is sent during the WebSocket connection handshake (`{ action: "auth", token: "..." }`).
3. If an invalid or missing token is detected, the daemon rejects commands with `auth_error` and the web interface displays an authentication warning.

---

## 6. Historical Git Secret Remediation & Key Rotation Plan (P-14)

> [!CAUTION]
> **CRITICAL SECURITY NOTICE:**
> Git log scans revealed that early commits (`e72765c` and `a458dc5`) contained a hard-coded Firebase Admin private key in `scripts/add-student.mjs`. Although subsequent commits removed the hard-coded key from the working tree, the key remains present in the immutable git commit history.
>
> In accordance with safety policies, the automated hardening agent will **NOT** rewrite git history without explicit owner confirmation. The owner MUST execute the following key rotation and history purging procedures.

### Step 1: Rotate Firebase Admin Service Account Key
1. Open the [Google Cloud Console](https://console.cloud.google.com/) or [Firebase Console](https://console.firebase.google.com/).
2. Navigate to **IAM & Admin** → **Service Accounts**.
3. Select the `firebase-adminsdk` service account associated with this project.
4. Click the **Keys** tab.
5. Click **Add Key** → **Create new key** (JSON format) and download the new key.
6. In the list of active keys, locate the key created prior to the baseline date and click **Delete**.
7. Update your production environment variables (`FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY`) with the newly generated key.

### Step 2: Rotate Cloudinary & Razorpay Secrets
1. **Cloudinary**:
   - Go to Cloudinary Console → **Settings** → **Access Keys**.
   - Generate a new API Secret and update `CLOUDINARY_API_SECRET` and `CLOUDINARY_URL` in your hosting provider.
   - Revoke the old API Secret.
2. **Razorpay**:
   - Go to Razorpay Dashboard → **Settings** → **API Keys**.
   - Click **Regenerate Key Secret**. Set the expiry period for the old key to 24 hours.
   - Update `RAZORPAY_KEY_SECRET` in production.
   - Under **Webhooks**, generate a new secret and update `RAZORPAY_WEBHOOK_SECRET`.

### Step 3: Purge Secrets from Git History with `git-filter-repo`
Run the following commands on a dedicated local machine after backing up the repository:
```bash
# 1. Install git-filter-repo (Python tool recommended by Git)
pip install git-filter-repo

# 2. Clone a fresh mirror of the repository
git clone --mirror https://github.com/<your-org>/C4C.git repo-cleanup
cd repo-cleanup

# 3. Purge the historical file containing the hard-coded key across all commits
git filter-repo --path scripts/add-student.mjs --invert-paths

# 4. Force-push the purged history to the remote repository
git push origin --force --all
git push origin --force --tags
```

### Step 4: Invalidate Existing Clones
1. Notify all developers and staff to delete existing local clones and re-clone from the fresh remote.
2. Invalidate any CI/CD runner caches or Docker layer caches.




