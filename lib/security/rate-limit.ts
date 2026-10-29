/**
 * Rate limiting helper using Firestore counters with memory fallback.
 */

import { adminDb } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";

export interface RateLimitConfig {
  key: string;
  maxAttempts: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

// In-memory fallback if Firestore fails or in memory-only test environments
const memoryStore = new Map<string, { count: number; windowStart: number }>();

export async function checkRateLimit(config: RateLimitConfig): Promise<RateLimitResult> {
  const { key, maxAttempts, windowSeconds } = config;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  try {
    const docRef = adminDb.collection("rateLimits").doc(key.replace(/[/\\#?]/g, "_"));

    return await adminDb.runTransaction(async (transaction) => {
      const snap = await transaction.get(docRef);

      if (!snap.exists) {
        transaction.set(docRef, {
          count: 1,
          windowStart: Timestamp.fromMillis(now),
          expiresAt: Timestamp.fromMillis(now + windowMs),
        });
        return { allowed: true, remaining: maxAttempts - 1, retryAfterSeconds: 0 };
      }

      const data = snap.data();
      const windowStartMs = data?.windowStart?.toMillis?.() ?? now;

      if (now - windowStartMs >= windowMs) {
        transaction.set(docRef, {
          count: 1,
          windowStart: Timestamp.fromMillis(now),
          expiresAt: Timestamp.fromMillis(now + windowMs),
        });
        return { allowed: true, remaining: maxAttempts - 1, retryAfterSeconds: 0 };
      }

      const currentCount = (data?.count as number) || 0;
      if (currentCount >= maxAttempts) {
        const retryAfterSeconds = Math.ceil((windowStartMs + windowMs - now) / 1000);
        return {
          allowed: false,
          remaining: 0,
          retryAfterSeconds: Math.max(1, retryAfterSeconds),
        };
      }

      transaction.update(docRef, {
        count: currentCount + 1,
      });

      return {
        allowed: true,
        remaining: maxAttempts - (currentCount + 1),
        retryAfterSeconds: 0,
      };
    });
  } catch {
    // Fall back to memory store if Firestore is unavailable (e.g. offline unit test)
    const entry = memoryStore.get(key);
    if (!entry || now - entry.windowStart >= windowMs) {
      memoryStore.set(key, { count: 1, windowStart: now });
      return { allowed: true, remaining: maxAttempts - 1, retryAfterSeconds: 0 };
    }

    if (entry.count >= maxAttempts) {
      const retryAfterSeconds = Math.ceil((entry.windowStart + windowMs - now) / 1000);
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, retryAfterSeconds),
      };
    }

    entry.count += 1;
    return {
      allowed: true,
      remaining: maxAttempts - entry.count,
      retryAfterSeconds: 0,
    };
  }
}
