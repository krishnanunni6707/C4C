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
