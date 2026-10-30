"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

interface Props { jobId: string; status: string; paymentStatus: string; }

export default function JobDetailActions({ jobId, status, paymentStatus }: Props) {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState<string | null>(null);

  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";
  const terminal = status === "COLLECTED" || status === "CANCELLED";

  async function act(endpoint: string, payload?: Record<string, unknown>) {
    setLoading(endpoint);
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/${endpoint}`, {
        method: "POST",
        headers: payload ? { "Content-Type": "application/json" } : undefined,
        body: payload ? JSON.stringify(payload) : undefined,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(body.error ?? "Action failed");
        return;
      }
      router.refresh();
    } catch {
      alert("Network error — please try again.");
    } finally { setLoading(null); }
  }

  const busy = loading !== null;

  if (terminal) return <p className="text-sm text-gray-400 py-1">No actions available — job is {status.toLowerCase()}.</p>;

  return (
    <div className="flex flex-col gap-2.5">
      {/* Super Admin Payment Overrides */}
      {isSuperAdmin && paymentStatus === "PENDING" && (
        <ActionBtn
          label="Override Payment (Super Admin)"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          }
          style="primary"
          loading={loading === "payment"}
          disabled={busy}
          onClick={() => {
            const reason = prompt("Enter mandatory reason for payment override (min 5 characters):");
            if (reason && reason.trim().length >= 5) {
              act("payment", { reason: reason.trim() });
            } else if (reason !== null) {
              alert("Reason must be at least 5 characters.");
            }
          }}
        />
      )}
      {isSuperAdmin && paymentStatus === "PAID" && (status === "WAITING" || status === "CANCELLED") && (
        <ActionBtn
          label="Revert Payment (Super Admin)"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
            </svg>
          }
          style="warning"
          loading={loading === "unpay"}
          disabled={busy}
          onClick={() => {
            const reason = prompt("Enter mandatory reason for payment reversal (min 5 characters):");
            if (reason && reason.trim().length >= 5) {
              act("unpay", { reason: reason.trim() });
            } else if (reason !== null) {
              alert("Reason must be at least 5 characters.");
            }
          }}
        />
      )}

      {/* Standard Lifecycle Actions */}
      {paymentStatus === "PAID" && status === "WAITING" && (
        <ActionBtn
          label="Start Printing"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 9V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v5" />
            </svg>
          }
          style="success"
          loading={loading === "start"}
          disabled={busy}
          onClick={() => act("start")}
        />
      )}
      {status === "PRINTING" && (
        <ActionBtn
          label="Mark Ready for Collection"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
            </svg>
          }
          style="indigo"
          loading={loading === "ready"}
          disabled={busy}
          onClick={() => act("ready")}
        />
      )}
      {status === "READY" && (
        <ActionBtn
          label="Mark Collected"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          }
          style="secondary"
          loading={loading === "collect"}
          disabled={busy}
          onClick={() => act("collect")}
        />
      )}
      <ActionBtn
        label="Cancel Job"
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        }
        style="danger"
        loading={loading === "cancel"}
        disabled={busy}
        onClick={() => {
          const reason = prompt("Enter cancellation reason (optional):");
          if (reason !== null) {
            act("cancel", reason.trim() ? { reason: reason.trim() } : undefined);
          }
        }}
      />
    </div>
  );
}

function ActionBtn({ label, icon, style, loading, disabled, onClick }: {
  label: string; icon?: React.ReactNode; style: "primary" | "success" | "warning" | "indigo" | "secondary" | "danger";
  loading: boolean; disabled: boolean; onClick: () => void;
}) {
  const styles = {
    primary:   "bg-blue-600 hover:bg-blue-700 text-white border-0",
    success:   "bg-green-600 hover:bg-green-700 text-white border-0",
    warning:   "bg-orange-50 border border-orange-200 text-orange-700 hover:bg-orange-100",
    indigo:    "bg-indigo-600 hover:bg-indigo-700 text-white border-0",
    secondary: "bg-gray-600 hover:bg-gray-700 text-white border-0",
    danger:    "bg-red-50 border border-red-200 text-red-700 hover:bg-red-100",
  };
  return (
    <button className={`w-full text-sm font-medium px-4 py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-40 ${styles[style]}`}
      disabled={disabled} onClick={onClick}>
      {loading ? (
        "Working…"
      ) : (
        <>
          {icon}
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
