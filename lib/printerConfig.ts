/*
 * Printer WebSocket Configuration
 */

export const PRINTER_CONFIG = {
  wsUrl: process.env.NEXT_PUBLIC_PRINTER_WS_URL,
  reconnectIntervalMs: 5_000,
  maxReconnectAttempts: 0,
} as const;
