#!/usr/bin/env node
/**
 * Seed script for LOCAL DEVELOPMENT ONLY — emulator only.
 *
 * Seeds: 1 location, 1 printer, 1 Super Admin, 1 Admin, 3 students.
 *
 * Usage:
 *   FIRESTORE_EMULATOR_HOST=localhost:8080 node scripts/seed-dev.mjs \
 *     --super-admin-password <pw> \
 *     --admin-password <pw> \
 *     --student-password <pw>
 *
 * IMPORTANT: This script refuses to run unless FIRESTORE_EMULATOR_HOST is set.
 * It must NEVER run against a real Firebase project.
 */

import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import bcrypt from "bcryptjs";
import { parseArgs } from "node:util";

// ── Guard: emulator only ──────────────────────────────────────────────────────
if (!process.env.FIRESTORE_EMULATOR_HOST) {
  console.error(
    "❌ FIRESTORE_EMULATOR_HOST is not set.\n" +
      "   This script only runs against the Firestore emulator.\n" +
      "   Start it with: npm run emu\n" +
      "   Then: FIRESTORE_EMULATOR_HOST=localhost:8080 node scripts/seed-dev.mjs ..."
  );
  process.exit(1);
}

// ── Parse arguments ───────────────────────────────────────────────────────────
const { values: args } = parseArgs({
  options: {
    "super-admin-password": { type: "string" },
    "admin-password": { type: "string" },
    "student-password": { type: "string" },
    "dry-run": { type: "boolean", default: false },
  },
  strict: true,
});

const superAdminPassword = args["super-admin-password"];
const adminPassword = args["admin-password"];
const studentPassword = args["student-password"];

if (!superAdminPassword || !adminPassword || !studentPassword) {
  console.error(
    "Usage: node scripts/seed-dev.mjs \\\n" +
      "  --super-admin-password <pw> \\\n" +
      "  --admin-password <pw> \\\n" +
      "  --student-password <pw> [--dry-run]"
  );
  process.exit(1);
}

const isDryRun = args["dry-run"];
if (isDryRun) console.log("🔍 DRY RUN — no writes will be made.\n");

// ── Init Firebase (emulator) ──────────────────────────────────────────────────
if (!getApps().length) {
  initializeApp({ projectId: "demo-test-project" });
}
const db = getFirestore();

// ── Seed data ─────────────────────────────────────────────────────────────────
const LOCATION_ID = "loc-dev-main";
const PRINTER_ID = "printer-dev-hp";

const users = [
  {
    id: "user-super-admin-dev",
    admissionNumber: "SA001",
    name: "Dev Super Admin",
    role: "SUPER_ADMIN",
    department: "Administration",
    semester: null,
    locationId: null,
    password: superAdminPassword,
    firstLogin: true,
    status: "ACTIVE",
  },
  {
    id: "user-admin-dev",
    admissionNumber: "AD001",
    name: "Dev Admin",
    role: "ADMIN",
    department: "Administration",
    semester: null,
    locationId: LOCATION_ID,
    password: adminPassword,
    firstLogin: true,
    status: "ACTIVE",
  },
  {
    id: "user-student-dev-1",
    admissionNumber: "STU001",
    name: "Dev Student One",
    role: "STUDENT",
    department: "Computer Science",
    semester: 3,
    locationId: null,
    password: studentPassword,
    firstLogin: false,
    status: "ACTIVE",
  },
  {
    id: "user-student-dev-2",
    admissionNumber: "STU002",
    name: "Dev Student Two",
    role: "STUDENT",
    department: "Electronics",
    semester: 5,
    locationId: null,
    password: studentPassword,
    firstLogin: false,
    status: "ACTIVE",
  },
  {
    id: "user-student-dev-3",
    admissionNumber: "STU003",
    name: "Dev Student Three",
    role: "STUDENT",
    department: "Mechanical",
    semester: 1,
    locationId: null,
    password: studentPassword,
    firstLogin: true,
    status: "ACTIVE",
  },
];

async function seed() {
  console.log("📦 Seeding emulator…\n");

  // Location
  const locationData = {
    id: LOCATION_ID,
    name: "Main Print Centre",
    isActive: true,
    createdAt: FieldValue.serverTimestamp(),
  };
  console.log(`  📍 Location: ${locationData.name} (${LOCATION_ID})`);
  if (!isDryRun) {
    await db.collection("locations").doc(LOCATION_ID).set(locationData);
  }

  // Printer
  const printerData = {
    id: PRINTER_ID,
    name: "Dev HP LaserJet",
    windowsName: "HP LaserJet 1020",
    locationId: LOCATION_ID,
    location: "Main Print Centre",
    supportsColor: false,
    isActive: true,
    createdAt: FieldValue.serverTimestamp(),
  };
  console.log(`  🖨️  Printer: ${printerData.name} (${PRINTER_ID})`);
  if (!isDryRun) {
    await db.collection("printers").doc(PRINTER_ID).set(printerData);
  }

  // Settings
  const settingsData = {
    bwPricePerPage: 2,
    colorPricePerPage: 10,
    doubleSidedDiscount: 0,
    queueWindowMinutes: 10,
    maxFileSizeMB: 10,
    maxCopies: 10,
    maxPagesPerJob: 100,
    fileRetentionHours: 48,
    colorEnabled: false,
    updatedAt: FieldValue.serverTimestamp(),
  };
  console.log("  ⚙️  Settings: systemSettings");
  if (!isDryRun) {
    await db
      .collection("settings")
      .doc("systemSettings")
      .set(settingsData, { merge: true });
  }

  // Users
  for (const user of users) {
    const { password, ...rest } = user;
    const passwordHash = await bcrypt.hash(password, 12);
    console.log(
      `  👤 ${rest.role.padEnd(12)} ${rest.admissionNumber} — ${rest.name}`
    );
    if (!isDryRun) {
      await db
        .collection("users")
        .doc(rest.id)
        .set({
          ...rest,
          passwordHash,
          createdAt: FieldValue.serverTimestamp(),
        });
    }
  }

  console.log(
    isDryRun
      ? "\n✅ Dry run complete — no writes made."
      : "\n✅ Emulator seeded successfully."
  );
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err.message);
  process.exit(1);
});
