"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import StudentTopNav, { StudentNavTab } from "@/components/student/edit/StudentTopNav";
import ActiveJobsTab from "@/components/student/active/ActiveJobsTab";
import HistoryTab from "@/components/student/history/HistoryTab";
import LocationsTab from "@/components/student/locations/LocationsTab";
import PaymentSuccessView from "@/components/payment/PaymentSuccessView";
import type { PrintJob, PrintLocation } from "@/app/student/page";

const SAMPLE_ACTIVE_JOBS: PrintJob[] = [
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
    createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
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
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
];

const SAMPLE_HISTORY_JOBS: PrintJob[] = [
  {
    id: "job-hist-1",
    tokenNumber: "RP1042",
    fileName: "Operating_Systems_Notes.pdf",
    totalPages: 24,
    copies: 1,
    colorMode: "COLOR",
    printType: "double-sided",
    amount: 68.0,
    status: "COLLECTED",
    createdAt: "Oct 28, 2025 • 10:24 AM",
  },
  {
    id: "job-hist-2",
    tokenNumber: "RP1043",
    fileName: "Lab_Record.docx",
    totalPages: 12,
    copies: 1,
    colorMode: "BW",
    printType: "single-sided",
    amount: 34.0,
    status: "CANCELLED",
    createdAt: "Oct 27, 2025 • 03:15 PM",
  },
  {
    id: "job-hist-3",
    tokenNumber: "RP1039",
    fileName: "Notes.pdf",
    totalPages: 10,
    copies: 1,
    colorMode: "BW",
    printType: "single-sided",
    amount: 20.0,
    status: "COLLECTED",
    createdAt: "Oct 26, 2025 • 11:20 AM",
  },
  {
    id: "job-hist-4",
    tokenNumber: "RP1035",
    fileName: "Project_Report.pdf",
    totalPages: 18,
    copies: 1,
    colorMode: "COLOR",
    printType: "single-sided",
    amount: 54.0,
    status: "COLLECTED",
    createdAt: "Oct 25, 2025 • 01:12 PM",
  },
  {
    id: "job-hist-5",
    tokenNumber: "RP1031",
    fileName: "Data_Structures.pdf",
    totalPages: 32,
    copies: 1,
    colorMode: "COLOR",
    printType: "double-sided",
    amount: 96.0,
    status: "COLLECTED",
    createdAt: "Oct 24, 2025 • 09:45 AM",
  },
  // Items 6 to 23 to populate pagination to 23 results
  ...Array.from({ length: 18 }, (_, i) => ({
    id: `job-hist-extra-${i + 6}`,
    tokenNumber: `RP${1025 - i}`,
    fileName: `Assignment_${i + 1}.pdf`,
    totalPages: 14 + (i % 8),
    copies: 1,
    colorMode: i % 2 === 0 ? "BW" : "COLOR",
    printType: i % 3 === 0 ? "double-sided" : "single-sided",
    amount: 28.0 + (i % 5) * 10,
    status: i % 6 === 0 ? ("CANCELLED" as const) : ("COLLECTED" as const),
    createdAt: `Oct ${23 - Math.floor(i / 2)}, 2025 • 10:00 AM`,
  })),
];

const SAMPLE_LOCATIONS: PrintLocation[] = [
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

export default function DesktopPreviewPage() {
  const [activeTab, setActiveTab] = useState<StudentNavTab>("active");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("loc-2");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const screen = params.get("screen");
    if (screen === "success") {
      setShowSuccessModal(true);
      setActiveTab("new");
    } else if (screen === "active") {
      setActiveTab("active");
    } else if (screen === "history") {
      setActiveTab("history");
    } else if (screen === "locations") {
      setActiveTab("locations");
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      {/* Visual Verification Control Bar */}
      <div className="bg-white/95 backdrop-blur-md border-b border-slate-200 py-2 px-6 flex items-center justify-between text-xs z-50 print:hidden">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-700">Preview Screen:</span>
          <button
            onClick={() => {
              setShowSuccessModal(true);
              setActiveTab("new");
            }}
            className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
              showSuccessModal
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
          >
            A. Success Modal
          </button>
          <button
            onClick={() => {
              setShowSuccessModal(false);
              setActiveTab("active");
            }}
            className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
              !showSuccessModal && activeTab === "active"
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
          >
            B. Active Jobs
          </button>
          <button
            onClick={() => {
              setShowSuccessModal(false);
              setActiveTab("history");
            }}
            className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
              !showSuccessModal && activeTab === "history"
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
          >
            C. Print History
          </button>
          <button
            onClick={() => {
              setShowSuccessModal(false);
              setActiveTab("locations");
            }}
            className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
              !showSuccessModal && activeTab === "locations"
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
          >
            D. Print Centers
          </button>
        </div>
        <div className="text-slate-400 font-mono">
          Viewport: 1440×900
        </div>
      </div>

      {/* Common Chrome Top Navigation */}
      <StudentTopNav
        activeTab={activeTab}
        onTabChange={(t) => {
          setActiveTab(t);
          setShowSuccessModal(false);
        }}
        activeJobsCount={2}
        userName="Aarav Nair"
        admissionNumber="CS21B042"
      />

      {/* Main Container */}
      <main className="flex-1 max-w-[1440px] mx-auto w-full px-6 sm:px-8 py-6 sm:py-8">
        {/* Screen A Background: Realistic New Print screen matching top-left reference */}
        {activeTab === "new" && (
          <div className="space-y-6">
            <div className="text-xs font-semibold text-indigo-600 flex items-center gap-1.5">
              <span>← Back to home</span>
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-[#0F172A] tracking-tight">
                New Print
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Upload your documents and customize print options.
              </p>
            </div>

            {/* Stepper Pills */}
            <div className="flex items-center gap-3">
              <span className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-xs border border-emerald-200">
                ✓ 1 Location
              </span>
              <span className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-xs border border-emerald-200">
                ✓ 2 Upload
              </span>
              <span className="px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold text-xs border border-indigo-200">
                3 Edit
              </span>
              <span className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-400 font-medium text-xs">
                4 Preferences
              </span>
            </div>

            {/* Staged Document Card & Preview */}
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">
                      PDF
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">
                        Operating_Systems_Notes.pdf
                      </h4>
                      <p className="text-xs text-slate-400">24 pages • 2.4 MB</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <div
                      key={n}
                      className="aspect-[3/4] bg-slate-50 border border-slate-200 rounded-lg p-2 text-center flex flex-col justify-between"
                    >
                      <span className="text-[10px] text-slate-400">Page {n}</span>
                      <div className="h-1 bg-slate-200 rounded w-1/2 mx-auto" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                <h4 className="font-bold text-sm text-[#0F172A]">Order Summary</h4>
                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Document pages</span>
                    <span className="font-mono">24</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Copies</span>
                    <span className="font-mono">1</span>
                  </div>
                  <div className="flex justify-between font-bold pt-2 border-t text-sm text-[#0F172A]">
                    <span>Total</span>
                    <span className="font-mono">₹68.00</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Screen B: Active Jobs Tab */}
        {activeTab === "active" && !showSuccessModal && (
          <ActiveJobsTab
            activeJobs={SAMPLE_ACTIVE_JOBS}
            onStartNewPrint={() => setActiveTab("new")}
            onBackToHome={() => setActiveTab("new")}
          />
        )}

        {/* Screen C: Print History Tab */}
        {activeTab === "history" && !showSuccessModal && (
          <HistoryTab
            allJobs={SAMPLE_HISTORY_JOBS}
            onReprint={() => setActiveTab("new")}
            onBackToHome={() => setActiveTab("new")}
          />
        )}

        {/* Screen D: Print Centers Tab */}
        {activeTab === "locations" && !showSuccessModal && (
          <LocationsTab
            locations={SAMPLE_LOCATIONS}
            selectedLocationId={selectedLocationId}
            onSelectLocation={(id) => {
              setSelectedLocationId(id);
              setActiveTab("new");
            }}
            onBackToHome={() => setActiveTab("new")}
          />
        )}
      </main>

      {/* Screen A Success Modal */}
      {showSuccessModal && (
        <PaymentSuccessView
          tokenNumber="RP1042"
          jobId="job-rp1042"
          queueAheadCount={2}
          estimatedWaitMinutes={3}
          onClose={() => setShowSuccessModal(false)}
          onBackToHome={() => {
            setShowSuccessModal(false);
            setActiveTab("active");
          }}
        />
      )}
    </div>
  );
}
