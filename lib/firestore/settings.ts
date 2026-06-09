/**
 * Firestore helpers for settings collection.
 * Server-side only — never import in client components.
 */

import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS, FirestoreSettings } from "@/lib/firebase/collections";

const SETTINGS_DOC_ID = "systemSettings";

type ExtendedSettings = FirestoreSettings & {
  queueWindowMinutes?: number;
  queueAlgorithm?: string;
  merchantName?: string;
};

const DEFAULT_SETTINGS: ExtendedSettings = {
  bwPricePerSheet: 2,
  colorPricePerSheet: 5,
  tokenCharge: 1,
  qrCodeImageUrl: "",
  upiId: "",
  printerLocations: [],
  allowedFileTypes: ["pdf", "docx", "pptx"],
  maxFileSizeMB: 10,
  queueWindowMinutes: 5,
  queueAlgorithm: "WINDOW_SJF",
  merchantName: "",
};

export async function getSettings(): Promise<ExtendedSettings> {
  const doc = await adminDb
    .collection(COLLECTIONS.SETTINGS)
    .doc(SETTINGS_DOC_ID)
    .get();

  if (!doc.exists) {
    return DEFAULT_SETTINGS;
  }

  return { ...DEFAULT_SETTINGS, ...(doc.data() as Partial<ExtendedSettings>) };
}

export async function updateSettings(
  data: Partial<ExtendedSettings>
): Promise<void> {
  await adminDb
    .collection(COLLECTIONS.SETTINGS)
    .doc(SETTINGS_DOC_ID)
    .set(data, { merge: true });
}
