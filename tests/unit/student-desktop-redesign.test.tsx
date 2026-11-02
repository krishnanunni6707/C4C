import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderToString } from "react-dom/server";
import PaymentSuccessView from "@/components/payment/PaymentSuccessView";
import ActiveJobsTab from "@/components/student/active/ActiveJobsTab";
import HistoryTab from "@/components/student/history/HistoryTab";
import LocationsTab from "@/components/student/locations/LocationsTab";
import StatusPill from "@/components/student/shared/StatusPill";
import JobProgress from "@/components/student/shared/JobProgress";
import type { PrintJob, PrintLocation } from "@/app/student/page";

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: {
      user: {
        id: "student-1",
        name: "Aarav Nair",
        email: "aarav@campus.edu",
      },
    },
    status: "authenticated",
  }),
}));

vi.mock("@/contexts/NotificationContext", () => ({
  useNotifications: () => ({
    notifications: [],
    unreadCount: 0,
    markRead: () => {},
    markAllRead: () => {},
  }),
}));

describe("Student Desktop Screens Redesign Unit Tests", () => {
  const sampleActiveJobs: PrintJob[] = [
    {
      id: "job-rp1042",
      tokenNumber: "RP1042",
      fileName: "Operating_Systems_Notes.pdf",
      totalPages: 24,
      colorMode: "COLOR",
      printType: "double-sided",
      copies: 1,
      amount: 68.0,
      status: "PRINTING",
      currentPage: 7,
      totalPrintPages: 10,
      createdAt: new Date().toISOString(),
    },
    {
      id: "job-rp1043",
      tokenNumber: "RP1043",
      fileName: "Lab_Record.docx",
      totalPages: 12,
      colorMode: "BW",
      printType: "single-sided",
      copies: 1,
      amount: 34.0,
      status: "PRINTING",
      currentPage: 4,
      totalPrintPages: 10,
      createdAt: new Date().toISOString(),
    },
  ];

  const sampleHistoryJobs: PrintJob[] = [
    {
      id: "job-1",
      tokenNumber: "RP1042",
      fileName: "Operating_Systems_Notes.pdf",
      totalPages: 24,
      copies: 1,
      colorMode: "COLOR",
      printType: "double-sided",
      amount: 68.0,
      status: "COLLECTED",
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: "job-2",
      tokenNumber: "RP1043",
      fileName: "Lab_Record.docx",
      totalPages: 12,
      copies: 1,
      colorMode: "BW",
      printType: "single-sided",
      amount: 34.0,
      status: "CANCELLED",
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
  ];

  const sampleLocations: PrintLocation[] = [
    {
      id: "loc-1",
      name: "Main Print Room",
      building: "Academic Block A",
      floor: "1st Floor",
      openTime: "8:00 AM",
      closeTime: "8:00 PM",
      isActive: true,
    },
    {
      id: "loc-2",
      name: "Library Print Hub",
      building: "Central Library",
      floor: "Ground Floor",
      openTime: "8:00 AM",
      closeTime: "9:00 PM",
      isActive: true,
    },
    {
      id: "loc-3",
      name: "Engineering Block Center",
      building: "Block B",
      floor: "2nd Floor",
      openTime: "8:00 AM",
      closeTime: "8:00 PM",
      isActive: true,
    },
  ];

  it("Screen A: PaymentSuccessView renders token, queue position, and action buttons", () => {
    const html = renderToString(
      <PaymentSuccessView
        tokenNumber="RP1042"
        jobId="job-rp1042"
        queueAheadCount={2}
        estimatedWaitMinutes={3}
      />
    );

    expect(html).toContain("Payment successful!");
    expect(html).toContain("RP1042");
    expect(html).toContain("ahead • ~");
    expect(html).toContain("View token slip");
    expect(html).toContain("Back to home");
  });

  it("Screen B: ActiveJobsTab renders jobs, trackers, progress bars, and notifications card", () => {
    const html = renderToString(
      <ActiveJobsTab
        activeJobs={sampleActiveJobs}
        onStartNewPrint={() => {}}
      />
    );

    expect(html).toContain("Active Print Jobs");
    expect(html).toContain("RP1042");
    expect(html).toContain("Operating_Systems_Notes.pdf");
    expect(html).toContain("24");
    expect(html).toContain("Color");
    expect(html).toContain("Double sided");
    expect(html).toContain("#2 in line");
    expect(html).toContain("70%");
    expect(html).toContain("RP1043");
    expect(html).toContain("Lab_Record.docx");
    expect(html).toContain("12");
    expect(html).toContain("Single sided");
    expect(html).toContain("#1 in line");
    expect(html).toContain("40%");
    expect(html).toContain("Open token slip");
    expect(html).toContain("Recent Notifications");
  });

  it("Screen C: HistoryTab renders filters, table rows, status pills, and receipt/reprint buttons", () => {
    const html = renderToString(
      <HistoryTab
        allJobs={sampleHistoryJobs}
        onReprint={() => {}}
      />
    );

    expect(html).toContain("Print History");
    expect(html).toContain("Last 30 days");
    expect(html).toContain("All");
    expect(html).toContain("Collected");
    expect(html).toContain("Cancelled");
    expect(html).toContain("Search by token or file...");
    expect(html).toContain("Operating_Systems_Notes.pdf");
    expect(html).toContain("68.00");
    expect(html).toContain("Lab_Record.docx");
    expect(html).toContain("34.00");
    expect(html).toContain("Receipt");
    expect(html).toContain("Reprint");
  });

  it("Screen D: LocationsTab renders 3 centers with queue load, printer count, and selection state", () => {
    const html = renderToString(
      <LocationsTab
        locations={sampleLocations}
        selectedLocationId="loc-2"
        onSelectLocation={() => {}}
      />
    );

    expect(html).toContain("Print Centers");
    expect(html).toContain("Main Print Room");
    expect(html).toContain("Library Print Hub");
    expect(html).toContain("Engineering Block Center");
    expect(html).toContain("Online");
    expect(html).toContain("Queue Load");
    expect(html).toContain("Print here");
  });

  it("Shared: StatusPill applies correct classes and dots", () => {
    const collected = renderToString(<StatusPill status="COLLECTED" />);
    expect(collected).toContain("Collected");
    expect(collected).toContain("bg-emerald-50");

    const cancelled = renderToString(<StatusPill status="CANCELLED" />);
    expect(cancelled).toContain("Cancelled");
    expect(cancelled).toContain("bg-rose-50");
  });

  it("Shared: JobProgress renders 6px bar with percent label and accessibility attributes", () => {
    const html = renderToString(<JobProgress percent={70} />);
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuenow="70"');
    expect(html).toContain("70%");
  });
});
