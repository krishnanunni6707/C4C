/**
 * GET /api/firebase-test
 *
 * Verifies Firebase Admin SDK connectivity by:
 *  1. Connecting to Firestore
 *  2. Writing a test document to each required collection
 *  3. Reading it back
 *  4. Deleting the test document (clean up)
 *
 * Remove or protect this route before going to production.
 */

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { FieldValue } from "firebase-admin/firestore";

interface CollectionResult {
  status: "ok" | "error";
  docId?: string;
  error?: string;
}

export async function GET() {
  const results: Record<string, CollectionResult> = {};
  const timestamp = FieldValue.serverTimestamp();

  // Collections to verify
  const collectionsToTest = [
    COLLECTIONS.USERS,
    COLLECTIONS.PRINT_JOBS,
    COLLECTIONS.TRANSACTIONS,
    COLLECTIONS.SETTINGS,
    COLLECTIONS.ACTIVITY_LOGS,
  ];

  for (const collectionName of collectionsToTest) {
    try {
      // Write a test document
      const docRef = await adminDb.collection(collectionName).add({
        _test: true,
        message: `Firebase connection test for '${collectionName}'`,
        createdAt: timestamp,
      });

      // Read it back to confirm write succeeded
      const snap = await docRef.get();

      if (!snap.exists) {
        results[collectionName] = {
          status: "error",
          error: "Document written but could not be read back",
        };
        continue;
      }

      // Clean up — delete the test document
      await docRef.delete();

      results[collectionName] = { status: "ok", docId: docRef.id };
    } catch (err: unknown) {
      results[collectionName] = {
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  const allOk = Object.values(results).every((r) => r.status === "ok");

  return NextResponse.json(
    {
      success: allOk,
      message: allOk
        ? "✅ Firebase connected. All collections verified."
        : "⚠️ Firebase connected but some collections had errors.",
      collections: results,
      timestamp: new Date().toISOString(),
    },
    { status: allOk ? 200 : 500 }
  );
}
