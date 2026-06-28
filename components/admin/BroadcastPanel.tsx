"use client";

/**
 * BroadcastPanel
 * ──────────────
 * Floating action button + modal that lets admins send broadcast
 * notifications to all users.
 */

import React, { useState, useRef, useEffect } from "react";

// ─── Icons ────────────────────────────────────────────────────────────────────

const MegaphoneIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 1 1 0-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 0 1-1.44-4.282m3.102.069a18.03 18.03 0 0 1-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 0 1 8.835 2.535M10.34 6.66a23.847 23.847 0 0 1 8.835-2.535m0 0A23.74 23.74 0 0 1 18.795 3m.38 1.125a23.91 23.91 0 0 1 1.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 0 0 1.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 0 1 0 3.46"
    />
  </svg>
);

const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// ─── Suggested presets ────────────────────────────────────────────────────────

const PRESETS = [
  { title: "System Maintenance", message: "The printing system will undergo scheduled maintenance. Please collect your prints before 5 PM today." },
  { title: "Queue Cleared", message: "All pending print jobs have been cleared. Please re-submit your jobs. We apologize for the inconvenience." },
  { title: "Back Online", message: "Printing services are back online after maintenance. You can now submit and collect your print jobs." },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BroadcastPanel() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close modal on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const handleClose = () => {
    if (sending) return;
    setOpen(false);
    setTimeout(() => {
      setTitle("");
      setMessage("");
      setError("");
      setSent(false);
    }, 300);
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      setError("Both title and message are required.");
      return;
    }
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/admin/notifications/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), message: message.trim() }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to send broadcast.");
      }
      setSent(true);
      setTimeout(() => handleClose(), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error.");
    } finally {
      setSending(false);
    }
  };

  const applyPreset = (preset: (typeof PRESETS)[0]) => {
    setTitle(preset.title);
    setMessage(preset.message);
    setError("");
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        id="broadcast-panel-btn"
        onClick={() => setOpen(true)}
        title="Send broadcast notification"
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-xl shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95"
        style={{ animation: "fab-pop 0.4s cubic-bezier(0.34,1.56,0.64,1)" }}
      >
        <style>{`
          @keyframes fab-pop {
            from { opacity: 0; transform: scale(0.8) translateY(12px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>
        <MegaphoneIcon />
        <span className="hidden sm:inline">Broadcast</span>
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          ref={overlayRef}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
          onClick={(e) => { if (e.target === overlayRef.current) handleClose(); }}
        >
          <div
            className="w-full max-w-lg rounded-xl overflow-hidden shadow-xl border border-gray-200 bg-white"
            style={{ animation: "modal-in 0.22s cubic-bezier(0.16,1,0.3,1)" }}
          >
            <style>{`
              @keyframes modal-in {
                from { opacity: 0; transform: scale(0.95) translateY(12px); }
                to   { opacity: 1; transform: scale(1) translateY(0); }
              }
            `}</style>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                  <MegaphoneIcon />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Broadcast Message</p>
                  <p className="text-xs text-gray-400">Sent to all connected users</p>
                </div>
              </div>
              <button onClick={handleClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                <XIcon />
              </button>
            </div>

            {/* Body */}
            {sent ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="w-14 h-14 rounded-2xl bg-green-50 border border-green-100 flex items-center justify-center text-2xl">📢</div>
                <p className="text-sm font-semibold text-green-700">Broadcast sent!</p>
                <p className="text-xs text-gray-400">All users will be notified in real-time.</p>
              </div>
            ) : (
              <div className="px-6 py-5 space-y-4">
                {/* Quick presets */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-500">Quick Presets</p>
                  <div className="flex flex-wrap gap-2">
                    {PRESETS.map((p) => (
                      <button key={p.title} onClick={() => applyPreset(p)}
                        className="text-xs px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-200 text-gray-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-colors font-medium">
                        {p.title}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-700">Title <span className="text-red-500">*</span></label>
                  <input id="broadcast-title-input" type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. System Maintenance" maxLength={80}
                    className="w-full bg-white border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 text-gray-900 placeholder-gray-400 text-sm rounded-lg px-3.5 py-2.5 focus:outline-none transition-all" />
                  <p className="text-right text-[10px] text-gray-400">{title.length}/80</p>
                </div>

                {/* Message */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-700">Message <span className="text-red-500">*</span></label>
                  <textarea id="broadcast-message-input" value={message} onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your announcement here…" maxLength={500} rows={4}
                    className="w-full bg-white border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 text-gray-900 placeholder-gray-400 text-sm rounded-lg px-3.5 py-2.5 focus:outline-none transition-all resize-none" />
                  <p className="text-right text-[10px] text-gray-400">{message.length}/500</p>
                </div>

                {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">⚠ {error}</div>}

                {/* Preview */}
                {(title || message) && (
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-1">
                    <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Preview</p>
                    <div className="flex items-start gap-2.5 mt-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center text-xs flex-shrink-0">📢</div>
                      <div>
                        <p className="text-xs font-semibold text-gray-900">{title || "—"}</p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{message || "—"}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            {!sent && (
              <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-100">
                <button onClick={handleClose}
                  className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors">
                  Cancel
                </button>
                <button id="broadcast-send-btn" onClick={handleSend} disabled={sending || !title.trim() || !message.trim()}
                  className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-medium transition-all flex items-center justify-center gap-2 shadow-sm">
                  {sending ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Sending…</>
                  ) : (
                    <><MegaphoneIcon />Send to All</>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
