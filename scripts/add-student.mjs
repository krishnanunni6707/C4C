// One-time script to add a test student to Firestore
// Run with: node scripts/add-student.mjs

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import bcrypt from "bcryptjs";
const { hash } = bcrypt;

// ── Config (from .env.local) ──────────────────────────────────────────────────
const PROJECT_ID = "remote-printer-503dc";
const CLIENT_EMAIL = "firebase-adminsdk-fbsvc@remote-printer-503dc.iam.gserviceaccount.com";
const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCX61BByYChMWmN
AiTPmnKh0Ojw2Q/ldayFqWuRXAPSNmcXk5ejkFSW3M93JwqKlb6Oy0Xw9epkNzWb
14nNZdv5zoXvR17THjMf0/PLJEUtBYeMR3cp/67WLGAJEC2sKtV3fo32Wjo2gubq
baq1TUSkuRTdQKJ0p03prlH0JxrtTjbev4dTJStEqbWf+5ccs8v9xPosDpVU/2Ba
RhuF3xxPg4OuWeGyWAwxQiF7NhETsQG+x5kTYtZivBndQlfFfeaxeEEYYY6vwy/z
Q7y5LgGYWqyM+LPWdYlJyyPIc+Z65i3xviZUWzWIbDtc1yewYOWoL6VJ7l+dWz9E
k3pSOrGdAgMBAAECggEADGe3KIATRFZcF5sWtWsXtDXyZ4RaA3Mt8MYqVfbNCxPN
LEQtjDojZiRGvqSN/E4I/vEDV49FIgTOGFkr0/1ezpG6JxVNXXDoXM96Z1qhWXFL
pb1KMkBCHxQFjYfoKthekQDhB75LZZsfzwHAgEh8c/T3CrAV8++bcZr97zFoRftO
U68KA+ghFKnylL+Yt7qPg+huV+VYFsXHONqGtyXVIA31SElzd9wr79HlgYf+4Kwi
183TP0Loe7b6vti1Y9wcV2Wn6pyx6vlPkD/MBZgSEUV46rR1tmcnda+KvCP2qmPX
Bs8phllR8yD2Ws1avlvLN9PO+1nQPsbRwGbydWOwswKBgQDFfdy6fm2l27GcAhYI
MnCxrYGCmzNz5TN9qwZSY3Z+sKah6a1JxgRB5x+5MkzZD/PUm04Q2h96PE4FGVvL
fbxSjcZfHazLlfYxd3QHCskTWLqjrQhGhhaTNkHEFlhNvuuu1vb5Y623hMniK2uB
S79TY7Uc7xtCV/yq0SeeX1M/BwKBgQDE7SaNQhDDApizhev+dJ4TwuhZb9DGTTFS
/+obMMgJnjyo1Je/ipDKytL1VfhvcyB8PXE0vm8egZXV6mle+a+hUXN8+4OVjUS6
evsb3cveR00TgpEv+DCQ3FtDP3TxDGqPDRZs8hKIou+O5sLCUdpyKbyIcV2fN01h
kMilU6W9OwKBgHZ9yqaWXoFJ7Cl3UvK+GMFyIadUKS3bEebPay6ZgKoIoSG6S39c
8Ib9/hmmpVcC7D/eopsX1BUKA6GpklroaMp7R88fxeIsapdJXXMwNG6IKQs1MSbn
IrpWrmTRJ1AWQeAYF/yPotXeNSae+JSN9xA4XZ0rlQZcNjvi28t41ECXAoGAHc+M
s3uZz/uXpC2U0RtURseNpuRfZXWQDvGAvgb/cT1MD37HTg6q5pgXoV4XUr/J3iTq
+0IMzkBtr0liFCeWJ8SNyBDHFZ+iFNzDIK/NyeNfTqHIWsumhndlNWPozwjDJM6l
Y26t0ZNg0nAqcYI0oG2jBcCrnIuhojBpv2VPRLsCgYAMjI5L3fDxzm2jr4BA4TN1
j7pVNQoZxF5ik/7VJvNSQaLsZV0CCP6CmEJsUK+gVLC0Jx7BWrL1lij2Vlv0cxPx
GZj8JcSUNO+EtF8i2tWtow6usGmpbTybvTBh2i5jj+yp2EF6brj2fOe7f9FxSNeq
wu72G2B+XXgzR8uQBpTOjA==
-----END PRIVATE KEY-----`;

// ── Student details ───────────────────────────────────────────────────────────
const STUDENT = {
  name: "Test Student",
  admissionNumber: "STU001",
  department: "Computer Science",
  semester: 3,
  role: "STUDENT",
  password: "Test@1234",   // plain-text — will be hashed before saving
};

// ── Init Firebase Admin ───────────────────────────────────────────────────────
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
    firstLogin: false,   // already set so no forced password change
    status: "ACTIVE",
    createdAt: FieldValue.serverTimestamp(),
  });

  console.log("✅ Student created successfully!");
  console.log("─────────────────────────────────────");
  console.log(`  Name            : ${STUDENT.name}`);
  console.log(`  Admission Number: ${STUDENT.admissionNumber.toUpperCase()}`);
  console.log(`  Password        : ${STUDENT.password}`);
  console.log(`  Firestore ID    : ${docRef.id}`);
  console.log("─────────────────────────────────────");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
