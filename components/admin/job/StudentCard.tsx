"use client";

import React from "react";
import Link from "next/link";
import { User, Pencil } from "lucide-react";

interface StudentCardProps {
  studentId?: string;
  studentName: string;
  admissionNumber: string;
  department?: string;
  semester?: number | string;
  className?: string;
}

export default function StudentCard({
  studentId,
  studentName,
  admissionNumber,
  department,
  semester,
  className = "",
}: StudentCardProps) {
  // Department & semester line: e.g. "Computer Science • Sem 3"
  const academicDetails = [
    department,
    semester !== undefined && semester !== null && semester !== ""
      ? `Sem ${semester}`
      : null,
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <div
      className={`bg-white rounded-[16px] border border-slate-200/80 p-5 shadow-sm ${className}`}
    >
      {/* ── Card Header ────────────────────────────────────────── */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-indigo-600" />
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Student Details
          </h2>
        </div>

        {/* Outline Edit Button linking to /admin/students?focus=<studentId> */}
        {studentId ? (
          <Link
            href={`/admin/students?focus=${encodeURIComponent(studentId)}`}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-xs"
          >
            <Pencil className="w-3.5 h-3.5 text-slate-500" />
            <span>Edit</span>
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border border-slate-100 text-xs font-semibold text-slate-400 cursor-not-allowed">
            <Pencil className="w-3.5 h-3.5 text-slate-300" />
            <span>Edit</span>
          </span>
        )}
      </div>

      {/* ── Student Information ─────────────────────────────────── */}
      <div className="flex items-center gap-4">
        {/* Big indigo-50 avatar circle */}
        <div className="w-16 h-16 rounded-full bg-indigo-50 border border-indigo-100/80 flex items-center justify-center text-indigo-600 flex-shrink-0">
          <User className="w-8 h-8" />
        </div>

        {/* Name, admission number pill, and department/semester */}
        <div className="min-w-0 space-y-1">
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight truncate">
            {studentName || "Student"}
          </h3>

          <div className="flex items-center gap-2">
            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-100/80">
              {admissionNumber || "—"}
            </span>
          </div>

          {academicDetails && (
            <p className="text-xs text-slate-500 font-medium pt-0.5">
              {academicDetails}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
