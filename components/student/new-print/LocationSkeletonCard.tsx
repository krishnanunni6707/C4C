"use client";

import React from "react";

export default function LocationSkeletonCard() {
  return (
    <div
      aria-hidden="true"
      className="bg-white border border-slate-200/90 rounded-xl p-6 shadow-sm flex flex-col justify-between animate-pulse"
    >
      <div>
        {/* Icon Skeleton */}
        <div className="w-[62px] h-[62px] rounded-full bg-slate-100" />

        {/* Title */}
        <div className="h-6 w-3/4 bg-slate-100 rounded-md mt-4" />

        {/* Badge + Hours */}
        <div className="flex items-center gap-2 mt-2">
          <div className="h-5 w-14 bg-slate-100 rounded-full" />
          <div className="h-4 w-28 bg-slate-100 rounded" />
        </div>

        {/* Stats Grid */}
        <div className="mt-5 grid grid-cols-3 divide-x divide-slate-100 py-1">
          <div className="pr-2 space-y-1">
            <div className="h-3 w-10 bg-slate-200/70 rounded" />
            <div className="h-4 w-12 bg-slate-200 rounded" />
          </div>
          <div className="px-2 space-y-1">
            <div className="h-3 w-12 bg-slate-200/70 rounded" />
            <div className="h-4 w-14 bg-slate-200 rounded" />
          </div>
          <div className="pl-2 space-y-1">
            <div className="h-3 w-10 bg-slate-200/70 rounded" />
            <div className="h-4 w-12 bg-slate-200 rounded" />
          </div>
        </div>

        {/* Current Load */}
        <div className="mt-5 space-y-2">
          <div className="flex justify-between">
            <div className="h-3.5 w-20 bg-slate-100 rounded" />
            <div className="h-3.5 w-8 bg-slate-100 rounded" />
          </div>
          <div className="h-2 w-full bg-slate-100 rounded-full" />
        </div>

        {/* Address */}
        <div className="mt-5 space-y-1">
          <div className="h-3.5 w-36 bg-slate-100 rounded" />
          <div className="h-3 w-20 bg-slate-100 rounded" />
        </div>
      </div>

      {/* Button */}
      <div className="mt-6 pt-1">
        <div className="w-full h-12 bg-slate-100 rounded-lg" />
      </div>
    </div>
  );
}
