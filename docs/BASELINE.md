# Baseline Report — 2026-09-21

Recorded before any hardening changes. Branch: `hardening/phase0-0.1-baseline`.

## C4C (Next.js 14 web app)

### npm ci
```
✅ Exit code 0. All dependencies installed.
Audit advisory: `npm audit fix` recommended (no high/critical in production deps at baseline; full audit in S-10).
```

### npm run lint (next lint)
```
✅ Exit code 0. No ESLint errors or warnings at baseline.
```

### npm run type-check (tsc --noEmit)
```
✅ Exit code 0. No TypeScript errors.
```

### npm run build
Not run at baseline (requires real env vars). CI uses stub vars. Will record in first PR.

### npm run test (vitest unit)
```
✅ 2 tests passed (smoke tests — vitest installed as part of task 0.3).
Test Files  1 passed (1)
      Tests  2 passed (2)
```

---

## QDocClient (Python Windows tray app)

### Structure at baseline
```
qdoc_client.py       — single-file monolith, ~400 lines
requirements.txt     — (created in 0.3; none previously)
```

### Python version
```
Python 3.12.3 (on CI: 3.11)
```

### Import check (non-Windows safe)
```
✅ asyncio, json, base64 — OK
⏭  win32print, pystray — skipped (Windows-only)
```

### pytest (on Linux/CI)
```
✅ 3 passed, 1 skipped (Windows-only)
platform linux -- Python 3.12.3, pytest-9.1.1
```

### ruff
To be run in CI; `pyproject.toml` created in task 0.3.

---

## Known issues at baseline (to be fixed in Phase 1)

| # | Severity | File | Issue |
|---|---|---|---|
| 1 | CRITICAL | `scripts/add-student.mjs` | Firebase Admin private key hard-coded (S-01) |
| 2 | HIGH | `lib/auth.ts` | JWT frozen 24 h, no `trigger=update`, unsafe redirect (S-04) |
| 3 | HIGH | `firestore.rules` | `notifications` `allow read: if true` (S-08) |
| 4 | HIGH | `app/api/*` | dev/debug routes present in production (S-02) |
| 5 | HIGH | `app/api/*` | routes hand-roll session checks, no central authz (S-03) |
| 6 | MEDIUM | `qdoc_client.py` | `MASTER_KEY`, licence gate, `wmi`, bare `except:` (D-05) |
| 7 | MEDIUM | `qdoc_client.py` | `win32print.SetPrinter` mutates global state (D-06) |
| 8 | MEDIUM | `next.config.mjs` | misleading `experimental.serverActions.bodySizeLimit` (S-09) |

All items above are tracked in the plan and will be addressed in their respective tasks.
