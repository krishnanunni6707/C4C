// Script to create or update Super Admin in Firestore
// Run with: node scripts/create-super-admin.mjs

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import bcrypt from "bcryptjs";
const { hash } = bcrypt;

// ── Config (from .env.local) ──────────────────────────────────────────────────
const PROJECT_ID = process.env.FIREBASE_ADMIN_PROJECT_ID;
const CLIENT_EMAIL = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const PRIVATE_KEY = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!PROJECT_ID || !CLIENT_EMAIL || !PRIVATE_KEY) {
  console.error("❌ Missing required environment variables:");
  if (!PROJECT_ID)   console.error("   - FIREBASE_ADMIN_PROJECT_ID");
  if (!CLIENT_EMAIL) console.error("   - FIREBASE_ADMIN_CLIENT_EMAIL");
  if (!PRIVATE_KEY)  console.error("   - FIREBASE_ADMIN_PRIVATE_KEY");
  console.error("\nRun: $env:FIREBASE_ADMIN_PROJECT_ID='...' (PowerShell) or load your .env.local first.");
  process.exit(1);
}

const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD;
if (!SUPER_ADMIN_PASSWORD) {
  console.error("❌ Missing SUPER_ADMIN_PASSWORD environment variable.");
  console.error("   Set a strong password: $env:SUPER_ADMIN_PASSWORD='YourStrongPassword!'");
  process.exit(1);
}

const SUPER_ADMIN = {
  name: "Super Admin",
  admissionNumber: "SAD001",
  department: "Administration",
  semester: null,
  role: "SUPER_ADMIN",
  password: SUPER_ADMIN_PASSWORD,
};

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: PROJECT_ID,
      clientEmail: CLIENT_EMAIL,
      privateKey: PRIVATE_KEY,
    }),
  });
}

const db = getFirestore();

async function main() {
  const existing = await db
    .collection("users")
    .where("admissionNumber", "==", SUPER_ADMIN.admissionNumber.toUpperCase())
    .limit(1)
    .get();

  const passwordHash = await hash(SUPER_ADMIN.password, 12);

  if (!existing.empty) {
    const docId = existing.docs[0].id;
    console.log(`ℹ️ User with admission number ${SUPER_ADMIN.admissionNumber} already exists. Updating doc ID: ${docId}...`);
    await db.collection("users").doc(docId).update({
      name: SUPER_ADMIN.name,
      role: "SUPER_ADMIN",
      passwordHash,
      firstLogin: false,
      status: "ACTIVE",
      updatedAt: FieldValue.serverTimestamp(),
    });
    console.log("✅ Super Admin updated successfully!");
    console.log("─────────────────────────────────────");
    console.log(`  Name            : ${SUPER_ADMIN.name}`);
    console.log(`  Admission Number: ${SUPER_ADMIN.admissionNumber}`);
    console.log(`  Password        : ${SUPER_ADMIN.password}`);
    console.log(`  Role            : SUPER_ADMIN`);
    console.log(`  Firestore ID    : ${docId}`);
    console.log("─────────────────────────────────────");
  } else {
    const docRef = db.collection("users").doc();
    await docRef.set({
      id: docRef.id,
      admissionNumber: SUPER_ADMIN.admissionNumber.toUpperCase(),
      name: SUPER_ADMIN.name,
      department: SUPER_ADMIN.department,
      semester: SUPER_ADMIN.semester,
      role: SUPER_ADMIN.role,
      locationId: null,
      passwordHash,
      firstLogin: false,
      status: "ACTIVE",
      createdAt: FieldValue.serverTimestamp(),
    });
    console.log("✅ Super Admin created successfully!");
    console.log("─────────────────────────────────────");
    console.log(`  Name            : ${SUPER_ADMIN.name}`);
    console.log(`  Admission Number: ${SUPER_ADMIN.admissionNumber}`);
    console.log(`  Password        : ${SUPER_ADMIN.password}`);
    console.log(`  Role            : SUPER_ADMIN`);
    console.log(`  Firestore ID    : ${docRef.id}`);
    console.log("─────────────────────────────────────");
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
