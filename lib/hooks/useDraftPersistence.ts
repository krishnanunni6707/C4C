/**
 * useDraftPersistence
 * -------------------
 * Persists the student print-wizard draft to IndexedDB, scoped per user.
 *
 * Features:
 *  - Auto-saves on every state change (debounced 500 ms)
 *  - Stores file bytes natively as Uint8Array (no base64 bloat)
 *  - On mount: detects an existing, unexpired (< 24 h) draft and asks
 *    the user whether to continue or start fresh
 *  - Clears draft after a successful submission
 *  - Adds a `beforeunload` warning when draft is non-empty
 *  - Fails silently if IndexedDB is unavailable (private browsing, etc.)
 *  - Cross-user safety: keys are prefixed by session user id
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ManagedPdfFile } from "@/components/student/PdfEditor";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DraftState {
  wizardStep: "UPLOAD" | "EDIT" | "SETTINGS";
  stagedFiles: ManagedPdfFile[];
  stagedPages: { fileId: string; originalIndex: number }[];
  selectedLocationId: string;
  copies: number;
  colorMode: "BW" | "COLOR";
  printType: "single-sided" | "double-sided";
  paperSize: "A4" | "Letter";
  paymentMethod: "wallet" | "cash";
}

/** What's actually persisted in IndexedDB (adds metadata) */
interface PersistedDraft extends DraftState {
  userId: string;
  savedAt: number; // Unix ms
}

export type DraftPromptState = "idle" | "prompting" | "dismissed";

interface UseDraftPersistenceOptions {
  /** NextAuth session user id — used to scope drafts per account */
  userId: string | undefined | null;
  /** Currently active locations (for validating draft's selectedLocationId) */
  availableLocationIds: string[];
  defaultLocationId: string;
}

interface UseDraftPersistenceReturn {
  /** Whether a resume prompt should be shown */
  promptState: DraftPromptState;
  /** Restored draft data (only populated when promptState === "prompting") */
  pendingDraft: DraftState | null;
  /** Call when user clicks "Continue where I left off" */
  acceptDraft: () => DraftState | null;
  /** Call when user clicks "Start fresh" */
  discardDraft: () => void;
  /** Save the current wizard state (debounced internally) */
  saveDraft: (state: DraftState) => void;
  /** Call on successful job submission to wipe the draft */
  clearDraft: () => void;
  /** Whether a non-empty draft is currently held in memory (for beforeunload) */
  hasDraft: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DB_NAME = "qdoc_drafts";
const DB_VERSION = 1;
const STORE_NAME = "drafts";
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const DEBOUNCE_MS = 500;

// ── IndexedDB helpers ─────────────────────────────────────────────────────────

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: "userId" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbGet(userId: string): Promise<PersistedDraft | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(userId);
      req.onsuccess = () => resolve((req.result as PersistedDraft) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function dbPut(draft: PersistedDraft): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const req = tx.objectStore(STORE_NAME).put(draft);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Silently ignore if IndexedDB is blocked/unavailable
  }
}

async function dbDelete(userId: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const req = tx.objectStore(STORE_NAME).delete(userId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Silently ignore
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useDraftPersistence({
  userId,
  availableLocationIds,
  defaultLocationId,
}: UseDraftPersistenceOptions): UseDraftPersistenceReturn {
  const [promptState, setPromptState] = useState<DraftPromptState>("idle");
  const [pendingDraft, setPendingDraft] = useState<DraftState | null>(null);
  const [hasDraft, setHasDraft] = useState(false);

  // Debounce timer ref
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── On mount: check for existing draft ──────────────────────────────────────
  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    (async () => {
      const persisted = await dbGet(userId);
      if (cancelled) return;
      if (!persisted) return;

      // Expired?
      if (Date.now() - persisted.savedAt > DRAFT_TTL_MS) {
        await dbDelete(userId);
        return;
      }

      // Non-trivial draft (at least one staged file)?
      if (persisted.stagedFiles.length === 0) {
        await dbDelete(userId);
        return;
      }

      // Validate locationId — fall back to default if it's been removed
      const safeLocationId =
        availableLocationIds.includes(persisted.selectedLocationId)
          ? persisted.selectedLocationId
          : defaultLocationId;

      const draft: DraftState = {
        ...persisted,
        selectedLocationId: safeLocationId,
      };

      setPendingDraft(draft);
      setPromptState("prompting");
    })();

    return () => {
      cancelled = true;
    };
    // Only run on mount (userId is stable per session)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // ── beforeunload warning ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasDraft) {
        e.preventDefault();
        // Modern browsers ignore custom messages but still show native dialog
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasDraft]);

  // ── saveDraft (debounced) ───────────────────────────────────────────────────
  const saveDraft = useCallback(
    (state: DraftState) => {
      if (!userId) return;

      // Update hasDraft immediately (for beforeunload guard)
      setHasDraft(state.stagedFiles.length > 0);

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        if (state.stagedFiles.length === 0) {
          // Nothing to persist — clear any stale draft
          await dbDelete(userId);
          return;
        }
        await dbPut({
          ...state,
          userId,
          savedAt: Date.now(),
        });
      }, DEBOUNCE_MS);
    },
    [userId]
  );

  // ── acceptDraft ─────────────────────────────────────────────────────────────
  const acceptDraft = useCallback((): DraftState | null => {
    const draft = pendingDraft;
    setPromptState("dismissed");
    setPendingDraft(null);
    if (draft) setHasDraft(draft.stagedFiles.length > 0);
    return draft;
  }, [pendingDraft]);

  // ── discardDraft ────────────────────────────────────────────────────────────
  const discardDraft = useCallback(() => {
    setPromptState("dismissed");
    setPendingDraft(null);
    setHasDraft(false);
    if (userId) dbDelete(userId);
  }, [userId]);

  // ── clearDraft (call after successful submission) ───────────────────────────
  const clearDraft = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setHasDraft(false);
    if (userId) dbDelete(userId);
  }, [userId]);

  return {
    promptState,
    pendingDraft,
    acceptDraft,
    discardDraft,
    saveDraft,
    clearDraft,
    hasDraft,
  };
}
