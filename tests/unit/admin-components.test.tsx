import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderToString } from "react-dom/server";
import AdminSidebar from "@/components/admin/overview/AdminSidebar";
import LocationSwitcher from "@/components/admin/overview/LocationSwitcher";
import StatTile from "@/components/admin/overview/StatTile";
import LiveQueueCard from "@/components/admin/overview/LiveQueueCard";
import PrinterFleetCard from "@/components/admin/overview/PrinterFleetCard";
import BroadcastCard from "@/components/admin/overview/BroadcastCard";
import { Printer } from "lucide-react";

let mockPathname = "/admin/overview";
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("Admin Shell & Overview Components Unit Tests", () => {
  it("renders AdminSidebar with navigation links and location card", () => {
    mockPathname = "/admin/overview";
    const html = renderToString(
      <AdminSidebar
        isSuperAdmin={true}
        currentLocationName="Main Print Room"
        locationBuilding="Central Library\nBlock A"
      />
    );

    expect(html).toContain("QDoc Admin");
    expect(html).toContain("Overview");
    expect(html).toContain("Queue");
    expect(html).not.toContain("Job Detail");
    expect(html).toContain("Students");
    expect(html).toContain("Admins"); // SUPER_ADMIN only
    expect(html).toContain("Settings");
    expect(html).toContain("Main Print Room");
    expect(html).toContain("Central Library");
  });

  it("renders Job Detail nav link when viewing a job detail page", () => {
    mockPathname = "/admin/queue/RP1042";
    const html = renderToString(
      <AdminSidebar
        isSuperAdmin={false}
        currentLocationName="Main Print Room"
      />
    );

    expect(html).toContain("Job Detail");
    expect(html).toContain('href="/admin/queue/RP1042"');
    expect(html).toContain('aria-current="page"');
    mockPathname = "/admin/overview";
  });

  it("hides Admins navigation link for regular ADMIN in AdminSidebar", () => {
    mockPathname = "/admin/overview";
    const html = renderToString(
      <AdminSidebar
        isSuperAdmin={false}
        currentLocationName="Library Print Hub"
      />
    );

    expect(html).toContain("Overview");
    expect(html).not.toContain('href="/admin/admins"');
  });

  it("renders LocationSwitcher as read-only chip for ADMIN", () => {
    const html = renderToString(
      <LocationSwitcher
        locations={[{ id: "loc-1", name: "Engineering Block" }]}
        currentLocationId="loc-1"
        currentLocationName="Engineering Block"
        isSuperAdmin={false}
      />
    );

    expect(html).toContain("Engineering Block");
    expect(html).not.toContain("location-switcher-btn");
  });

  it("renders LocationSwitcher with interactive button for SUPER_ADMIN", () => {
    const html = renderToString(
      <LocationSwitcher
        locations={[{ id: "loc-1", name: "Engineering Block" }]}
        currentLocationId="loc-1"
        currentLocationName="Engineering Block"
        isSuperAdmin={true}
      />
    );

    expect(html).toContain("location-switcher-btn");
    expect(html).toContain("Engineering Block");
  });

  it("renders StatTile with label, value, delta, and sparkline", () => {
    const html = renderToString(
      <StatTile
        icon={<Printer className="w-5 h-5" />}
        label="Jobs today"
        value={128}
        delta={{
          value: 12,
          formatted: "+12% vs last week",
          isPositive: true,
          isGood: true,
        }}
        sparklineData={[10, 15, 20, 25, 22, 30, 35]}
      />
    );

    expect(html).toContain("Jobs today");
    expect(html).toContain("128");
    expect(html).toContain("+12% vs last week");
    expect(html).toContain("text-emerald-600");
  });

  it("renders LiveQueueCard with column headers and rows", () => {
    const html = renderToString(
      <LiveQueueCard
        jobs={[
          {
            id: "j-101",
            tokenNumber: "RP1042",
            studentName: "Aarav Nair",
            fileName: "OS_Notes.pdf",
            totalPages: 24,
            copies: 2,
            status: "PRINTING",
            waitTimeMin: 2,
          },
        ]}
      />
    );

    expect(html).toContain("Live Print Queue");
    expect(html).toContain("RP1042");
    expect(html).toContain("Aarav Nair");
    expect(html).toContain("OS_Notes.pdf");
    expect(html).toContain("24 × 2");
    expect(html).toContain("Printing");
    expect(html).toContain("2 min");
  });

  it("renders PrinterFleetCard with online/offline indicators and load bar", () => {
    const html = renderToString(
      <PrinterFleetCard
        printers={[
          {
            id: "p-1",
            name: "Printer A1",
            location: "Main Print Room",
            status: "ONLINE",
            loadPercent: 72,
          },
          {
            id: "p-2",
            name: "Printer B1",
            location: "Library Print Hub",
            status: "OFFLINE",
            loadPercent: 0,
          },
        ]}
      />
    );

    expect(html).toContain("Printer Fleet Status");
    expect(html).toContain("Printer A1");
    expect(html).toContain("72%");
    expect(html).toContain("Printer B1");
    expect(html).toContain("Offline");
    expect(html).toContain("0%");
  });

  it("renders BroadcastCard composer with title and message fields", () => {
    const html = renderToString(<BroadcastCard />);

    expect(html).toContain("Broadcast Message");
    expect(html).toContain("Maintenance Notice");
    expect(html).toContain("Send Message");
  });
});
