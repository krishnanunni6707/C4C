// One-time script to add a test student to Firestore
// Run with: node scripts/add-student.mjs
// Requires env vars: FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY
// Optional: STUDENT_ADMISSION_NUMBER, STUDENT_NAME, STUDENT_DEPARTMENT, STUDENT_SEMESTER, STUDENT_PASSWORD

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import bcrypt from "bcryptjs";
const { hash } = bcrypt;

// ── Config (from environment) ─────────────────────────────────────────────────
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

// ── Student details (override via env vars) ───────────────────────────────────
const admissionNumber = process.env.STUDENT_ADMISSION_NUMBER;
const password = process.env.STUDENT_PASSWORD;

if (!admissionNumber || !password) {
  console.error("❌ Missing required student environment variables:");
  if (!admissionNumber) console.error("   - STUDENT_ADMISSION_NUMBER");
  if (!password)        console.error("   - STUDENT_PASSWORD");
  process.exit(1);
}

const STUDENT = {
  name: process.env.STUDENT_NAME || "New Student",
  admissionNumber,
  department: process.env.STUDENT_DEPARTMENT || "General",
  semester: parseInt(process.env.STUDENT_SEMESTER || "1", 10),
  role: "STUDENT",
  password,
};

// ── Init Firebase Admin ───────────────────────────────────────────────────────
if (!getApps().length) {
  initializeApp({
    credential: cert({ projectId: PROJECT_ID, clientEmail: CLIENT_EMAIL, privateKey: PRIVATE_KEY }),
  });
}

const db = getFirestore();

async function main() {
  // Check if admission number already exists
  const existing = await db
    .collection("users")
    .where("admissionNumber", "==", STUDENT.admissionNumber.toUpperCase())
    .limit(1)
    .get();

  if (!existing.empty) {
    console.log(`⚠️  Student with admission number ${STUDENT.admissionNumber} already exists.`);
    console.log(`   Existing doc ID: ${existing.docs[0].id}`);
    process.exit(0);
  }

  const passwordHash = await hash(STUDENT.password, 12);
  const docRef = db.collection("users").doc();

  await docRef.set({
    id: docRef.id,
    admissionNumber: STUDENT.admissionNumber.toUpperCase(),
    name: STUDENT.name,
    department: STUDENT.department,
    semester: STUDENT.semester,
    role: STUDENT.role,
    locationId: null,
    passwordHash,
    firstLogin: true,  // forces password change on first login
    status: "ACTIVE",
    createdAt: FieldValue.serverTimestamp(),
  });

  console.log("✅ Student created successfully!");
  console.log("─────────────────────────────────────");
  console.log(`  Name            : ${STUDENT.name}`);
  console.log(`  Admission Number: ${STUDENT.admissionNumber.toUpperCase()}`);
  console.log(`  Department      : ${STUDENT.department}`);
  console.log(`  Semester        : ${STUDENT.semester}`);
  console.log(`  Firestore ID    : ${docRef.id}`);
  console.log("─────────────────────────────────────");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
