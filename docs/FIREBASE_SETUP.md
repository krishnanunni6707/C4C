# Firebase Setup Guide

## 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add project** → name it (e.g. `smart-campus-printing`)
3. Disable Google Analytics if not needed → **Create project**

---

## 2. Enable Firestore

1. In the Firebase Console sidebar → **Build → Firestore Database**
2. Click **Create database**
3. Choose **Start in test mode** (you can tighten rules later)
4. Select a region close to you → **Enable**

---

## 3. Enable Firebase Storage

1. Sidebar → **Build → Storage**
2. Click **Get started**
3. Choose **Start in test mode** → **Next** → **Done**

---

## 4. Get Client SDK Credentials (NEXT_PUBLIC_ vars)

1. Sidebar → **Project Settings** (gear icon) → **General**
2. Scroll to **Your apps** → click **</>** (Web)
3. Register the app (any nickname) → copy the `firebaseConfig` object
4. Fill in `.env.local`:

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
```

---

## 5. Get Admin SDK Credentials (server-only vars)

1. **Project Settings** → **Service accounts** tab
2. Click **Generate new private key** → **Generate key**
3. A JSON file downloads — open it and copy:
   - `project_id` → `FIREBASE_ADMIN_PROJECT_ID`
   - `client_email` → `FIREBASE_ADMIN_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_ADMIN_PRIVATE_KEY` (paste the full key including `-----BEGIN PRIVATE KEY-----`)

> ⚠️ Never commit the JSON file or the private key to git.

---

## 6. Initialize Firestore Collections

After filling in `.env.local`, start the dev server and visit:

```
http://localhost:3000/api/firebase-init
```

This will:
- Create the `settings` document with default pricing
- Verify write access to all 5 collections

---

## 7. Verify Connection

```
http://localhost:3000/api/firebase-test
```

Expected response:
```json
{
  "success": true,
  "message": "✅ Firebase connected. All collections verified.",
  "collections": {
    "users":        { "status": "ok" },
    "printJobs":    { "status": "ok" },
    "transactions": { "status": "ok" },
    "settings":     { "status": "ok" },
    "activityLogs": { "status": "ok" }
  }
}
```

---

## Collections Reference

| Collection     | Purpose                                      |
|----------------|----------------------------------------------|
| `users`        | User profiles synced from auth               |
| `printJobs`    | Print job records with status & token        |
| `transactions` | Payment records (Razorpay / simulated)       |
| `settings`     | Global config — pricing, locations, limits   |
| `activityLogs` | Admin audit trail — status changes, actions  |

---

## File Structure

```
lib/
└── firebase/
    ├── client.ts          ← Browser SDK (Firestore, Storage, Auth)
    ├── admin.ts           ← Server-only Admin SDK
    ├── collections.ts     ← Collection names + TypeScript interfaces
    ├── init-firestore.ts  ← One-time seed helper
    └── index.ts           ← Barrel export

app/api/
├── firebase-test/route.ts  ← Connection test endpoint
└── firebase-init/route.ts  ← One-time init endpoint
```
