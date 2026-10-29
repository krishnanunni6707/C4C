/**
 * Structured Logger with PII Redaction (P-07).
 * Recursively redacts sensitive fields (passwords, tokens, emails, admission numbers, file URLs, names).
 */

const REDACTED_KEYS = new Set([
  "password",
  "passwordhash",
  "temppassword",
  "passwordsalt",
  "secret",
  "keysecret",
  "webhooksecret",
  "cronsecret",
  "admissionnumber",
  "admission",
  "email",
  "name",
  "studentname",
  "adminname",
  "fileurl",
  "url",
  "signedurl",
  "publicid",
  "cloudinarypublicid",
  "signature",
  "token",
  "razorpaypaymentid",
  "razorpayorderid",
]);

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const URL_REGEX = /https?:\/\/[^\s]+/g;

export function redactPII(val: unknown, depth = 0): unknown {
  if (depth > 6) return "[DEPTH_LIMIT]";
  if (val === null || val === undefined) return val;

  if (typeof val === "string") {
    return val
      .replace(EMAIL_REGEX, "[REDACTED_EMAIL]")
      .replace(URL_REGEX, "[REDACTED_URL]");
  }

  if (typeof val === "number" || typeof val === "boolean") {
    return val;
  }

  if (Array.isArray(val)) {
    return val.map((item) => redactPII(item, depth + 1));
  }

  if (typeof val === "object") {
    const redactedObj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val)) {
      const lowerKey = k.toLowerCase().replace(/[-_]/g, "");
      if (REDACTED_KEYS.has(lowerKey)) {
        redactedObj[k] = "[REDACTED]";
      } else {
        redactedObj[k] = redactPII(v, depth + 1);
      }
    }
    return redactedObj;
  }

  return String(val);
}

export const logger = {
  redact: redactPII,
  info: (message: string, meta?: unknown) => {
    if (meta !== undefined) {
      console.log(`[INFO] ${message}`, redactPII(meta));
    } else {
      console.log(`[INFO] ${redactPII(message)}`);
    }
  },
  warn: (message: string, meta?: unknown) => {
    if (meta !== undefined) {
      console.warn(`[WARN] ${message}`, redactPII(meta));
    } else {
      console.warn(`[WARN] ${redactPII(message)}`);
    }
  },
  error: (message: string, meta?: unknown) => {
    if (meta !== undefined) {
      console.error(`[ERROR] ${message}`, redactPII(meta));
    } else {
      console.error(`[ERROR] ${redactPII(message)}`);
    }
  },
  debug: (message: string, meta?: unknown) => {
    if (process.env.NODE_ENV !== "production") {
      if (meta !== undefined) {
        console.debug(`[DEBUG] ${message}`, redactPII(meta));
      } else {
        console.debug(`[DEBUG] ${redactPII(message)}`);
      }
    }
  },
};
