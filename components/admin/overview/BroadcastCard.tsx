"use client";

import React, { useState } from "react";
import { Megaphone, Send, X, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { z } from "zod";

const broadcastSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(80, "Title must be at most 80 characters"),
  message: z
    .string()
    .trim()
    .min(1, "Message is required")
    .max(500, "Message must be at most 500 characters"),
});

interface BroadcastCardProps {
  className?: string;
}

export default function BroadcastCard({ className = "" }: BroadcastCardProps) {
  const [title, setTitle] = useState("Maintenance Notice");
  const [message, setMessage] = useState(
    "Print services will be down for maintenance on 31 Oct, 10 AM to 12 PM."
  );

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleClear = () => {
    setTitle("");
    setMessage("");
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleValidateAndOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const validation = broadcastSchema.safeParse({ title, message });
    if (!validation.success) {
      setErrorMsg(validation.error.issues[0]?.message || "Validation failed");
      return;
    }

    setIsConfirmOpen(true);
  };

  const handleConfirmSend = async () => {
    setIsSending(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/admin/notifications/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), message: message.trim() }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Failed to broadcast message");
      }

      setSuccessMsg("Broadcast sent to all students successfully!");
      setIsConfirmOpen(false);
      // Reset form after short delay
      setTimeout(() => {
        setTitle("");
        setMessage("");
      }, 1000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error sending broadcast");
      setIsConfirmOpen(false);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      className={`bg-white rounded-[16px] border border-slate-200/80 p-5 shadow-sm flex flex-col justify-between ${className}`}
    >
      <div>
        {/* Header */}
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-3">
          <Megaphone className="w-5 h-5 text-indigo-600" />
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Broadcast Message
          </h2>
        </div>

        {/* Composer Box */}
        <form onSubmit={handleValidateAndOpenConfirm} className="space-y-3">
          <div className="bg-indigo-50/70 border border-indigo-100/80 rounded-2xl p-4 relative transition-all focus-within:ring-2 focus-within:ring-indigo-500/20">
            {/* Clear Button */}
            {(title || message) && (
              <button
                type="button"
                onClick={handleClear}
                aria-label="Clear message"
                className="absolute top-3.5 right-3.5 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-indigo-100/50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Title Input */}
            <input
              type="text"
              id="broadcast-title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setErrorMsg(null);
              }}
              placeholder="Notice Title"
              maxLength={80}
              className="w-full bg-transparent font-bold text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none mb-1.5 pr-6"
            />

            {/* Message Body */}
            <textarea
              id="broadcast-message"
              rows={3}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setErrorMsg(null);
              }}
              placeholder="Compose a broadcast message for all campus students..."
              maxLength={500}
              className="w-full bg-transparent text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none resize-none leading-relaxed"
            />
          </div>

          {/* Feedback messages */}
          {errorMsg && (
            <div className="flex items-center gap-1.5 text-xs text-rose-600 font-medium px-1">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium px-1">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Send Button */}
          <button
            type="submit"
            id="broadcast-send-btn"
            disabled={isSending || (!title && !message)}
            className="w-full py-2.5 px-4 rounded-xl border border-indigo-200 text-indigo-600 hover:bg-indigo-50/80 font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500/20 active:scale-[0.99]"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4 text-indigo-600" />
                <span>Send Message</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Confirmation Modal Dialog */}
      {isConfirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150">
            <h3 id="confirm-modal-title" className="text-base font-bold text-slate-900">
              Send to all students?
            </h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              This message will be instantly delivered as a system broadcast notification to all students across campus.
            </p>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 mt-3 text-xs">
              <p className="font-bold text-slate-800">{title}</p>
              <p className="text-slate-600 text-[11px] mt-0.5 line-clamp-2">{message}</p>
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSend}
                disabled={isSending}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors flex items-center gap-1.5 shadow-sm"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Broadcasting...</span>
                  </>
                ) : (
                  <span>Confirm & Send</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
