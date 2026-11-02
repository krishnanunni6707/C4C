"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  onBackToHome?: () => void;
  backHref?: string;
}

export default function PageHeader({
  title,
  subtitle,
  onBackToHome,
  backHref,
}: PageHeaderProps) {
  return (
    <div className="space-y-3 mb-6">
      {/* Back to Home Link */}
      <div>
        {onBackToHome ? (
          <button
            type="button"
            onClick={onBackToHome}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-indigo-600 hover:text-indigo-500 transition-colors py-1 group focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            <span>Back to home</span>
          </button>
        ) : (
          <Link
            href={backHref || "/student"}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-indigo-600 hover:text-indigo-500 transition-colors py-1 group focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            <span>Back to home</span>
          </Link>
        )}
      </div>

      {/* Title & Subtitle */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-slate-500 mt-1 font-normal">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
