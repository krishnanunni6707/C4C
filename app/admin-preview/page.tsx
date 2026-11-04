"use client";

import React, { useState } from "react";
import { useSearchParams } from "next/navigation";
import AdminShell from "@/components/admin/overview/AdminShell";
import OverviewView from "@/components/admin/overview/OverviewView";
import type { OverviewData, OverviewRange } from "@/lib/admin/overview";

const MOCK_DATA: OverviewData = {
  range: "7d",
  locationId: "loc-main",
  locationName: "Main Print Room",
  stats: {
    jobsToday: 128,
    revenueToday: 4260,
    waiting: 9,
    avgWaitMin: 6,
    deltaJobs: {
      value: 12,
      formatted: "+12% vs last week",
      isPositive: true,
      isGood: true,
    },
    deltaRevenue: {
      value: 18,
      formatted: "+18% vs last week",
      isPositive: true,
      isGood: true,
    },
    deltaWaiting: {
      value: -10,
      formatted: "−10% vs last hour",
      isPositive: false,
      isGood: true,
    },
    deltaAvgWait: {
      value: -1,
      formatted: "−1 min vs last week",
      isPositive: false,
      isGood: true,
    },
    sparklines: {
      jobs: [45, 62, 50, 80, 75, 110, 128],
      revenue: [1800, 2400, 2100, 3100, 2900, 3800, 4260],
      waiting: [14, 11, 13, 10, 12, 9, 9],
      avgWait: [9, 8, 8, 7, 7, 6, 6],
    },
  },
  series: [
    { date: "2026-10-27", label: "Mon", revenue: 2100, jobs: 18 },
    { date: "2026-10-28", label: "Tue", revenue: 2500, jobs: 23 },
    { date: "2026-10-29", label: "Wed", revenue: 2400, jobs: 21 },
    { date: "2026-10-30", label: "Thu", revenue: 3250, jobs: 31 },
    { date: "2026-10-31", label: "Fri", revenue: 2800, jobs: 27 },
    { date: "2026-11-01", label: "Sat", revenue: 2500, jobs: 24 },
    { date: "2026-11-02", label: "Sun", revenue: 4260, jobs: 36 },
  ],
  liveQueue: [
    {
      id: "j-1",
      tokenNumber: "RP1042",
      studentName: "Aarav Nair",
      fileName: "Operating_Systems_Notes.pdf",
      totalPages: 24,
      copies: 2,
      status: "PRINTING",
      waitTimeMin: 2,
    },
    {
      id: "j-2",
      tokenNumber: "RP1043",
      studentName: "Meera Iyer",
      fileName: "Lab_Record.docx",
      totalPages: 12,
      copies: 1,
      status: "WAITING",
      waitTimeMin: 3,
    },
    {
      id: "j-3",
      tokenNumber: "RP1044",
      studentName: "Rohan Deshpande",
      fileName: "Project_Report.pdf",
      totalPages: 18,
      copies: 1,
      status: "WAITING",
      waitTimeMin: 4,
    },
    {
      id: "j-4",
      tokenNumber: "RP1045",
      studentName: "Ananya Sharma",
      fileName: "Data_Structures.pdf",
      totalPages: 32,
      copies: 1,
      status: "WAITING",
      waitTimeMin: 5,
    },
    {
      id: "j-5",
      tokenNumber: "RP1046",
      studentName: "Dev Patel",
      fileName: "Notes.pdf",
      totalPages: 10,
      copies: 1,
      status: "READY",
      waitTimeMin: 6,
    },
    {
      id: "j-6",
      tokenNumber: "RP1047",
      studentName: "Sneha Menon",
      fileName: "Algorithms.pdf",
      totalPages: 20,
      copies: 1,
      status: "READY",
      waitTimeMin: 7,
    },
  ],
  printers: [
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
    {
      id: "p-3",
      name: "Printer C1",
      location: "Engineering Block",
      status: "ONLINE",
      loadPercent: 54,
    },
  ],
  recentActivity: [
    {
      id: "act-1",
      action: "PAYMENT_VERIFIED",
      title: "Payment received for RP1042",
      actor: "Admin",
      timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      relativeTime: "2 min ago",
      type: "payment",
    },
    {
      id: "act-2",
      action: "JOB_READY",
      title: "Job RP1041 marked as Ready",
      actor: "Admin",
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      relativeTime: "5 min ago",
      type: "status",
    },
    {
      id: "act-3",
      action: "USER_CREATED",
      title: "New student registered",
      actor: "Meera Iyer (CS21B042)",
      timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
      relativeTime: "12 min ago",
      type: "user",
    },
  ],
};

const LOCATIONS = [
  { id: "loc-main", name: "Main Print Room", building: "Central Library\nBlock A" },
  { id: "loc-lib", name: "Library Print Hub", building: "Central Library\nFloor 2" },
  { id: "loc-eng", name: "Engineering Block", building: "Tech Tower\nGround Floor" },
];

export default function OverviewPreviewPage() {
  const searchParams = useSearchParams();
  const queryState = searchParams?.get("state") as "loaded" | "loading" | "error" | null;

  const [internalState, setInternalState] = useState<"loaded" | "loading" | "error">("loaded");
  const viewState = queryState || internalState;

  const [range, setRange] = useState<OverviewRange>("7d");

  return (
    <div>
      <AdminShell
        adminName="Admin"
        adminRole="SUPER_ADMIN"
        adminEmail="admin@campus.edu"
        locations={LOCATIONS}
        currentLocationId="loc-main"
        currentLocationName="Main Print Room"
        locationBuilding="Central Library\nBlock A"
        isSuperAdmin={true}
      >
        <OverviewView
          data={viewState === "loaded" ? MOCK_DATA : null}
          range={range}
          onRangeChange={(newRange) => setRange(newRange)}
          isLoading={viewState === "loading"}
          error={viewState === "error" ? "Network timeout fetching print queue metrics." : null}
          onRetry={() => setInternalState("loaded")}
          lastRefreshedText="Updated just now"
        />
      </AdminShell>
    </div>
  );
}
