# Decisions Log

Every significant decision made during implementation is recorded here.
Format: ID, date, context, options considered, choice, reason.

---

## DEC-0001 — Tag timing: `pre-hardening` tag deferred until after key rotation
**Date:** 2026-09-21  
**Context:** Task 0.1 requires tagging both repos `pre-hardening` before any changes.
The Firebase Admin private key is hard-coded in `scripts/add-student.mjs` and committed to git history.
Tagging before key rotation would permanently mark a commit that contains a live credential.  
**Options:**
1. Tag now, rotate later — tag points to a commit with exposed credentials.
2. Rotate first, purge history (S-01), then tag — tag points to a clean commit.  
**Choice:** Option 2.  
**Reason:** Tagging a credential-bearing commit is unsafe. The plan's S-01 step says "OWNER rotates keys first". The tag will be pushed by the OWNER after the history purge in S-01.

---

## DEC-0002 — Staging project: emulator-only for Phase 0
**Date:** 2026-09-21  
**Context:** Task 0.2 requires a staging Firebase project. No staging project ID is currently
available in `.env.local` (only production project `remote-printer-503dc` is present).  
**Options:**
1. Block Phase 0 until OWNER creates staging project.
2. Use the Firestore emulator for all Phase 0/1 tests; wire `.firebaserc` with a placeholder;
   update when the OWNER provides the staging project ID.  
**Choice:** Option 2.  
**Reason:** The emulator is sufficient for all automated tests in Phases 0–2. Staging is
needed for human smoke tests before Gate A. This unblocks the agent without blocking the OWNER.

---

## DEC-0003 — QDocClient structure: single file, no requirements.txt
**Date:** 2026-09-21  
**Context:** The cloned QDocClient repo contains a single file (`qdoc_client.py`) with no
`requirements.txt`, `tests/`, or `docs/` folder.  
**Options:**
1. Create the full structure from scratch matching the plan.
2. Refactor the existing single file into modules in Phase 2 (D-04/D-05).  
**Choice:** Option 1 for scaffolding (Phase 0.3); Option 2 for the full rewrite (Phase 2).  
**Reason:** Phase 0.3 only needs `requirements.txt`, `tests/` with a smoke test, and CI.
The D-04/D-05 rewrite will restructure modules. Starting with scaffolding avoids big-bang changes.

---

<!-- Template for new entries:
## DEC-XXXX — Short title
**Date:** YYYY-MM-DD  
**Context:**  
**Options:**  
**Choice:**  
**Reason:**  
-->
