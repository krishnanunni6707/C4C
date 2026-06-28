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

  async function act(endpoint: string) {
    setLoading(endpoint);
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/${endpoint}`, { method: "POST" });
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

  if (isSuperAdmin) return <p className="text-sm text-gray-400 py-1">No actions available — Super Admin view.</p>;
  if (terminal) return <p className="text-sm text-gray-400 py-1">No actions available — job is {status.toLowerCase()}.</p>;

  return (
    <div className="flex flex-col gap-2.5">
      {paymentStatus === "PENDING" && (
        <ActionBtn label="✅ Mark Payment Paid" style="primary"
          loading={loading === "payment"} disabled={busy} onClick={() => act("payment")} />
      )}
      {paymentStatus === "PAID" && (
        <ActionBtn label="❌ Mark Payment Unpaid" style="warning"
          loading={loading === "unpay"} disabled={busy} onClick={() => act("unpay")} />
      )}
      {paymentStatus === "PAID" && status === "WAITING" && (
        <ActionBtn label="🖨️ Start Printing" style="success"
          loading={loading === "start"} disabled={busy} onClick={() => act("start")} />
      )}
      {status === "PRINTING" && (
        <ActionBtn label="📦 Mark Ready for Collection" style="indigo"
          loading={loading === "ready"} disabled={busy} onClick={() => act("ready")} />
      )}
      {status === "READY" && (
        <ActionBtn label="🤝 Mark Collected" style="secondary"
          loading={loading === "collect"} disabled={busy} onClick={() => act("collect")} />
      )}
      <ActionBtn label="✕ Cancel Job" style="danger"
        loading={loading === "cancel"} disabled={busy}
        onClick={() => { if (confirm("Cancel this job? This cannot be undone.")) act("cancel"); }} />
    </div>
  );
}

function ActionBtn({ label, style, loading, disabled, onClick }: {
  label: string; style: "primary" | "success" | "warning" | "indigo" | "secondary" | "danger";
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
    <button className={`w-full text-sm font-medium px-4 py-2.5 rounded-lg transition-colors disabled:opacity-40 ${styles[style]}`}
      disabled={disabled} onClick={onClick}>
      {loading ? "Working…" : label}
    </button>
  );
}
