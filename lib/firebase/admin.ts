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

let _adminApp: App | null = null;
let _adminDb: Firestore | null = null;
let _adminStorage: Storage | null = null;

function getAdminApp(): App {
  if (_adminApp) return _adminApp;
  if (getApps().length > 0) {
    _adminApp = getApps()[0];
    return _adminApp;
  }

  // When the Firestore emulator is running (local tests / CI), initialise
  // without real credentials so no service account key is required.
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    _adminApp = initializeApp({ projectId: EMULATOR_PROJECT_ID });
    return _adminApp;
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

  _adminApp = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      // Replace escaped newlines that can occur when reading from env vars
      privateKey: privateKey.replace(/\\n/g, "\n"),
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
  return _adminApp;
}

function getAdminDb(): Firestore {
  if (!_adminDb) {
    _adminDb = getFirestore(getAdminApp());
  }
  return _adminDb;
}

function getAdminStorage(): Storage {
  if (!_adminStorage) {
    _adminStorage = getStorage(getAdminApp());
  }
  return _adminStorage;
}

const adminAppProxy = new Proxy({} as App, {
  get(_target, prop: keyof App | symbol) {
    const instance = getAdminApp();
    const val = (instance as any)[prop];
    return typeof val === "function" ? val.bind(instance) : val;
  },
});

const adminDbProxy = new Proxy({} as Firestore, {
  get(_target, prop: keyof Firestore | symbol) {
    const instance = getAdminDb();
    const val = (instance as any)[prop];
    return typeof val === "function" ? val.bind(instance) : val;
  },
});

const adminStorageProxy = new Proxy({} as Storage, {
  get(_target, prop: keyof Storage | symbol) {
    const instance = getAdminStorage();
    const val = (instance as any)[prop];
    return typeof val === "function" ? val.bind(instance) : val;
  },
});

export { adminAppProxy as adminApp, adminDbProxy as adminDb, adminStorageProxy as adminStorage, getAdminApp, getAdminDb, getAdminStorage };

