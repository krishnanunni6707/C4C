"use client";

import React from "react";

export type JobStatusType =
  | "WAITING"
  | "PRINTING"
  | "READY"
  | "COLLECTED"
  | "CANCELLED"
  | string;

export interface StatusPillProps {
  status: JobStatusType;
  className?: string;
}

export default function StatusPill({ status, className = "" }: StatusPillProps) {
  const normalized = (status || "").toUpperCase();

  let bgClass = "bg-slate-50 text-slate-700 border-slate-200";
  let dotClass = "bg-slate-400";
  let label = status;

  switch (normalized) {
    case "COLLECTED":
      bgClass = "bg-emerald-50 text-emerald-700 border-emerald-200/80";
      dotClass = "bg-emerald-500";
      label = "Collected";
      break;
    case "CANCELLED":
      bgClass = "bg-rose-50 text-rose-700 border-rose-200/80";
      dotClass = "bg-rose-500";
      label = "Cancelled";
      break;
    case "WAITING":
      bgClass = "bg-amber-50 text-amber-700 border-amber-200/80";
      dotClass = "bg-amber-500 animate-pulse";
      label = "Waiting";
      break;
    case "PRINTING":
      bgClass = "bg-indigo-50 text-indigo-700 border-indigo-200/80";
      dotClass = "bg-indigo-600 animate-pulse";
      label = "Printing";
      break;
    case "READY":
      bgClass = "bg-emerald-50 text-emerald-700 border-emerald-200/80";
      dotClass = "bg-emerald-500";
      label = "Ready";
      break;
    default:
      break;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border font-sans select-none ${bgClass} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotClass} flex-shrink-0`} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
