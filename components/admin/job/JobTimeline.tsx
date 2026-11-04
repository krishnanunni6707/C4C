"use client";

import React, { useEffect, useState } from "react";
import {
  Clock,
  CheckCircle2,
  Printer,
  XCircle,
  CreditCard,
  Package,
} from "lucide-react";
import { formatKolkataShort } from "@/lib/admin/job-date";

export interface TimelineLogItem {
  action: string;
  adminName: string;
  timestamp: string | null;
  details?: string;
}

interface JobTimelineProps {
  jobId: string;
  status: string;
  paymentStatus: string;
  studentName: string;
  createdAt: any;
  paymentMethod?: string;
  paidAt?: any;
  startedAt?: any;
  readyAt?: any;
  collectedAt?: any;
  cancelledAt?: any;
  className?: string;
}

interface StepConfig {
  id: string;
  title: string;
  subtitle: string;
  state: "done" | "current" | "pending" | "cancelled";
  icon?: React.ReactNode;
}

export default function JobTimeline({
  jobId,
  status,
  paymentStatus,
  studentName,
  createdAt,
  paymentMethod = "UPI",
  paidAt,
  startedAt,
  readyAt,
  collectedAt,
  cancelledAt,
  className = "",
}: JobTimelineProps) {
  const [logs, setLogs] = useState<TimelineLogItem[]>([]);

  useEffect(() => {
    let isMounted = true;
    fetch(`/api/admin/jobs/${jobId}/timeline`)
      .then((res) => (res.ok ? res.json() : { timeline: [] }))
      .then((data) => {
        if (isMounted && data.timeline) {
          setLogs(data.timeline);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [jobId, status]);

  // Find latest log entries by action
  const findLog = (action: string) => {
    const matching = logs.filter((l) => l.action === action);
    return matching.length > 0 ? matching[matching.length - 1] : null;
  };

  const startLog = findLog("JOB_STARTED");
  const readyLog = findLog("JOB_READY");
  const collectLog = findLog("JOB_COLLECTED");
  const cancelLog = findLog("JOB_CANCELLED");
  const payLog = findLog("PAYMENT_VERIFIED");

  const isPaid = paymentStatus?.toUpperCase() === "PAID";
  const upperStatus = status?.toUpperCase() || "WAITING";

  // Build the steps array
  const steps: StepConfig[] = [];

  // 1. Created (Always done)
  steps.push({
    id: "created",
    title: "Created",
    subtitle: `${formatKolkataShort(createdAt)} • by ${studentName || "Student"}`,
    state: "done",
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
  });

  // 2. Paid
  const paidTimeStr = formatKolkataShort(
    payLog?.timestamp || paidAt || (isPaid ? createdAt : null)
  );
  const paidActor = payLog ? `by ${payLog.adminName}` : `via ${paymentMethod}`;

  if (isPaid) {
    steps.push({
      id: "paid",
      title: "Paid",
      subtitle: `${paidTimeStr} • ${paidActor}`,
      state: "done",
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
    });
  } else if (upperStatus !== "CANCELLED") {
    steps.push({
      id: "paid",
      title: "Paid",
      subtitle: "Pending…",
      state: upperStatus === "WAITING" ? "current" : "pending",
      icon: <CreditCard className="w-4 h-4 text-indigo-600" />,
    });
  }

  // If CANCELLED, show Cancelled step and stop
  if (upperStatus === "CANCELLED") {
    const cancelTime = formatKolkataShort(cancelLog?.timestamp || cancelledAt);
    const cancelActor = cancelLog ? `by ${cancelLog.adminName}` : "by Admin";
    steps.push({
      id: "cancelled",
      title: "Cancelled",
      subtitle: `${cancelTime} • ${cancelActor}`,
      state: "cancelled",
      icon: <XCircle className="w-4 h-4 text-rose-500" />,
    });
  } else {
    // 3. Printing
    const printTime = formatKolkataShort(startLog?.timestamp || startedAt);
    const printActor = startLog ? `by ${startLog.adminName}` : "by Admin";

    if (upperStatus === "PRINTING") {
      steps.push({
        id: "printing",
        title: "Printing",
        subtitle: `${printTime} • ${printActor}`,
        state: "current",
        icon: <Printer className="w-4 h-4 text-indigo-600" />,
      });
    } else if (upperStatus === "READY" || upperStatus === "COLLECTED") {
      steps.push({
        id: "printing",
        title: "Printing",
        subtitle: `${printTime} • ${printActor}`,
        state: "done",
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
      });
    } else {
      steps.push({
        id: "printing",
        title: "Printing",
        subtitle: "Pending…",
        state: "pending",
      });
    }

    // 4. Ready
    const readyTime = formatKolkataShort(readyLog?.timestamp || readyAt);
    const readyActor = readyLog ? `by ${readyLog.adminName}` : "by Admin";

    if (upperStatus === "READY") {
      steps.push({
        id: "ready",
        title: "Ready",
        subtitle: `${readyTime} • ${readyActor}`,
        state: "current",
        icon: <Package className="w-4 h-4 text-indigo-600" />,
      });
    } else if (upperStatus === "COLLECTED") {
      steps.push({
        id: "ready",
        title: "Ready",
        subtitle: `${readyTime} • ${readyActor}`,
        state: "done",
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
      });
    } else {
      steps.push({
        id: "ready",
        title: "Ready",
        subtitle: "Pending…",
        state: "pending",
      });
    }

    // 5. Collected
    const collectTime = formatKolkataShort(collectLog?.timestamp || collectedAt);
    const collectActor = collectLog ? `by ${collectLog.adminName}` : "by Admin";

    if (upperStatus === "COLLECTED") {
      steps.push({
        id: "collected",
        title: "Collected",
        subtitle: `${collectTime} • ${collectActor}`,
        state: "done",
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
      });
    } else {
      steps.push({
        id: "collected",
        title: "Collected",
        subtitle: "Pending…",
        state: "pending",
      });
    }
  }

  return (
    <div
      className={`bg-white rounded-[16px] border border-slate-200/80 p-5 shadow-sm ${className}`}
    >
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
        <Clock className="w-5 h-5 text-indigo-600" />
        <h2 className="text-base font-bold text-slate-900 tracking-tight">
          Job Timeline
        </h2>
      </div>

      {/* ── Stepper ───────────────────────────────────────────── */}
      <ol className="relative space-y-2" aria-label="Job progress timeline">
        {steps.map((step, idx) => {
          const isLast = idx === steps.length - 1;
          const isDone = step.state === "done";
          const isCurrent = step.state === "current";
          const isCancelled = step.state === "cancelled";

          return (
            <li
              key={step.id}
              className={`relative flex items-start gap-3 p-2 rounded-xl transition-colors ${
                isCurrent ? "bg-indigo-50/80 border border-indigo-100/60" : ""
              }`}
            >
              {/* Vertical connector line */}
              {!isLast && (
                <span
                  className={`absolute left-[19px] top-7 bottom-[-8px] w-0.5 z-0 ${
                    isDone ? "bg-emerald-500" : "bg-slate-200"
                  }`}
                  aria-hidden="true"
                />
              )}

              {/* Step Icon */}
              <div className="relative z-10 flex-shrink-0 mt-0.5">
                {isDone ? (
                  <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-50" />
                  </div>
                ) : isCurrent ? (
                  <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center shadow-xs">
                    <div className="w-2.5 h-2.5 rounded-full bg-white" />
                  </div>
                ) : isCancelled ? (
                  <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
                    <XCircle className="w-5 h-5 text-rose-500 fill-rose-50" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-slate-300 bg-white flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                  </div>
                )}
              </div>

              {/* Step Content */}
              <div className="min-w-0 flex-1">
                <p
                  className={`text-xs font-bold ${
                    isCancelled
                      ? "text-rose-700"
                      : isCurrent
                      ? "text-indigo-900"
                      : isDone
                      ? "text-slate-900"
                      : "text-slate-500"
                  }`}
                >
                  {step.title}
                </p>
                <p
                  className={`text-[11px] truncate mt-0.5 ${
                    isCurrent ? "text-indigo-700/80 font-medium" : "text-slate-400"
                  }`}
                >
                  {step.subtitle}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
