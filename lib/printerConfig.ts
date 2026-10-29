/*
 * Printer WebSocket Configuration & Hardening (P-13)
 */

export const PRINTER_CONFIG = {
  /** Default WebSocket URL - strictly localhost loopback */
  defaultWsUrl: "ws://127.0.0.1:8765",

  /**
   * Resolve WebSocket URL, strictly enforcing local loopback connection
   * (never allows binding or connecting to external 0.0.0.0 or remote hosts)
   */
  get wsUrl(): string {
    const configured = process.env.NEXT_PUBLIC_PRINTER_WS_URL;
    if (!configured) return this.defaultWsUrl;

    try {
      const url = new URL(configured);
      if (
        url.hostname !== "127.0.0.1" &&
        url.hostname !== "localhost" &&
        url.hostname !== "[::1]"
      ) {
        console.warn(
          `[PRINTER_CONFIG] Non-loopback WebSocket URL "${configured}" rejected. Defaulting to 127.0.0.1:8765.`
        );
        return this.defaultWsUrl;
      }
      return configured;
    } catch {
      return this.defaultWsUrl;
    }
  },

  /** Reconnect backoff parameters */
  backoff: {
    initialDelayMs: 1_000,
    maxDelayMs: 30_000,
    factor: 1.5,
    maxAttempts: 10,
    jitter: true,
  },

  /** Storage key for station auth token in sessionStorage */
  AUTH_TOKEN_KEY: "qdoc_daemon_auth_token",

  /** Protocol limits */
  maxPayloadBytes: 32 * 1024 * 1024, // 32 MiB max payload
  maxCopies: 99,
  printTimeoutMs: 60_000, // 60s timeout for spooler reply
  reconnectIntervalMs: 5_000, // legacy fallback
  maxReconnectAttempts: 10,
} as const;

