/**
 * usePrinter.ts
 *
 * Custom React hook that manages a persistent WebSocket connection to the
 * local Python print daemon, exposes printer settings state, and dispatches
 * print jobs.
 *
 * Features:
 *  - Auto-connects on mount and auto-reconnects every 5 s on drop
 *  - Fetches available printers on connect
 *  - Manages targetPrinter / copies / duplex settings state
 *  - handlePrint(base64Data) dispatches the print job
 *  - Surfaces success / error notifications from the daemon
 *  - Fully type-safe; no `any`
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PRINTER_CONFIG } from "@/lib/printerConfig";

// ─── Types ──────────────────────────────────────────────────────────────────

export type DuplexMode = "single" | "duplex" | "duplexshort";

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

export interface PrinterNotification {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

export interface PrintDispatchOptions {
  targetPrinter?: string;
  copies?: number;
  duplex?: DuplexMode;
}

// Incoming message shapes from the Python daemon
interface PrintersReadyMessage {
  status: "ready";
  printers: string[];
  default: string;
}

interface PrintStatusMessage {
  status: "success" | "error";
  message: string;
}

type DaemonMessage = PrintersReadyMessage | PrintStatusMessage;

// Outgoing message shapes
interface GetPrintersPayload {
  action: "get_printers";
}

interface PrintFilePayload {
  action: "print_file";
  target_printer: string;
  base64_data: string;
  options: {
    copies: number;
    duplex: DuplexMode;
  };
}

type OutgoingPayload = GetPrintersPayload | PrintFilePayload;

// ─── Return type ─────────────────────────────────────────────────────────────

export interface UsePrinterReturn {
  /** Current WebSocket connection state */
  connectionStatus: ConnectionStatus;
  /** List of printers reported by the daemon */
  printers: string[];
  /** Currently selected target printer */
  targetPrinter: string;
  setTargetPrinter: (printer: string) => void;
  /** Number of copies to print */
  copies: number;
  setCopies: (copies: number) => void;
  /** Duplex mode */
  duplex: DuplexMode;
  setDuplex: (mode: DuplexMode) => void;
  /** Whether a print job is currently in-flight */
  isPrinting: boolean;
  /** Active notification banners */
  notifications: PrinterNotification[];
  /** Dismiss a specific notification by id */
  dismissNotification: (id: string) => void;
  /** Dispatch a print job with a base64-encoded PDF */
  handlePrint: (base64Data: string, options?: PrintDispatchOptions) => boolean;
  /** Force a manual reconnect attempt */
  reconnect: () => void;
}

// ─── Helper ──────────────────────────────────────────────────────────────────

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function usePrinter(): UsePrinterReturn {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const [printers, setPrinters] = useState<string[]>([]);
  const [targetPrinter, setTargetPrinter] = useState<string>("");
  const [copies, setCopies] = useState<number>(1);
  const [duplex, setDuplex] = useState<DuplexMode>("single");
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<PrinterNotification[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const isUnmountedRef = useRef<boolean>(false);

  // ── Notification helpers ─────────────────────────────────────────────────

  const pushNotification = useCallback(
    (type: PrinterNotification["type"], message: string) => {
      const id = generateId();
      setNotifications((prev) => [...prev, { id, type, message }]);

      // Auto-dismiss after 6 seconds
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, 6_000);
    },
    []
  );

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // ── Send helper ──────────────────────────────────────────────────────────

  const send = useCallback((payload: OutgoingPayload) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  // ── Message handler ──────────────────────────────────────────────────────

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      let parsed: DaemonMessage;

      try {
        parsed = JSON.parse(event.data as string) as DaemonMessage;
      } catch {
        console.warn("[usePrinter] Received non-JSON message:", event.data);
        return;
      }

      if (parsed.status === "ready") {
        const msg = parsed as PrintersReadyMessage;
        setPrinters(msg.printers);
        setTargetPrinter(msg.default ?? msg.printers[0] ?? "");
        setIsPrinting(false);
      } else if (parsed.status === "success") {
        setIsPrinting(false);
        pushNotification("success", (parsed as PrintStatusMessage).message);
      } else if (parsed.status === "error") {
        setIsPrinting(false);
        pushNotification("error", (parsed as PrintStatusMessage).message);
      }
    },
    [pushNotification]
  );

  // ── WebSocket lifecycle ──────────────────────────────────────────────────

  const connect = useCallback(() => {
    // Bail if already open or connecting
    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    // Clear any pending reconnect timer
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    setConnectionStatus("connecting");

    let ws: WebSocket;
    try {
      ws = new WebSocket(PRINTER_CONFIG.wsUrl as string);
    } catch (err) {
      console.error("[usePrinter] Failed to create WebSocket:", err);
      setConnectionStatus("error");
      scheduleReconnect();
      return;
    }

    wsRef.current = ws;

    ws.onopen = () => {
      if (isUnmountedRef.current) return;
      reconnectAttemptsRef.current = 0;
      setConnectionStatus("connected");
      // Immediately request printer list
      send({ action: "get_printers" });
    };

    ws.onmessage = handleMessage;

    ws.onerror = (evt) => {
      console.error("[usePrinter] WebSocket error:", evt);
      setConnectionStatus("error");
    };

    ws.onclose = () => {
      if (isUnmountedRef.current) return;
      setConnectionStatus("disconnected");
      setIsPrinting(false);
      scheduleReconnect();
    };
  }, [handleMessage, send]); // scheduleReconnect defined below — forward ref via closure

  // ── Reconnect scheduler ──────────────────────────────────────────────────

  // eslint-disable-next-line react-hooks/exhaustive-deps
  function scheduleReconnect() {
    if (isUnmountedRef.current) return;
    const max = PRINTER_CONFIG.maxReconnectAttempts;
    if (max > 0 && reconnectAttemptsRef.current >= max) {
      console.warn("[usePrinter] Max reconnect attempts reached.");
      return;
    }
    reconnectAttemptsRef.current += 1;
    reconnectTimerRef.current = setTimeout(() => {
      if (!isUnmountedRef.current) connect();
    }, PRINTER_CONFIG.reconnectIntervalMs);
  }

  // ── Mount / unmount ──────────────────────────────────────────────────────

  useEffect(() => {
    isUnmountedRef.current = false;
    connect();

    return () => {
      isUnmountedRef.current = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
    // connect is stable — only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Public API ───────────────────────────────────────────────────────────

  const handlePrint = useCallback(
    (base64Data: string, options?: PrintDispatchOptions) => {
      const printer = options?.targetPrinter ?? targetPrinter;
      const printCopies = options?.copies ?? copies;
      const printDuplex = options?.duplex ?? duplex;

      if (!printer) {
        pushNotification("error", "No printer selected. Please select a printer first.");
        return false;
      }
      if (connectionStatus !== "connected") {
        pushNotification("error", "Print daemon is offline. Please wait for reconnection.");
        return false;
      }

      setIsPrinting(true);

      const payload: PrintFilePayload = {
        action: "print_file",
        target_printer: printer,
        base64_data: base64Data,
        options: { copies: printCopies, duplex: printDuplex },
      };

      send(payload);
      return true;
    },
    [connectionStatus, copies, duplex, pushNotification, send, targetPrinter]
  );

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    wsRef.current?.close();
    connect();
  }, [connect]);

  return {
    connectionStatus,
    printers,
    targetPrinter,
    setTargetPrinter,
    copies,
    setCopies,
    duplex,
    setDuplex,
    isPrinting,
    notifications,
    dismissNotification,
    handlePrint,
    reconnect,
  };
}
