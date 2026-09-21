/**
 * Firebase Admin SDK configuration
 * Used ONLY in server-side code (API routes, Server Components, server actions)
 * Never import this file in client components — it will expose service account credentials
 *
 * Emulator support: when FIRESTORE_EMULATOR_HOST is set the SDK initialises with
 * a dummy project ID and no credentials so that tests run without a real key.
 */

import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getStorage, Storage } from "firebase-admin/storage";

const EMULATOR_PROJECT_ID = "demo-test-project";

function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  // When the Firestore emulator is running (local tests / CI), initialise
  // without real credentials so no service account key is required.
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    return initializeApp({ projectId: EMULATOR_PROJECT_ID });
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin environment variables. " +
        "Ensure FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, " +
        "and FIREBASE_ADMIN_PRIVATE_KEY are set in .env.local"
    );
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      // Replace escaped newlines that can occur when reading from env vars
      privateKey: privateKey.replace(/\\n/g, "\n"),
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

const adminApp: App = getAdminApp();
const adminDb: Firestore = getFirestore(adminApp);
const adminStorage: Storage = getStorage(adminApp);

export { adminApp, adminDb, adminStorage };
