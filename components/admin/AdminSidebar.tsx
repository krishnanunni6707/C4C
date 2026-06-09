"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface AdminSidebarProps {
  adminName: string;
}

const navLinks = [
  { href: "/admin/overview", label: "📊 Overview", active: true },
  { href: "/admin/queue", label: "🖨️ Queue Management", active: true },
  { href: "/admin/students", label: "👥 Student Directory", active: true },
  { href: "/admin/settings", label: "⚙️ System Settings", active: true },
];

export default function AdminSidebar({ adminName }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-gray-900 flex flex-col h-full fixed left-0 top-0 z-10">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🖨️</span>
          <h1 className="text-white font-bold text-lg leading-tight">
            PrintAdmin
          </h1>
        </div>
        <p className="text-gray-500 text-xs mt-1">Smart Campus Printing</p>
      </div>

      {/* Admin info */}
      <div className="px-6 py-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {adminName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-white font-medium text-sm truncate">{adminName}</p>
            <p className="text-gray-400 text-xs">Administrator</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navLinks.map(({ href, label, active }) => {
          const isActive =
            href !== null &&
            (pathname === href || pathname.startsWith(href + "/"));

          if (!active || href === null) {
            // Disabled — coming in a future phase
            return (
              <div
                key={label}
                className="flex items-center px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 cursor-not-allowed select-none"
                title="Coming soon"
              >
                <span className="flex-1">{label}</span>
                <span className="text-xs bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded">
                  soon
                </span>
              </div>
            );
          }

          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-gray-700">
        <a
          href="/api/auth/signout"
          className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <span>🚪</span>
          <span>Logout</span>
        </a>
      </div>
    </aside>
  );
}
