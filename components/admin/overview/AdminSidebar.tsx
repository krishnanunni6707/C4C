"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  FileText,
  Search,
  Users,
  UserCheck,
  Settings,
  Printer,
  Building2,
  X,
} from "lucide-react";

interface AdminSidebarProps {
  isSuperAdmin: boolean;
  currentLocationName?: string | null;
  locationBuilding?: string | null;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
  className?: string;
}

export default function AdminSidebar({
  isSuperAdmin,
  currentLocationName,
  locationBuilding,
  isMobileOpen = false,
  onMobileClose,
  className = "",
}: AdminSidebarProps) {
  const pathname = usePathname();

  const isJobDetailPage =
    /^\/admin\/(queue\/[^/]+|job\/[^/]+)/.test(pathname) ||
    pathname === "/admin-preview/job";

  const isQueueActive =
    (pathname === "/admin/queue" || pathname.startsWith("/admin/queue")) &&
    !isJobDetailPage;

  const navItems = [
    {
      href: "/admin/overview",
      label: "Overview",
      icon: LayoutGrid,
      isActive: pathname === "/admin/overview" || pathname === "/admin",
    },
    {
      href: "/admin/queue",
      label: "Queue",
      icon: FileText,
      isActive: isQueueActive,
    },
    ...(isJobDetailPage
      ? [
          {
            href: pathname,
            label: "Job Detail",
            icon: Search,
            isActive: true,
          },
        ]
      : []),
    {
      href: "/admin/students",
      label: "Students",
      icon: Users,
      isActive: pathname.startsWith("/admin/students"),
    },
    ...(isSuperAdmin
      ? [
          {
            href: "/admin/admins",
            label: "Admins",
            icon: UserCheck,
            isActive: pathname.startsWith("/admin/admins"),
          },
        ]
      : []),
    {
      href: "/admin/settings",
      label: "Settings",
      icon: Settings,
      isActive: pathname.startsWith("/admin/settings"),
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full p-4 justify-between select-none">
      <div>
        {/* Top brand header */}
        <div className="flex items-center justify-between px-2 py-3 mb-4">
          <Link href="/admin/overview" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Printer className="w-5 h-5" />
            </div>
            <span className="text-base font-bold text-slate-900 tracking-tight">
              QDoc Admin
            </span>
          </Link>
          {onMobileClose && (
            <button
              type="button"
              onClick={onMobileClose}
              className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation list */}
        <nav aria-label="Admin" className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.isActive;
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={onMobileClose}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  active
                    ? "bg-indigo-50 text-indigo-700 font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium"
                }`}
              >
                <Icon
                  className={`w-4 h-4 flex-shrink-0 ${
                    active ? "text-indigo-600" : "text-slate-400"
                  }`}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Location Card */}
      <div className="mt-auto pt-4">
        <div className="bg-indigo-50/70 border border-indigo-100/60 rounded-2xl p-3 flex items-start gap-3 shadow-xs">
          <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 truncate">
              {currentLocationName || "Main Print Room"}
            </p>
            <div className="text-[11px] text-slate-500 leading-tight mt-0.5">
              {(locationBuilding || "Central Library\nBlock A")
                .split(/\\n|\n/)
                .map((line, i) => (
                  <span key={i} className="block truncate">
                    {line}
                  </span>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop fixed sidebar */}
      <aside
        className={`hidden lg:block w-[232px] fixed inset-y-0 left-0 bg-white border-r border-slate-200/80 z-30 ${className}`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity"
            onClick={onMobileClose}
            aria-hidden="true"
          />
          <aside className="relative w-[260px] max-w-[80vw] bg-white h-full shadow-2xl z-10">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
