"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  jobId: string;
  status: string;
  paymentStatus: string;
}

export default function JobDetailActions({ jobId, status, paymentStatus }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

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

  if (terminal) {
    return (
      <p className="text-sm text-gray-400 py-1">
        No actions available — job is {status.toLowerCase()}.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Verify payment */}
      {paymentStatus === "PENDING" && (
        <Btn
          label="✅ Mark Payment Paid"
          color="bg-blue-600 hover:bg-blue-700"
          loading={loading === "payment"}
          disabled={busy}
          onClick={() => act("payment")}
        />
      )}

      {/* Start printing */}
      {paymentStatus === "PAID" && status === "WAITING" && (
        <Btn
          label="🖨️ Start Printing"
          color="bg-green-600 hover:bg-green-700"
          loading={loading === "start"}
          disabled={busy}
          onClick={() => act("start")}
        />
      )}

      {/* Mark ready */}
      {status === "PRINTING" && (
        <Btn
          label="📦 Mark Ready for Collection"
          color="bg-purple-600 hover:bg-purple-700"
          loading={loading === "ready"}
          disabled={busy}
          onClick={() => act("ready")}
        />
      )}

      {/* Mark collected */}
      {status === "READY" && (
        <Btn
          label="🤝 Mark Collected"
          color="bg-gray-600 hover:bg-gray-700"
          loading={loading === "collect"}
          disabled={busy}
          onClick={() => act("collect")}
        />
      )}

      {/* Cancel */}
      <Btn
        label="❌ Cancel Job"
        color="bg-white border border-red-400 text-red-600 hover:bg-red-50"
        loading={loading === "cancel"}
        disabled={busy}
        onClick={() => {
          if (confirm("Cancel this job? This cannot be undone.")) act("cancel");
        }}
      />
    </div>
  );
}

function Btn({
  label,
  color,
  loading,
  disabled,
  onClick,
}: {
  label: string;
  color: string;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`w-full text-sm font-medium px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50 text-white ${color}`}
      disabled={disabled}
      onClick={onClick}
    >
      {loading ? "Working…" : label}
    </button>
  );
}
