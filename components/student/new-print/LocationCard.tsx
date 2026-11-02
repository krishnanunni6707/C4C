"use client";

import React from "react";
import { Printer, Users, Clock, MapPin, Check } from "lucide-react";
import type { PrintLocation } from "@/app/student/page";
import type { LocationStatusItem } from "@/app/api/locations/status/route";
import {
  CAMPUS_NAME,
  getOpenState,
  formatHours,
  loadColorBgClass,
  OpenState,
} from "@/lib/location-status";

interface LocationCardProps {
  location: PrintLocation;
  status?: LocationStatusItem;
  isSelected: boolean;
  onSelect: (locationId: string) => void;
  onProceed?: () => void;
  now?: Date;
}

export default function LocationCard({
  location,
  status,
  isSelected,
  onSelect,
  onProceed,
  now = new Date(),
}: LocationCardProps) {
  const openTime = status?.openTime ?? location.openTime;
  const closeTime = status?.closeTime ?? location.closeTime;

  const openState: OpenState = getOpenState(now, openTime, closeTime);
  const isClosed = openState === "closed";
  const hoursFormatted = formatHours(openTime, closeTime);

  const queueAhead = status?.queueAhead ?? 0;
  const printersOnline = status?.printersOnline ?? 0;
  const estWaitMinutes = status?.estWaitMinutes ?? null;
  const loadPercent = status?.loadPercent ?? 0;

  // Address lines
  const addressLine1 = [location.building, location.floor]
    .filter(Boolean)
    .join(", ");
  const addressLine2 = CAMPUS_NAME;

  const handleCardClick = () => {
    if (!isClosed) {
      if (isSelected && onProceed) {
        onProceed();
      } else {
        onSelect(location.id);
      }
    }
  };

  return (
    <div
      role="radio"
      aria-checked={isSelected}
      aria-disabled={isClosed}
      tabIndex={isSelected ? 0 : -1}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          handleCardClick();
        }
      }}
      className={`relative rounded-xl p-6 transition-all duration-200 select-none flex flex-col justify-between cursor-pointer ${
        isClosed
          ? "bg-white/80 border border-slate-200/60 opacity-60 cursor-not-allowed shadow-none"
          : isSelected
          ? "bg-white border-2 border-indigo-600 shadow-[0_4px_16px_-2px_rgba(79,70,229,0.12)] ring-1 ring-indigo-600"
          : "bg-white border border-slate-200/90 hover:border-slate-300 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.04)] hover:shadow-md"
      }`}
    >
      {/* Selected top-right circular check badge */}
      {isSelected && (
        <div
          className="absolute top-5 right-5 w-[22px] h-[22px] rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-sm"
          aria-hidden="true"
        >
          <Check className="w-3.5 h-3.5" strokeWidth={3} />
        </div>
      )}

      <div>
        {/* Top Icon: 62px circle */}
        <div className="w-[62px] h-[62px] rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0">
          <Printer className="w-8 h-8" strokeWidth={1.8} />
        </div>

        {/* Location Name */}
        <h3 className="text-xl font-bold text-[#0F172A] tracking-tight mt-4 line-clamp-1">
          {location.name}
        </h3>

        {/* Status Pill & Hours */}
        {openState !== "unknown" && hoursFormatted && (
          <div className="flex items-center gap-2.5 mt-2 flex-wrap">
            {openState === "open" && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                Open
              </span>
            )}
            {openState === "closing" && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                Closing
              </span>
            )}
            {openState === "closed" && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700">
                Closed
              </span>
            )}
            <span className="text-[13px] text-slate-500 font-normal">
              {hoursFormatted}
            </span>
          </div>
        )}

        {/* Stats Row: 3 columns with dividers */}
        <div className="mt-5 grid grid-cols-3 divide-x divide-slate-100 py-1">
          {/* Queue */}
          <div className="pr-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-normal">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>Queue</span>
            </div>
            <p className="text-base font-semibold text-[#0F172A] mt-1">
              {queueAhead} ahead
            </p>
          </div>

          {/* Est. Wait */}
          <div className="px-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-normal">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Est. wait</span>
            </div>
            <p className="text-base font-semibold text-[#0F172A] mt-1">
              {estWaitMinutes !== null ? `~ ${estWaitMinutes} min` : "—"}
            </p>
          </div>

          {/* Printers */}
          <div className="pl-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-normal">
              <Printer className="w-3.5 h-3.5 text-slate-400" />
              <span>Printers</span>
            </div>
            <p className="text-base font-semibold text-[#0F172A] mt-1">
              {printersOnline} online
            </p>
          </div>
        </div>

        {/* Current load */}
        <div className="mt-5 space-y-1.5">
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-slate-500 font-normal">Current load</span>
            <span className="text-slate-700 font-semibold">{loadPercent}%</span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={loadPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Current load at ${location.name}`}
            className="w-full h-2 rounded-full bg-slate-100 overflow-hidden"
          >
            <div
              className={`h-full rounded-full transition-all duration-500 ${loadColorBgClass(
                loadPercent
              )}`}
              style={{ width: `${Math.min(100, Math.max(0, loadPercent))}%` }}
            />
          </div>
        </div>

        {/* Address */}
        <div className="mt-5 flex items-start gap-2 text-[13px] leading-relaxed">
          <MapPin className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            {addressLine1 && (
              <p className="text-slate-700 font-medium truncate">{addressLine1}</p>
            )}
            <p className="text-slate-400 font-normal">{addressLine2}</p>
          </div>
        </div>
      </div>

      {/* Select Button */}
      <div className="mt-6 pt-1">
        <button
          type="button"
          disabled={isClosed}
          aria-pressed={isSelected}
          onClick={(e) => {
            e.stopPropagation();
            handleCardClick();
          }}
          className={`w-full h-12 rounded-lg text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
            isClosed
              ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
              : isSelected
              ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20"
              : "bg-white hover:bg-indigo-50/50 border-[1.5px] border-indigo-600 text-indigo-700 shadow-sm"
          }`}
        >
          {isSelected ? (
            <span className="flex items-center justify-center gap-1.5">
              <span>Selected</span>
              <span className="text-indigo-200">·</span>
              <span className="underline underline-offset-2">Proceed →</span>
            </span>
          ) : (
            "Select"
          )}
        </button>
      </div>
    </div>
  );
}
