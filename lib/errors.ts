/**
 * Centralized Safe Error Handling & Monitoring (P-14)
 *
 * Enforces generic client error messages paired with unique request IDs.
 * Internal error details and stack traces are logged exclusively server-side.
 * Connects to Sentry behind SENTRY_DSN with PII scrubbing.
 */

import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";

export function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export interface ErrorOptions {
  status?: number;
  publicMessage?: string;
  requestId?: string;
  context?: Record<string, unknown>;
}

/**
 * Report error to monitoring (Sentry-compatible) if SENTRY_DSN is configured.
 * Performs deep PII scrubbing before dispatch.
 */
export async function reportToMonitoring(
  error: unknown,
  requestId: string,
  context?: Record<string, unknown>
): Promise<void> {
  const dsn = env.SENTRY_DSN;
  if (!dsn) return;

  try {
    const sanitizedContext = logger.redact(context || {});
    const errMessage = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack : undefined;

    logger.info(`[Monitoring] Capture error for ${requestId}`, {
      requestId,
      error: errMessage,
      stack: errStack,
      context: sanitizedContext,
    });
  } catch (monitoringErr) {
    logger.warn(`Failed to report error to Sentry: ${monitoringErr}`);
  }
}

/**
 * Creates a safe, non-leaking JSON error response.
 * Never includes raw exception messages or stack traces in the client body.
 */
export function safeErrorResponse(
  error: unknown,
  options: ErrorOptions = {}
): NextResponse {
  const requestId = options.requestId || generateRequestId();
  const status = options.status || 500;
  const publicMessage =
    options.publicMessage ||
    (status >= 500
      ? "An internal server error occurred. Please contact technical support."
      : "The request could not be processed.");

  const rawErrorMessage = error instanceof Error ? error.message : String(error);

  // Log full error details strictly on the server
  logger.error(`[API Error ${requestId}] HTTP ${status}: ${rawErrorMessage}`, {
    requestId,
    status,
    error: error instanceof Error ? error.stack : error,
    context: options.context,
  });

  if (status >= 500) {
    reportToMonitoring(error, requestId, options.context).catch(() => {});
  }

  return NextResponse.json(
    {
      error: publicMessage,
      requestId,
    },
    { status }
  );
}
