# Data Privacy & Retention Policy

**Smart Campus Printing System (C4C)**  
*Last updated: October 2026*

This document outlines the privacy practices, data protection safeguards, and retention schedules implemented across the Smart Campus Printing platform.

---

## 1. Information Collected

We adhere to the principle of **data minimisation**—we only collect data that is strictly necessary to authenticate users, process payments, and fulfill print jobs.

### 1.1 Account & Identity Data
- **Student Name**: Used for identification and print job labeling at physical pickup points.
- **Admission Number**: Used as the primary login identifier and campus verification.
- **Department & Semester**: Used for academic grouping and campus statistics.
- **Email & Phone (Optional)**: Provided optionally for communication.
- **Password Hash**: One-way bcrypt hash (cost factor 10). Plain-text passwords are never stored.

### 1.2 Print Job & Upload Data
- **Uploaded Document Files**: PDF and image documents uploaded for printing.
- **File Metadata**: File name, size, MIME type, and exact page count computed server-side.
- **Print Job Preferences**: Color mode (B&W or Color), print style (single or duplex), copies, paper size, and destination printer location.
- **Token Number**: Unique per-job identifier for physical job pickup.

### 1.3 Financial & Payment Data
- **Payment Reference**: Razorpay Order ID and Razorpay Payment ID.
- **Transaction Amount**: Amount in Indian Rupee paise computed strictly on the server.
- *Note: Credit card, debit card, UPI PINs, and banking credentials are never received, processed, or stored on our servers. All financial transactions are securely handled directly by Razorpay.*

---

## 2. Purpose of Data Processing

All collected data is processed for specific, legitimate operational purposes:
1. **Authentication & Access Control**: Verifying student and administrator identities with role-based session controls.
2. **Pricing & Payment Verification**: Server-side verification of payment fulfillment prior to releasing print jobs to the printer queue.
3. **Print Execution & Routing**: Sending documents to local print hardware at the student's chosen campus location.
4. **Notifications**: Sending automated notifications regarding job readiness, printing commencement, or cancellation.
5. **Auditing & Security**: Logging administrative actions in `activityLogs` to prevent abuse.

---

## 3. Access Controls (Who Can See Your Data)

Access to personal data is restricted according to the principle of least privilege:

| User Role | What They Can See |
| :--- | :--- |
| **Student** | Can see only their own account, jobs, and notifications. On the queue screen, other students' jobs are strictly anonymized (only token number, queue position, and status are visible). |
| **Admin** | Can see print jobs assigned to their specific printer location (token number, page count, document settings) to fulfill printing. Admins cannot see student passwords or jobs at other locations. |
| **Super Admin** | Platform maintenance, payment reconciliation, system configuration, and audit logs. |
| **Print Daemon** | Local hardware client running on localhost (`127.0.0.1`) that receives short-lived authenticated print streams over an authenticated WebSocket connection. |

---

## 4. Data Retention Schedules

Data is automatically expired and removed according to the following retention schedules:

| Data Type | Retention Period | Automated Action |
| :--- | :--- | :--- |
| **Uploaded Files (Completed Jobs)** | Max 7 days (or immediately upon collection/cancellation) | Deleted from Cloudinary storage; marked `fileDeletedAt` on job record. |
| **Unconsumed Uploads** | 24 hours | Expired uploads with no associated job are automatically purged from storage. |
| **Notifications** | 30 days | Deleted permanently from database. |
| **Print Job History** | 365 days (1 year) | Records older than 1 year are anonymized (student name, admission number, and file details are permanently scrubbed). |
| **Pending Orders (Unpaid)** | 30 minutes | Expired automatically; cannot be converted into paid jobs. |

---

## 5. Right to Erasure ("Right to be Forgotten")

Students have the right to request deletion of all personal data, print records, and files:
- **Administrative Deletion**: A Super Admin can execute a personal data erasure request via `DELETE /api/admin/students/[id]`.
- **Erasure Scope**: Deletes the student profile, all print jobs, uploaded files from Cloudinary storage, notifications, and pending orders.
- **Audit Record**: The action is recorded in the administrative audit log (`activityLogs`) with timestamp and administrator ID for accountability.

---

## 6. Technical Safeguards

- **Transport Security**: All HTTP communication is encrypted with TLS/HTTPS.
- **Private File Storage**: Files are stored in Cloudinary using `type: "authenticated"`. Raw delivery URLs are never exposed to browser clients; admin downloads use short-lived (≤5 minute) signed URLs streamed through the server.
- **PII Scrubbing**: Server-side loggers automatically redact email addresses, passwords, admission numbers, file URLs, and student names.
- **Client Lockdown**: Direct browser access to Firestore collections is completely denied (`allow read, write: if false`). All data flows through authenticated, rate-limited server API endpoints.
