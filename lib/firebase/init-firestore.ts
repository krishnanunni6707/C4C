/**
 * Firestore initialization helper
 *
 * Seeds the `settings` collection with default values and confirms
 * write access to all required collections.
 *
 * Called by GET /api/firebase-init — run once after Firebase is configured.
 */

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import { COLLECTIONS, FirestoreSettings } from "./collections";

// Settings document lives at a fixed path: settings/systemSettings
const SETTINGS_DOC_ID = "systemSettings";

export async function initFirestore(): Promise<{
  success: boolean;
  message: string;
  details?: Record<string, string>;
}> {
  const details: Record<string, string> = {};

  try {
    // ── 1. Seed settings/systemSettings (skip if already exists) ────────────
    const settingsRef = adminDb
      .collection(COLLECTIONS.SETTINGS)
      .doc(SETTINGS_DOC_ID);

    const settingsSnap = await settingsRef.get();

    if (!settingsSnap.exists) {
      const defaultSettings: FirestoreSettings = {
        bwPricePerSheet: 2,
        colorPricePerSheet: 5,
        tokenCharge: 1,
        qrCodeImageUrl: "",        // populated later via admin panel
        upiId: "",                 // populated later via admin panel
        printerLocations: [
          "Library Print Room",
          "Block A - Ground Floor",
          "Block B - First Floor",
          "Admin Block",
        ],
        allowedFileTypes: ["pdf", "docx", "pptx"],
        maxFileSizeMB: 20,
      };

      await settingsRef.set({
        ...defaultSettings,
        // updatedAt is not part of the interface but useful as metadata
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: "system",
      });

      details[COLLECTIONS.SETTINGS] = `created settings/${SETTINGS_DOC_ID}`;
      console.log(`✅ settings/${SETTINGS_DOC_ID} created.`);
    } else {
      details[COLLECTIONS.SETTINGS] = `settings/${SETTINGS_DOC_ID} already exists — skipped`;
      console.log(`ℹ️  settings/${SETTINGS_DOC_ID} already exists — skipping seed.`);
    }

    // ── 2. Confirm write access to every other collection ───────────────────
    // Firestore creates collections lazily on first write.
    // We write a temp doc, verify it, then delete it.
    const collectionsToVerify = [
      COLLECTIONS.USERS,
      COLLECTIONS.PRINT_JOBS,
      COLLECTIONS.TRANSACTIONS,
      COLLECTIONS.ACTIVITY_LOGS,
    ];

    for (const col of collectionsToVerify) {
      // Use a non-reserved, clearly temporary doc ID
      const tempRef = adminDb.collection(col).doc("tempAccessCheck");

      await tempRef.set({
        _temp: true,
        createdAt: FieldValue.serverTimestamp(),
      });

      const snap = await tempRef.get();

      if (!snap.exists) {
        details[col] = "write succeeded but read-back failed";
        continue;
      }

      await tempRef.delete();
      details[col] = "write/read/delete OK";
    }

    return {
      success: true,
      message: "Firestore initialized successfully.",
      details,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Firestore init error:", message);
    return { success: false, message, details };
  }
}
