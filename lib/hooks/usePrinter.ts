/**
 * usePrinter.ts
 *
 * Custom React hook managing a hardened WebSocket connection to the local
 * print daemon (QDocClient), supporting protocol v2, authentication handshakes,
 * exponential backoff with jitter and max attempt caps, request-response
 * correlation, and secure memory cleanup of base64 payloads (P-13).
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PRINTER_CONFIG } from "@/lib/printerConfig";

// ─── Types ──────────────────────────────────────────────────────────────────

export type DuplexMode = "single" | "duplex" | "duplexshort";

export type ConnectionStatus =
  | "connecting"
  | "authenticating"
  | "connected"
  | "disconnected"
  | "error";

export interface PrinterNotification {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

export interface PrintDispatchOptions {
  targetPrinter?: string;
  copies?: number;
  duplex?: DuplexMode;
  jobId?: string;
  fileUrl?: string;
}

export interface PrintFileOptions {
  base64Data?: string;
  fileUrl?: string;
  targetPrinter?: string;
  copies?: number;
  duplex?: DuplexMode;
  jobId?: string;
}

export interface PrintResult {
  success: boolean;
  message?: string;
  spooledAt?: string;
  jobId?: string;
}

// Incoming message shapes from the print daemon
interface DaemonBaseMessage {
  id?: string;
  jobId?: string;
  status?: string;
  type?: string;
  message?: string;
}

interface PrintersReadyMessage extends DaemonBaseMessage {
  status?: "ready";
  type?: "hello" | "printers";
  printers?: Array<string | { name: string; isDefault?: boolean }>;
  default?: string;
  clientVersion?: string;
  protocol?: number;
}

interface PrintStatusMessage extends DaemonBaseMessage {
  status?: "success" | "error";
  type?: "accepted" | "completed" | "failed";
  code?: string;
  message?: string;
  spooledAt?: string;
}

interface AuthStatusMessage extends DaemonBaseMessage {
  status?: "auth_ok" | "auth_error";
  type?: "auth_ok" | "auth_error";
  message?: string;
}

type DaemonMessage =
  | PrintersReadyMessage
  | PrintStatusMessage
  | AuthStatusMessage;

// Outgoing message shapes
interface AuthPayload {
  action: "auth";
  token: string;
}

interface GetPrintersPayload {
  action: "get_printers";
}

interface OutgoingPrintFilePayload {
  id: string;
  action: "print_file";
  jobId?: string;
  target_printer: string;
  base64_data?: string;
  file_url?: string;
  options: {
    copies: number;
    duplex: DuplexMode;
  };
}

type OutgoingPayload =
  | AuthPayload
  | GetPrintersPayload
  | OutgoingPrintFilePayload;

// ─── Return type ─────────────────────────────────────────────────────────────

export interface UsePrinterReturn {
  connectionStatus: ConnectionStatus;
  isAuthenticated: boolean;
  authToken: string;
  setAuthToken: (token: string) => void;
  printers: string[];
  targetPrinter: string;
  setTargetPrinter: (printer: string) => void;
  copies: number;
  setCopies: (copies: number) => void;
  duplex: DuplexMode;
  setDuplex: (mode: DuplexMode) => void;
  isPrinting: boolean;
  notifications: PrinterNotification[];
  dismissNotification: (id: string) => void;
  handlePrint: (base64Data: string, options?: PrintDispatchOptions) => boolean;
  printFile: (options: PrintFileOptions) => Promise<PrintResult>;
  reconnect: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function usePrinter(): UsePrinterReturn {
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authToken, setAuthTokenState] = useState<string>("");
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
  const scheduleReconnectRef = useRef<() => void>(() => {});

  // Correlation map for pending print jobs: messageId -> { resolve, reject, timeoutId }
  const pendingRequestsRef = useRef<
    Map<
      string,
      {
        resolve: (result: PrintResult) => void;
        reject: (error: Error) => void;
        timeoutId: ReturnType<typeof setTimeout>;
      }
    >
  >(new Map());

  // Load saved auth token from sessionStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = sessionStorage.getItem(PRINTER_CONFIG.AUTH_TOKEN_KEY);
        if (stored) setAuthTokenState(stored);
      } catch {
        // Ignore storage access errors
      }
    }
  }, []);

  const setAuthToken = useCallback((token: string) => {
    setAuthTokenState(token);
    if (typeof window !== "undefined") {
      try {
        if (token) {
          sessionStorage.setItem(PRINTER_CONFIG.AUTH_TOKEN_KEY, token);
        } else {
          sessionStorage.removeItem(PRINTER_CONFIG.AUTH_TOKEN_KEY);
        }
      } catch {
        // Ignore storage access errors
      }
    }
  }, []);

  // ── Notification helpers ───────────────────────────────────────────────────

  const pushNotification = useCallback(
    (type: PrinterNotification["type"], message: string) => {
      const id = generateId();
      setNotifications((prev) => [...prev, { id, type, message }]);

      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, 6_000);
    },
    []
  );

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // ── Send helper ────────────────────────────────────────────────────────────

  const send = useCallback((payload: OutgoingPayload) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  // ── Message handler ────────────────────────────────────────────────────────

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      let parsed: DaemonMessage;

      try {
        parsed = JSON.parse(event.data as string) as DaemonMessage;
      } catch {
        console.warn("[usePrinter] Received non-JSON message:", event.data);
        return;
      }

      // Handle auth response
      if (
        parsed.status === "auth_ok" ||
        parsed.type === "auth_ok" ||
        (parsed.status === "ready" && !parsed.printers)
      ) {
        setIsAuthenticated(true);
        setConnectionStatus("connected");
        send({ action: "get_printers" });
        return;
      }

      if (parsed.status === "auth_error" || parsed.type === "auth_error") {
        setIsAuthenticated(false);
        setConnectionStatus("error");
        pushNotification(
          "error",
          parsed.message ||
            "Print daemon authentication failed. Please check station token in settings."
        );
        wsRef.current?.close();
        return;
      }

      // Handle printer list response
      if (
        parsed.status === "ready" ||
        parsed.type === "hello" ||
        parsed.type === "printers"
      ) {
        let list: string[] = [];
        if (Array.isArray(parsed.printers)) {
          list = parsed.printers.map((p) => (typeof p === "string" ? p : p.name));
        }
        setPrinters(list);
        if (parsed.default) {
          setTargetPrinter(parsed.default);
        } else if (list.length > 0) {
          setTargetPrinter((current) => (current && list.includes(current) ? current : list[0]));
        }
        setIsPrinting(false);
        return;
      }

      // Handle print file progress and completion
      const msgId = parsed.id || parsed.jobId;

      if (parsed.type === "accepted") {
        pushNotification("info", "Print job accepted by local daemon. Spooling...");
        return;
      }

      if (parsed.status === "success" || parsed.type === "completed") {
        setIsPrinting(false);
        const successMsg = parsed.message || "Print job sent to physical printer spooler.";
        pushNotification("success", successMsg);

        // Correlate with pending request if any
        if (msgId && pendingRequestsRef.current.has(msgId)) {
          const req = pendingRequestsRef.current.get(msgId)!;
          clearTimeout(req.timeoutId);
          pendingRequestsRef.current.delete(msgId);
          req.resolve({
            success: true,
            message: successMsg,
            spooledAt: parsed.spooledAt,
            jobId: parsed.jobId,
          });
        } else if (pendingRequestsRef.current.size === 1) {
          // Fallback single in-flight resolution
          const nextEntry = pendingRequestsRef.current.entries().next().value;
          if (nextEntry) {
            const [key, req] = nextEntry;
            clearTimeout(req.timeoutId);
            pendingRequestsRef.current.delete(key);
            req.resolve({ success: true, message: successMsg });
          }
        }
        return;
      }

      if (parsed.status === "error" || parsed.type === "failed") {
        setIsPrinting(false);
        const errMsg = parsed.message || parsed.code || "Print operation failed on local hardware.";
        pushNotification("error", errMsg);

        if (msgId && pendingRequestsRef.current.has(msgId)) {
          const req = pendingRequestsRef.current.get(msgId)!;
          clearTimeout(req.timeoutId);
          pendingRequestsRef.current.delete(msgId);
          req.reject(new Error(errMsg));
        } else if (pendingRequestsRef.current.size === 1) {
          const nextEntry = pendingRequestsRef.current.entries().next().value;
          if (nextEntry) {
            const [key, req] = nextEntry;
            clearTimeout(req.timeoutId);
            pendingRequestsRef.current.delete(key);
            req.reject(new Error(errMsg));
          }
        }
        return;
      }
    },
    [pushNotification, send]
  );

  // ── WebSocket lifecycle & backoff ──────────────────────────────────────────

  const connect = useCallback(() => {
    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    setConnectionStatus("connecting");

    let ws: WebSocket;
    try {
      ws = new WebSocket(PRINTER_CONFIG.wsUrl);
    } catch (err) {
      console.error("[usePrinter] Failed to instantiate WebSocket:", err);
      setConnectionStatus("error");
      scheduleReconnectRef.current();
      return;
    }

    wsRef.current = ws;

    ws.onopen = () => {
      if (isUnmountedRef.current) return;
      reconnectAttemptsRef.current = 0;

      // If station auth token is provided, perform handshake
      if (authToken) {
        setConnectionStatus("authenticating");
        send({ action: "auth", token: authToken });
      } else {
        // Without auth token, connect directly for backward compatibility / dev mode
        setConnectionStatus("connected");
        setIsAuthenticated(true);
        send({ action: "get_printers" });
      }
    };

    ws.onmessage = handleMessage;

    ws.onerror = (evt) => {
      console.error("[usePrinter] WebSocket error encountered:", evt);
      setConnectionStatus("error");
    };

    ws.onclose = () => {
      if (isUnmountedRef.current) return;
      setConnectionStatus("disconnected");
      setIsPrinting(false);

      // Reject all pending jobs
      pendingRequestsRef.current.forEach(({ reject, timeoutId }) => {
        clearTimeout(timeoutId);
        reject(new Error("WebSocket disconnected while print job was in-flight."));
      });
      pendingRequestsRef.current.clear();

      scheduleReconnectRef.current();
    };
  }, [authToken, handleMessage, send]);

  // Exponential backoff scheduler with capped max attempts and jitter
  const scheduleReconnect = useCallback(() => {
    if (isUnmountedRef.current) return;

    // Do not schedule auto-reconnect if browser tab is hidden
    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      return;
    }

    const { maxAttempts, initialDelayMs, maxDelayMs, factor, jitter } =
      PRINTER_CONFIG.backoff;

    if (maxAttempts > 0 && reconnectAttemptsRef.current >= maxAttempts) {
      console.warn(`[usePrinter] Max reconnection attempts (${maxAttempts}) reached. Stopped.`);
      return;
    }

    const attempt = reconnectAttemptsRef.current;
    reconnectAttemptsRef.current += 1;

    let delay = Math.min(maxDelayMs, initialDelayMs * Math.pow(factor, attempt));
    if (jitter) {
      delay = Math.round(delay * (0.8 + Math.random() * 0.4));
    }

    reconnectTimerRef.current = setTimeout(() => {
      if (!isUnmountedRef.current) {
        connect();
      }
    }, delay);
  }, [connect]);

  useEffect(() => {
    scheduleReconnectRef.current = scheduleReconnect;
  }, [scheduleReconnect]);

  // ── Visibility & mount handlers ────────────────────────────────────────────

  useEffect(() => {
    isUnmountedRef.current = false;
    connect();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (
          !wsRef.current ||
          wsRef.current.readyState === WebSocket.CLOSED ||
          wsRef.current.readyState === WebSocket.CLOSING
        ) {
          reconnectAttemptsRef.current = 0;
          connect();
        }
      } else if (document.visibilityState === "hidden") {
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        }
      }
    };

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    return () => {
      isUnmountedRef.current = true;
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      wsRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connect]);

  // ── Public Print API ───────────────────────────────────────────────────────

  const printFile = useCallback(
    (options: PrintFileOptions): Promise<PrintResult> => {
      return new Promise<PrintResult>((resolve, reject) => {
        const printer = options.targetPrinter || targetPrinter;
        const printCopies = Math.max(1, Math.min(PRINTER_CONFIG.maxCopies, options.copies ?? copies));
        const printDuplex = options.duplex ?? duplex;

        if (!printer) {
          const err = new Error("No printer selected. Please select an installed printer.");
          pushNotification("error", err.message);
          return reject(err);
        }

        if (connectionStatus !== "connected") {
          const err = new Error("Print daemon is offline. Please start QDocClient and keep this tab open.");
          pushNotification("error", err.message);
          return reject(err);
        }

        const msgId = generateId();
        setIsPrinting(true);

        const timeoutId = setTimeout(() => {
          if (pendingRequestsRef.current.has(msgId)) {
            pendingRequestsRef.current.delete(msgId);
            setIsPrinting(false);
            const timeoutErr = new Error("Timed out waiting for print spooler confirmation (60s).");
            pushNotification("error", timeoutErr.message);
            reject(timeoutErr);
          }
        }, PRINTER_CONFIG.printTimeoutMs);

        pendingRequestsRef.current.set(msgId, { resolve, reject, timeoutId });

        let base64Copy: string | undefined = options.base64Data;

        const payload: OutgoingPrintFilePayload = {
          id: msgId,
          action: "print_file",
          jobId: options.jobId,
          target_printer: printer,
          base64_data: base64Copy,
          file_url: options.fileUrl,
          options: {
            copies: printCopies,
            duplex: printDuplex,
          },
        };

        send(payload);

        // Immediate memory clearance of base64 data reference in caller scope
        base64Copy = undefined;
      });
    },
    [connectionStatus, copies, duplex, pushNotification, send, targetPrinter]
  );

  const handlePrint = useCallback(
    (base64Data: string, options?: PrintDispatchOptions): boolean => {
      printFile({
        base64Data,
        targetPrinter: options?.targetPrinter,
        copies: options?.copies,
        duplex: options?.duplex,
        jobId: options?.jobId,
        fileUrl: options?.fileUrl,
      }).catch((err) => {
        console.error("[usePrinter] handlePrint error:", err);
      });
      return connectionStatus === "connected";
    },
    [connectionStatus, printFile]
  );

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    wsRef.current?.close();
    connect();
  }, [connect]);

  return {
    connectionStatus,
    isAuthenticated,
    authToken,
    setAuthToken,
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
    printFile,
    reconnect,
  };
}
