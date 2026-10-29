/**
 * Firestore Security Rules tests (P-06).
 * Verifies that client-side access is completely locked down for all collections.
 * Run via: npm run test:emu
 */

import { describe, it, beforeAll, afterAll } from "vitest";
import {
  initializeTestEnvironment,
  assertFails,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import fs from "fs";
import path from "path";

let testEnv: RulesTestEnvironment | null = null;

beforeAll(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    return;
  }
  const rules = fs.readFileSync(path.resolve(__dirname, "../../firestore.rules"), "utf8");
  const [host, portStr] = process.env.FIRESTORE_EMULATOR_HOST.split(":");
  testEnv = await initializeTestEnvironment({
    projectId: "demo-test-project",
    firestore: {
      rules,
      host,
      port: parseInt(portStr || "8080", 10),
    },
  });
});

afterAll(async () => {
  if (testEnv) {
    await testEnv.cleanup();
  }
});

describe("Firestore Security Rules Lockdown (P-06)", () => {
  it("rejects unauthenticated reads and writes to /notifications", async () => {
    if (!testEnv) return;
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(db.collection("notifications").get());
    await assertFails(db.collection("notifications").add({ message: "unauthorized" }));
  });

  it("rejects unauthenticated reads and writes to /users", async () => {
    if (!testEnv) return;
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(db.collection("users").get());
    await assertFails(db.collection("users").doc("user-1").set({ name: "hacked" }));
  });

  it("rejects unauthenticated reads and writes to /printJobs", async () => {
    if (!testEnv) return;
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(db.collection("printJobs").get());
    await assertFails(db.collection("printJobs").doc("job-1").set({ status: "PAID" }));
  });

  it("rejects unauthenticated reads to any arbitrary collection", async () => {
    if (!testEnv) return;
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(db.collection("pendingOrders").get());
    await assertFails(db.collection("uploads").get());
    await assertFails(db.collection("counters").get());
  });
});
