/**
 * Firestore collection constants and TypeScript interfaces
 */

import { Timestamp } from "firebase-admin/firestore";

// ─── Collection name constants ────────────────────────────────────────────────

export const COLLECTIONS = {
  USERS: "users",
  PRINT_JOBS: "printJobs",
  TRANSACTIONS: "transactions",
  SETTINGS: "settings",
  ACTIVITY_LOGS: "activityLogs",
  PRINTERS: "printers",
  LOCATIONS: "locations",
  NOTIFICATIONS: "notifications",
  PENDING_ORDERS: "pendingOrders",
  UPLOADS: "uploads",
  COUNTERS: "counters",
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];

// ─── Role types ───────────────────────────────────────────────────────────────

export type UserRole = "STUDENT" | "ADMIN" | "SUPER_ADMIN";

// ─── 1. users ─────────────────────────────────────────────────────────────────

export interface FirestoreUser {
  id: string;
  admissionNumber: string;
  name: string;
  department: string;
  semester: number;
  email?: string;
  phone?: string;
  passwordHash: string;
  role: UserRole;
  /** For ADMIN role: the location this admin manages. Null for SUPER_ADMIN and STUDENT. */
  locationId?: string | null;
  firstLogin: boolean;
  status: "ACTIVE" | "DISABLED";
  createdAt: Timestamp;
}

// ─── 2. printJobs ─────────────────────────────────────────────────────────────

export type PrintJobStatus =
  | "WAITING"
  | "PRINTING"
  | "READY"
  | "COLLECTED"
  | "CANCELLED";

export type ColorMode = "BW" | "COLOR";
export type PrintType = "SINGLE" | "DOUBLE";
export type PaperSize = "A4";
export type PaymentMethod = "RAZORPAY";
export type PaymentStatus = "PENDING" | "PAID";

export interface FirestorePrintJob {
  id: string;
  tokenNumber: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  fileName: string;
  fileUrl: string;
  totalPages: number;
  copies: number;
  colorMode: ColorMode;
  printType: PrintType;
  paperSize: PaperSize;
  amount: number;
  amountPaise?: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: PrintJobStatus;
  /** Location this job was submitted to (required for all new jobs). */
  locationId: string;
  /** Denormalized location name for display without extra lookups. */
  locationName: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  uploadId?: string;
  fileDeletedAt?: Timestamp | null;
  createdAt: Timestamp;
  cancelledAt?: Timestamp;
}

// ─── 3. transactions ──────────────────────────────────────────────────────────

export interface FirestoreTransaction {
  id: string;
  printJobId: string;
  studentId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  verifiedBy?: string;
  verifiedAt?: Timestamp;
  createdAt: Timestamp;
}

// ─── 4. settings ──────────────────────────────────────────────────────────────

export interface FirestoreSettings {
  bwPricePerSheet: number;
  colorPricePerSheet: number;
  tokenCharge: number;
  qrCodeImageUrl: string;
  upiId: string;
  merchantName?: string;
  printerLocations: string[];
  allowedFileTypes: string[];
  maxFileSizeMB: number;
  queueWindowMinutes?: number;
  queueAlgorithm?: string;
}

// ─── 5. activityLogs ──────────────────────────────────────────────────────────

export interface FirestoreActivityLog {
  id: string;
  adminId: string;
  action: string;
  targetId: string;
  details?: string;
  timestamp: Timestamp;
}

// ─── 6. printers ──────────────────────────────────────────────────────────────

export interface FirestorePrinter {
  id: string;
  name: string;
  location: string;
  status: "ONLINE" | "OFFLINE";
  inkPercentage: number;    // 0–100
  paperPercentage: number;  // 0–100
  createdAt: Timestamp;
}

// ─── 7. locations ─────────────────────────────────────────────────────────────

export interface FirestoreLocation {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: Timestamp;
  // Optional future expansion fields:
  building?: string;
  floor?: string;
}

// ─── 8. notifications ─────────────────────────────────────────────────────────

export type NotificationType =
  | "PRINT_READY"
  | "PRINTING_STARTED"
  | "PRINT_CANCELLED"
  | "PAYMENT_CONFIRMED"
  | "BROADCAST";

export interface FirestoreNotification {
  id: string;
  /** If set, this notification targets a specific student. */
  studentId?: string;
  /** If true, the notification is visible to ALL users (admin broadcasts). */
  isBroadcast: boolean;
  type: NotificationType;
  title: string;
  message: string;
  /** Related print job ID, if applicable. */
  jobId?: string;
  /** Token number of the related job, if applicable. */
  tokenNumber?: string;
  /** IDs of users who have read this notification. */
  readBy: string[];
  createdAt: Timestamp;
  /** Name of the admin who created the notification (for broadcasts). */
  adminName?: string;
}

// ─── 9. pendingOrders ─────────────────────────────────────────────────────────

export type PendingOrderStatus = "CREATED" | "CONSUMED" | "EXPIRED";

export interface FirestorePendingOrder {
  id: string; // Razorpay orderId
  orderId: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  uploadId?: string;
  fileName: string;
  fileUrl: string;
  cloudinaryPublicId?: string;
  totalPages: number;
  copies: number;
  colorMode: ColorMode;
  printType: PrintType;
  paperSize: PaperSize;
  locationId: string;
  locationName: string;
  amountPaise: number;
  status: PendingOrderStatus;
  jobId?: string;
  razorpayPaymentId?: string;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  consumedAt?: Timestamp;
}

// ─── 10. uploads ──────────────────────────────────────────────────────────────

export interface FirestoreUploadRecord {
  id: string;
  ownerId: string;
  cloudinaryPublicId: string;
  fileUrl: string;
  fileName: string;
  pages: number;
  size: number;
  mime: string;
  consumed: boolean;
  consumedAt?: Timestamp;
  createdAt: Timestamp;
}

