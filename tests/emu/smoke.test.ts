/**
 * Smoke test: Firestore emulator write + read round-trip.
 * Run via: npm run test:emu
 * Requires FIRESTORE_EMULATOR_HOST to be set (done by firebase emulators:exec).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { initializeApp, getApps, deleteApp, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";

let app: App;
let db: Firestore;

beforeAll(() => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error(
      "FIRESTORE_EMULATOR_HOST is not set. Run this test with: npm run test:emu"
    );
  }
  app = initializeApp({ projectId: "demo-test-project" }, "smoke-test");
  db = getFirestore(app);
});

afterAll(async () => {
  await deleteApp(app);
});

describe("Firestore emulator smoke test", () => {
  it("writes and reads a document", async () => {
    const ref = db.collection("_smoke_test").doc("ping");
    await ref.set({ message: "pong", ts: Date.now() });
    const snap = await ref.get();
    expect(snap.exists).toBe(true);
    expect(snap.data()?.message).toBe("pong");
    await ref.delete();
  });

  it("emulator host is set correctly", () => {
    expect(process.env.FIRESTORE_EMULATOR_HOST).toMatch(/localhost:\d+/);
  });
});
