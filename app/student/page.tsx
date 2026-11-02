"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import WebsiteLoader from "@/components/ui/WebsiteLoader";

// ─── Shared Print Job Interface ───────────────────────────────────────────────
export interface PrintJob {
  id: string;
  fileName: string;
  tokenNumber: string;
  status: "WAITING" | "PRINTING" | "READY" | "COLLECTED" | "CANCELLED";
  paymentStatus?: "PENDING" | "PAID";
  currentPage?: number;
  totalPrintPages?: number;
  amount: number;
  colorMode: string;
  printType?: string;
  totalPages: number;
  copies: number;
  createdAt: unknown;
  printerNode?: string;
}

export interface PrintLocation {
  id: string;
  name: string;
  building?: string;
  floor?: string;
  isActive: boolean;
  openTime?: string;
  closeTime?: string;
}

// ─── Dynamic Component Loading ────────────────────────────────────────────────
const MobileStudentView = dynamic(
  () => import("@/components/student/MobileStudentView"),
  { ssr: false }
);

const DesktopStudentView = dynamic(
  () => import("@/components/student/DesktopStudentView"),
  { ssr: false }
);

export default function StudentPage() {
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [locations, setLocations] = useState<PrintLocation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/print-jobs/user");
      if (!res.ok) return;
      const data = await res.json();
      setJobs(data.printJobs ?? []);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLocations = useCallback(async () => {
    try {
      const res = await fetch("/api/locations");
      if (!res.ok) return;
      const data = await res.json();
      setLocations(data.locations ?? []);
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    fetchJobs();
    fetchLocations();
    const id = setInterval(fetchJobs, 15_000);
    return () => clearInterval(id);
  }, [fetchJobs, fetchLocations]);

  const activeJobs = jobs.filter(
    (j) => j.status !== "COLLECTED" && j.status !== "CANCELLED"
  );

  if (loading) {
    return <WebsiteLoader message="Loading QDoc..." />;
  }

  const isDedicatedStep =
    typeof window !== "undefined" &&
    ["edit", "preferences", "settings"].includes(
      new URLSearchParams(window.location.search).get("step") || ""
    );

  if (isDedicatedStep) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-[#0B0F19] transition-colors">
        <DesktopStudentView
          activeJobs={activeJobs}
          allJobs={jobs}
          locations={locations}
          onJobCreated={fetchJobs}
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-[#0B0F19] transition-colors">
      <div className="block md:hidden">
        <MobileStudentView
          activeJobs={activeJobs}
          allJobs={jobs}
          locations={locations}
          onJobCreated={fetchJobs}
        />
      </div>
      <div className="hidden md:block">
        <DesktopStudentView
          activeJobs={activeJobs}
          allJobs={jobs}
          locations={locations}
          onJobCreated={fetchJobs}
        />
      </div>
    </main>
  );
}
