/**
 * Firebase barrel export
 *
 * Client-side usage (React components):
 *   import { db, storage, auth } from "@/lib/firebase"
 *
 * Server-side usage (API routes / Server Components):
 *   import { adminDb, adminStorage } from "@/lib/firebase/admin"
 *
 * Types & constants:
 *   import { COLLECTIONS, FirestoreUser, ... } from "@/lib/firebase"
 */

export { app, db, storage, auth } from "./client";

export { COLLECTIONS } from "./collections";
export type { CollectionName } from "./collections";

// User
export type { FirestoreUser } from "./collections";

// Print jobs
export type {
  FirestorePrintJob,
  PrintJobStatus,
  ColorMode,
  PrintType,
  PaperSize,
  PaymentMethod,
  PaymentStatus,
} from "./collections";

// Transactions
export type { FirestoreTransaction } from "./collections";

// Settings
export type { FirestoreSettings } from "./collections";

// Activity logs
export type { FirestoreActivityLog } from "./collections";
