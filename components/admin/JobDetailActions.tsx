"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

interface Props {
  jobId: string;
  status: string;
  paymentStatus: string;
}

export default function JobDetailActions({ jobId, status, paymentStatus }: Props) {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState<string | null>(null);

  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";
  const terminal = status === "COLLECTED" || status === "CANCELLED";

  async function act(endpoint: string) {
    setLoading(endpoint);
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/${endpoint}`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(body.error ?? "Action failed");
        return;
      }
      router.refresh();
    } catch {
      alert("Network error — please try again.");
    } finally {
      setLoading(null);
    }
  }

  const busy = loading !== null;

  if (isSuperAdmin) {
    return (
      <p className="text-xs text-gray-500 py-1 font-mono">
        No actions available — Super Admin view.
      </p>
    );
  }

  if (terminal) {
    return (
      <p className="text-xs text-gray-500 py-1 font-mono">
        No actions available — job is {status.toLowerCase()}.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {paymentStatus === "PENDING" && (
        <Btn label="✅ Mark Payment Paid" color="bg-blue-600/80 hover:bg-blue-600 border-0"
          loading={loading === "payment"} disabled={busy} onClick={() => act("payment")} />
      )}
      {paymentStatus === "PAID" && (
        <Btn label="❌ Mark Payment Unpaid" color="bg-orange-500/10 border border-orange-500/20 text-orange-400 hover:bg-orange-500/20"
          loading={loading === "unpay"} disabled={busy} onClick={() => act("unpay")} />
      )}
      {paymentStatus === "PAID" && status === "WAITING" && (
        <Btn label="🖨️ Start Printing" color="bg-green-600/80 hover:bg-green-600 border-0"
          loading={loading === "start"} disabled={busy} onClick={() => act("start")} />
      )}
      {status === "PRINTING" && (
        <Btn label="📦 Mark Ready for Collection" color="bg-purple-600/80 hover:bg-purple-600 border-0"
          loading={loading === "ready"} disabled={busy} onClick={() => act("ready")} />
      )}
      {status === "READY" && (
        <Btn label="🤝 Mark Collected" color="bg-gray-600/80 hover:bg-gray-600 border-0"
          loading={loading === "collect"} disabled={busy} onClick={() => act("collect")} />
      )}
      <Btn label="✕ Cancel Job" color="bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20"
        loading={loading === "cancel"} disabled={busy}
        onClick={() => { if (confirm("Cancel this job? This cannot be undone.")) act("cancel"); }} />
    </div>
  );
}

function Btn({ label, color, loading, disabled, onClick }: {
  label: string; color: string; loading: boolean; disabled: boolean; onClick: () => void;
}) {
  return (
    <button
      className={`w-full text-xs font-bold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-40 text-white ${color}`}
      disabled={disabled}
      onClick={onClick}
    >
      {loading ? "Working…" : label}
    </button>
  );
}
