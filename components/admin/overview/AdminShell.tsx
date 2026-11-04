"use client";

import React, { useState } from "react";
import AdminSidebar from "./AdminSidebar";
import AdminTopBar from "./AdminTopBar";
import type { LocationItem } from "./LocationSwitcher";

interface AdminShellProps {
  children: React.ReactNode;
  adminName?: string | null;
  adminRole?: string | null;
  adminEmail?: string | null;
  locations: LocationItem[];
  currentLocationId: string | null;
  currentLocationName?: string | null;
  locationBuilding?: string | null;
  isSuperAdmin: boolean;
}

export default function AdminShell({
  children,
  adminName = "Admin",
  adminRole = "ADMIN",
  adminEmail,
  locations,
  currentLocationId,
  currentLocationName,
  locationBuilding,
  isSuperAdmin,
}: AdminShellProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex">
      {/* 1. Left Navigation Sidebar (fixed 204px on desktop) */}
      <AdminSidebar
        isSuperAdmin={isSuperAdmin}
        currentLocationName={currentLocationName}
        locationBuilding={locationBuilding}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* 2. Main Workspace Layout */}
      <div className="flex-1 lg:ml-[204px] min-h-screen flex flex-col min-w-0">
        {/* Sticky Top Bar */}
        <AdminTopBar
          adminName={adminName}
          adminRole={adminRole}
          adminEmail={adminEmail}
          locations={locations}
          currentLocationId={currentLocationId}
          currentLocationName={currentLocationName}
          isSuperAdmin={isSuperAdmin}
          onMobileMenuToggle={() => setIsMobileSidebarOpen(true)}
        />

        {/* Dynamic Page Content */}
        <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-5 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
