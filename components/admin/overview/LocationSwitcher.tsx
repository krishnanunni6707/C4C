"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { MapPin, ChevronDown, Check } from "lucide-react";

export interface LocationItem {
  id: string;
  name: string;
  building?: string;
  floor?: string;
  isActive?: boolean;
}

interface LocationSwitcherProps {
  locations: LocationItem[];
  currentLocationId: string | null;
  currentLocationName?: string | null;
  isSuperAdmin: boolean;
  className?: string;
}

export default function LocationSwitcher({
  locations,
  currentLocationId,
  currentLocationName,
  isSuperAdmin,
  className = "",
}: LocationSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Compute displayed title
  let displayTitle = "All locations";
  if (currentLocationId && currentLocationId !== "all") {
    const matched = locations.find((l) => l.id === currentLocationId);
    displayTitle = matched?.name || currentLocationName || "Main Print Room";
  } else if (currentLocationName) {
    displayTitle = currentLocationName;
  } else if (locations.length > 0 && !isSuperAdmin) {
    displayTitle = locations[0].name;
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (locId: string | null) => {
    const params = new URLSearchParams(searchParams ? searchParams.toString() : "");
    if (!locId || locId === "all") {
      params.delete("location");
    } else {
      params.set("location", locId);
    }
    const newQuery = params.toString();
    router.push(`${pathname}${newQuery ? `?${newQuery}` : ""}`);
    setIsOpen(false);
  };

  // ADMIN role: read-only chip without dropdown chevron
  if (!isSuperAdmin) {
    return (
      <div
        className={`inline-flex items-center gap-2 bg-white border border-slate-200/90 rounded-xl px-3.5 py-1.5 text-xs font-semibold text-slate-800 shadow-sm ${className}`}
        aria-label={`Current location: ${displayTitle}`}
      >
        <MapPin className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
        <span className="truncate max-w-[180px]">{displayTitle}</span>
      </div>
    );
  }

  // SUPER_ADMIN role: interactive dropdown
  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      <button
        type="button"
        id="location-switcher-btn"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className="bg-white border border-slate-200/90 hover:border-slate-300 text-slate-800 rounded-xl px-3.5 py-1.5 text-xs font-semibold shadow-sm flex items-center gap-2 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
      >
        <MapPin className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
        <span className="truncate max-w-[180px]">{displayTitle}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div
          role="listbox"
          tabIndex={-1}
          className="absolute left-0 mt-1.5 w-56 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 focus:outline-none"
        >
          <button
            role="option"
            aria-selected={!currentLocationId || currentLocationId === "all"}
            onClick={() => handleSelect("all")}
            className={`w-full text-left px-3.5 py-2 text-xs font-medium flex items-center justify-between transition-colors ${
              !currentLocationId || currentLocationId === "all"
                ? "bg-indigo-50 text-indigo-700 font-semibold"
                : "text-slate-700 hover:bg-slate-50"
            }`}
          >
            <span>All locations (Global)</span>
            {(!currentLocationId || currentLocationId === "all") && (
              <Check className="w-3.5 h-3.5 text-indigo-600" />
            )}
          </button>

          <div className="border-t border-slate-100 my-1" />

          {locations.map((loc) => {
            const isSelected = currentLocationId === loc.id;
            return (
              <button
                key={loc.id}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(loc.id)}
                className={`w-full text-left px-3.5 py-2 text-xs font-medium flex items-center justify-between transition-colors ${
                  isSelected
                    ? "bg-indigo-50 text-indigo-700 font-semibold"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <div className="truncate">
                  <p className="font-semibold text-slate-800">{loc.name}</p>
                  {loc.building && (
                    <p className="text-[10px] text-slate-400 font-normal">{loc.building}</p>
                  )}
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
