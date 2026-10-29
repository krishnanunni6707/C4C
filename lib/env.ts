/**
 * Environment Variables Validation & Access (P-14)
 *
 * Centralized, validated environment configuration using Zod.
 * Validates at startup and fails fast with actionable, non-leaking error messages.
 */

import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  NEXTAUTH_SECRET: z.string().min(1, "NEXTAUTH_SECRET is required"),
  NEXTAUTH_URL: z.string().optional().default("http://localhost:3000"),

  // Firebase Admin (server-only)
  FIREBASE_ADMIN_PROJECT_ID: z.string().min(1, "FIREBASE_ADMIN_PROJECT_ID is required"),
  FIREBASE_ADMIN_CLIENT_EMAIL: z.string().min(1, "FIREBASE_ADMIN_CLIENT_EMAIL is required"),
  FIREBASE_ADMIN_PRIVATE_KEY: z.string().min(1, "FIREBASE_ADMIN_PRIVATE_KEY is required"),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().optional(),

  // Cloudinary
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z.string().min(1, "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is required"),
  CLOUDINARY_API_KEY: z.string().min(1, "CLOUDINARY_API_KEY is required"),
  CLOUDINARY_API_SECRET: z.string().min(1, "CLOUDINARY_API_SECRET is required"),
  CLOUDINARY_URL: z.string().optional(),

  // Razorpay
  RAZORPAY_KEY_ID: z.string().min(1, "RAZORPAY_KEY_ID is required"),
  RAZORPAY_KEY_SECRET: z.string().min(1, "RAZORPAY_KEY_SECRET is required"),
  NEXT_PUBLIC_RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),

  // Cron & Daemon
  CRON_SECRET: z.string().optional(),
  NEXT_PUBLIC_PRINTER_WS_URL: z.string().optional(),
  DAEMON_SECRET: z.string().optional(),

  // Monitoring & Testing
  SENTRY_DSN: z.string().optional(),
  ALLOW_DB_CLEAR: z.string().optional(),
  PAYMENT_TEST_MODE: z.string().optional(),
  FIRESTORE_EMULATOR_HOST: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function getRawEnv() {
  const isTest = process.env.NODE_ENV === "test" || Boolean(process.env.VITEST);

  // Provide mock safe defaults in test mode so unit tests don't require live credentials
  if (isTest) {
    return {
      NODE_ENV: "test",
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || "test-mock-nextauth-secret-32-chars-long!",
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || "http://localhost:3000",
      FIREBASE_ADMIN_PROJECT_ID: process.env.FIREBASE_ADMIN_PROJECT_ID || "test-project",
      FIREBASE_ADMIN_CLIENT_EMAIL: process.env.FIREBASE_ADMIN_CLIENT_EMAIL || "test@test-project.iam.gserviceaccount.com",
      FIREBASE_ADMIN_PRIVATE_KEY: process.env.FIREBASE_ADMIN_PRIVATE_KEY || "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC3\n-----END PRIVATE KEY-----",
      NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "test-cloud",
      CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || "123456789012345",
      CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || "test-cloudinary-secret",
      RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || "rzp_test_mock123",
      RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || "mock_razorpay_secret",
      NEXT_PUBLIC_RAZORPAY_KEY_ID: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_mock123",
      RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET,
      CRON_SECRET: process.env.CRON_SECRET,
      NEXT_PUBLIC_PRINTER_WS_URL: process.env.NEXT_PUBLIC_PRINTER_WS_URL,
      DAEMON_SECRET: process.env.DAEMON_SECRET,
      SENTRY_DSN: process.env.SENTRY_DSN,
      ALLOW_DB_CLEAR: process.env.ALLOW_DB_CLEAR,
      PAYMENT_TEST_MODE: process.env.PAYMENT_TEST_MODE,
      FIRESTORE_EMULATOR_HOST: process.env.FIRESTORE_EMULATOR_HOST,
    };
  }

  return process.env;
}

export function validateEnv(): Env {
  const result = envSchema.safeParse(getRawEnv());
  if (!result.success) {
    const missingKeys = result.error.errors.map(
      (e) => `${e.path.join(".")}: ${e.message}`
    );
    // Never print secret values in logs; only output variable names and validation errors
    const errorMsg = `[ENV_VALIDATION_ERROR] Missing or invalid configuration variables:\n  - ${missingKeys.join("\n  - ")}`;
    if (process.env.NODE_ENV === "production") {
      throw new Error(errorMsg);
    } else {
      console.warn(errorMsg);
    }
    return (result as any).data || (getRawEnv() as Env);
  }
  return result.data;
}

export const env: Env = validateEnv();
