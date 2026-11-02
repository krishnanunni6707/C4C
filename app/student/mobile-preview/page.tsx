"use client";

import React, { useState, useEffect } from "react";
import MobileShell from "@/components/mobile/MobileShell";
import MobileHeader from "@/components/mobile/MobileHeader";
import BottomTabBar, { MobileNavTab } from "@/components/mobile/BottomTabBar";
import SegmentTabs from "@/components/mobile/SegmentTabs";
import StepHeader from "@/components/mobile/StepHeader";
import UploadStepper from "@/components/mobile/UploadStepper";
import FileDropArea from "@/components/mobile/FileDropArea";
import UploadedFileRow from "@/components/mobile/UploadedFileRow";
import LocationCard, { MobileLocationData } from "@/components/mobile/LocationCard";
import PageThumbGrid from "@/components/mobile/PageThumbGrid";
import PageActionBar from "@/components/mobile/PageActionBar";
import PreferenceRadioCard from "@/components/mobile/PreferenceRadioCard";
import CopiesStepper from "@/components/mobile/CopiesStepper";
import PaymentSheet from "@/components/mobile/PaymentSheet";
import SuccessSheet from "@/components/mobile/SuccessSheet";
import ActiveJobCard from "@/components/mobile/ActiveJobCard";
import NotificationsSheet from "@/components/mobile/NotificationsSheet";
import TokenSlipTicket from "@/components/mobile/TokenSlipTicket";
import MobileLandingView from "@/components/mobile/MobileLandingView";
import ProfileSheet from "@/components/mobile/ProfileSheet";

import { Lock, ArrowRight } from "lucide-react";
import type { PageItem } from "@/components/student/PdfEditor";

export type ScreenId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

const MOCK_LOCATIONS: MobileLocationData[] = [
  {
    id: "loc-1",
    name: "Main Print",
    building: "Academic Block A",
    floor: "1st Floor",
    openTime: "8:00 AM",
    closeTime: "6:00 PM",
    isOpen: true,
    queueAhead: 3,
    estWaitMinutes: 4,
    printersCount: 5,
    isSelectable: true,
  },
  {
    id: "loc-2",
    name: "Library Print Hub",
    building: "Central Library",
    floor: "Ground Floor",
    openTime: "8:00 AM",
    closeTime: "4:00 PM",
    isOpen: false,
    queueAhead: 5,
    estWaitMinutes: 7,
    printersCount: 3,
    isSelectable: false,
  },
  {
    id: "loc-3",
    name: "Engineering Block Center",
    building: "Block B",
    floor: "2nd Floor",
    openTime: "8:00 AM",
    closeTime: "5:00 PM",
    isOpen: true,
    queueAhead: 1,
    estWaitMinutes: 2,
    printersCount: 4,
    isSelectable: true,
  },
];

const MOCK_PAGES: PageItem[] = Array.from({ length: 9 }, (_, i) => ({
  id: `mock-page-${i + 1}`,
  fileId: "file-os",
  originalIndex: i,
}));

export default function MobilePreviewPage() {
  const [activeScreen, setActiveScreen] = useState<ScreenId>(1);
  const [selectedLocationId, setSelectedLocationId] = useState("loc-1");
  const [selectedPageId, setSelectedPageId] = useState<string | null>("mock-page-1");
  const [rotations, setRotations] = useState<Record<string, number>>({});
  const [colorMode, setColorMode] = useState<"BW" | "COLOR">("COLOR");
  const [printType, setPrintType] = useState<"single-sided" | "double-sided">("single-sided");
  const [copies, setCopies] = useState(2);
  const [bottomTab, setBottomTab] = useState<MobileNavTab>("new");
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search).get("screen");
      if (p) {
        const num = parseInt(p, 10);
        if (num >= 1 && num <= 10) {
          setActiveScreen(num as ScreenId);
        }
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center py-6 px-2">
      {/* Top Preview Control Switcher */}
      <div className="w-full max-w-[560px] bg-white rounded-2xl shadow-sm border border-slate-200 p-3 mb-6 space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 pb-1 border-b border-slate-100">
          <span>QDoc Mobile Preview (390×844)</span>
          <span className="text-indigo-600 font-mono">Screen {activeScreen} of 10</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 1 as ScreenId, label: "1. Landing" },
            { id: 2 as ScreenId, label: "2. Location" },
            { id: 7 as ScreenId, label: "7. Upload" },
            { id: 3 as ScreenId, label: "3. Edit Pages" },
            { id: 4 as ScreenId, label: "4. Preferences" },
            { id: 5 as ScreenId, label: "5. Pay Sheet" },
            { id: 6 as ScreenId, label: "6. Success Sheet" },
            { id: 8 as ScreenId, label: "8. Active Job" },
            { id: 9 as ScreenId, label: "9. Notifications" },
            { id: 10 as ScreenId, label: "10. Token Slip" },
          ].map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveScreen(s.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeScreen === s.id
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Device Frame Mockup (390px × 844px) */}
      <div
        id="mobile-viewport"
        className="w-[390px] h-[844px] bg-[#F8FAFC] shadow-2xl rounded-[40px] border-[8px] border-slate-900 overflow-hidden relative flex flex-col"
      >
        <MobileShell hideOverflow={false} className="h-full flex flex-col justify-between">
          {/* ── Screen 1: Landing ── */}
          {activeScreen === 1 && (
            <div className="h-full flex flex-col justify-between">
              <MobileHeader
                onOpenNotifications={() => setActiveScreen(9)}
                showBell={true}
              />
              <MobileLandingView
                onStartPrinting={() => setActiveScreen(2)}
                onSeeHowItWorks={() => setActiveScreen(2)}
              />
              <BottomTabBar
                activeTab="landing"
                className="relative"
                onTabChange={(tab) => {
                  setBottomTab(tab);
                  if (tab === "new") setActiveScreen(7);
                  if (tab === "active") setActiveScreen(8);
                }}
              />
            </div>
          )}

          {/* ── Screen 2: Choose Location ── */}
          {activeScreen === 2 && (
            <div className="h-full flex flex-col justify-between p-4 pb-4">
              <StepHeader
                title="Choose a print location"
                subtitle="Select a print center near you."
                onBack={() => setActiveScreen(1)}
                backLabel="Back"
              />

              <div className="space-y-2.5 my-auto overflow-y-auto">
                {MOCK_LOCATIONS.map((loc) => (
                  <LocationCard
                    key={loc.id}
                    location={loc}
                    isSelected={selectedLocationId === loc.id}
                    onSelect={(id) => setSelectedLocationId(id)}
                  />
                ))}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setActiveScreen(7)}
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 text-white font-bold text-sm shadow-md shadow-indigo-500/25 flex items-center justify-center gap-2"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </div>
          )}

          {/* ── Screen 7: New Print, Upload Step ── */}
          {activeScreen === 7 && (
            <div className="h-full flex flex-col justify-between">
              <div>
                <MobileHeader
                  onOpenNotifications={() => setActiveScreen(9)}
                  onOpenProfile={() => setShowProfile(true)}
                  showBell={true}
                />
                <SegmentTabs
                  activeTab="new"
                  onTabChange={(tab) => {
                    if (tab === "active") setActiveScreen(8);
                  }}
                />
              </div>

              <div className="px-4 py-2 space-y-3 flex-1 overflow-y-auto">
                <UploadStepper
                  currentStep={1}
                  onStepClick={(step) => {
                    if (step === 2) setActiveScreen(3);
                    if (step === 3) setActiveScreen(4);
                  }}
                />

                <FileDropArea onFilesSelected={() => {}} />

                <div className="space-y-1.5 pt-0.5">
                  <h3 className="text-xs font-bold text-slate-700">
                    Uploaded Files (2)
                  </h3>
                  <div className="space-y-1.5">
                    <UploadedFileRow
                      file={{
                        id: "f-1",
                        name: "Operating_Systems_Notes.pdf",
                        sizeBytes: 2.8 * 1024 * 1024,
                        pageCount: 24,
                        type: "application/pdf",
                      }}
                      onRemove={() => {}}
                    />
                    <UploadedFileRow
                      file={{
                        id: "f-2",
                        name: "Lab_Record.docx",
                        sizeBytes: 1.1 * 1024 * 1024,
                        pageCount: 12,
                        type: "application/docx",
                      }}
                      onRemove={() => {}}
                    />
                  </div>
                </div>
              </div>

              <div>
                {/* Sticky Footer */}
                <div className="bg-white border-t border-slate-200/90 px-4 py-2.5 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 font-medium block">
                      Estimated total
                    </span>
                    <span className="text-xl font-black text-[#0F172A] font-mono">
                      ₹68.00
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveScreen(3)}
                    className="h-10 px-6 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-bold text-sm shadow-md shadow-indigo-500/25 flex items-center gap-1.5"
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>

                <BottomTabBar
                  activeTab="new"
                  className="relative"
                  onTabChange={(tab) => {
                    if (tab === "active") setActiveScreen(8);
                  }}
                />
              </div>
            </div>
          )}

          {/* ── Screen 3: Edit Pages ── */}
          {activeScreen === 3 && (
            <div className="h-full flex flex-col justify-between">
              <div className="p-3.5 space-y-2 flex-1 overflow-y-auto">
                <StepHeader
                  onBack={() => setActiveScreen(7)}
                  backLabel="Edit Pages"
                  rightElement="24 pages"
                />

                <PageThumbGrid
                  pages={MOCK_PAGES}
                  rotations={rotations}
                  thumbs={{}}
                  selectedPageId={selectedPageId}
                  onSelectPage={(id) => setSelectedPageId(id)}
                  onRotatePage={(id) =>
                    setRotations((prev) => ({
                      ...prev,
                      [id]: ((prev[id] || 0) + 90) % 360,
                    }))
                  }
                  onDeletePage={() => {}}
                  onReorderPages={() => {}}
                />
              </div>

              <div>
                <PageActionBar
                  onRotateSelected={() => {
                    if (selectedPageId) {
                      setRotations((prev) => ({
                        ...prev,
                        [selectedPageId]: ((prev[selectedPageId] || 0) + 90) % 360,
                      }));
                    }
                  }}
                  onDeleteSelected={() => {}}
                  hasSelection={selectedPageId !== null}
                  onDone={() => setActiveScreen(4)}
                />

                <BottomTabBar
                  activeTab="new"
                  className="relative"
                  onTabChange={(tab) => {
                    if (tab === "active") setActiveScreen(8);
                  }}
                />
              </div>
            </div>
          )}

          {/* ── Screen 4: Print Preferences ── */}
          {activeScreen === 4 && (
            <div className="h-full flex flex-col justify-between p-4 pb-3">
              <StepHeader
                title="Print Preferences"
                subtitle="Choose your options."
                onBack={() => setActiveScreen(3)}
                backLabel="Back"
              />

              <div className="space-y-2.5 my-auto">
                {/* Color Mode */}
                <div className="space-y-1.5">
                  <h3 className="text-xs font-bold text-slate-700">Color Mode</h3>
                  <div className="space-y-1.5">
                    <PreferenceRadioCard
                      label="Black & White"
                      priceTag="₹2 / sheet"
                      isSelected={colorMode === "BW"}
                      onSelect={() => setColorMode("BW")}
                    />
                    <PreferenceRadioCard
                      label="Color"
                      priceTag="₹5 / sheet"
                      isSelected={colorMode === "COLOR"}
                      onSelect={() => setColorMode("COLOR")}
                    />
                  </div>
                </div>

                {/* Print Sides */}
                <div className="space-y-1.5">
                  <h3 className="text-xs font-bold text-slate-700">Print Sides</h3>
                  <div className="space-y-1.5">
                    <PreferenceRadioCard
                      label="Single Sided"
                      isSelected={printType === "single-sided"}
                      onSelect={() => setPrintType("single-sided")}
                    />
                    <PreferenceRadioCard
                      label="Double Sided"
                      isSelected={printType === "double-sided"}
                      onSelect={() => setPrintType("double-sided")}
                    />
                  </div>
                </div>

                {/* Copies */}
                <div className="space-y-1.5">
                  <h3 className="text-xs font-bold text-slate-700">Copies</h3>
                  <CopiesStepper
                    value={copies}
                    onChange={(v) => setCopies(v)}
                  />
                </div>

                {/* Paper Size (Locked) */}
                <div className="space-y-1.5">
                  <h3 className="text-xs font-bold text-slate-700">Paper Size</h3>
                  <div className="w-full bg-white rounded-2xl border border-slate-200/90 px-3.5 py-2.5 flex items-center justify-between text-slate-600 shadow-xs">
                    <div className="flex items-center gap-2.5">
                      <Lock className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-bold text-[#0F172A]">A4</span>
                    </div>
                    <span className="text-xs text-slate-400 font-medium">Standard</span>
                  </div>
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="pt-2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">Total</span>
                  <span className="text-2xl font-black text-[#0F172A] font-mono">
                    ₹68.00
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveScreen(5)}
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-bold text-sm shadow-md shadow-indigo-500/25 flex items-center justify-center gap-2"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </button>
                <p className="text-[11px] text-slate-400 text-center font-medium">
                  Estimated. Final price confirmed at checkout.
                </p>
              </div>
            </div>
          )}

          {/* ── Screen 5: Payment Sheet ── */}
          {activeScreen === 5 && (
            <div className="h-full relative flex flex-col justify-between">
              {/* Blurred background showing screen 4 behind */}
              <div className="p-4 space-y-4 opacity-40 blur-xs pointer-events-none">
                <StepHeader title="Print Preferences" subtitle="Choose your options." />
                <div className="w-full h-32 bg-white rounded-2xl border border-slate-200 p-4" />
              </div>
              <PaymentSheet
                isOpen={true}
                onClose={() => setActiveScreen(4)}
                subtotal={72}
                tokenCharge={1}
                total={68}
                onPay={() => setActiveScreen(6)}
              />
            </div>
          )}

          {/* ── Screen 6: Success Sheet ── */}
          {activeScreen === 6 && (
            <div className="h-full relative flex flex-col justify-between">
              {/* Blurred background */}
              <div className="p-4 space-y-4 opacity-30 blur-xs pointer-events-none">
                <StepHeader title="Print Preferences" subtitle="Choose your options." />
              </div>
              <SuccessSheet
                isOpen={true}
                onClose={() => setActiveScreen(8)}
                tokenNumber="RP1042"
                queueAheadCount={2}
                estimatedWaitMinutes={3}
                onViewTokenSlip={() => setActiveScreen(10)}
                onBackToHome={() => setActiveScreen(8)}
              />
            </div>
          )}

          {/* ── Screen 8: Active Job Detail ── */}
          {activeScreen === 8 && (
            <div className="h-full flex flex-col justify-between">
              <div>
                <MobileHeader
                  onOpenNotifications={() => setActiveScreen(9)}
                  onOpenProfile={() => setShowProfile(true)}
                  showBell={true}
                />
              </div>

              <div className="px-4 py-2 space-y-3 flex-1 overflow-y-auto">
                <ActiveJobCard
                  job={{
                    id: "job-rp1042",
                    tokenNumber: "RP1042",
                    fileName: "Operating_Systems_Notes.pdf",
                    status: "PRINTING",
                    amount: 68.0,
                    totalPages: 24,
                    copies: 2,
                    colorMode: "COLOR",
                    printType: "double-sided",
                    createdAt: new Date().toISOString(),
                  }}
                  queuePosition={2}
                  estWaitMinutes={3}
                  onOpenTokenSlip={() => setActiveScreen(10)}
                />
              </div>

              <BottomTabBar
                activeTab="active"
                className="relative"
                onTabChange={(tab) => {
                  if (tab === "new") setActiveScreen(7);
                  if (tab === "active") setActiveScreen(8);
                }}
                activeJobsCount={1}
              />
            </div>
          )}

          {/* ── Screen 9: Notifications Sheet ── */}
          {activeScreen === 9 && (
            <div className="h-full relative flex flex-col justify-between">
              {/* Blurred background */}
              <div className="p-4 opacity-40 blur-xs pointer-events-none">
                <MobileHeader showBell={false} />
              </div>
              <NotificationsSheet
                isOpen={true}
                onClose={() => setActiveScreen(8)}
              />
            </div>
          )}

          {/* ── Screen 10: Token Slip ── */}
          {activeScreen === 10 && (
            <div className="h-full p-3 py-3 overflow-y-auto">
              <TokenSlipTicket
                job={{
                  id: "job-rp1042",
                  tokenNumber: "RP1042",
                  fileName: "Operating_Systems_Notes.pdf",
                  amount: 68.0,
                  totalPages: 24,
                  copies: 2,
                  colorMode: "COLOR",
                  printType: "double-sided",
                  status: "PRINTING",
                  createdAt: new Date().toISOString(),
                }}
                locationName="Main Print Room"
                createdAtText="Oct 28, 10:24 AM"
                onBack={() => setActiveScreen(8)}
                onClose={() => setActiveScreen(8)}
              />
            </div>
          )}

          {/* ── Profile Sheet in Preview ── */}
          <ProfileSheet
            isOpen={showProfile}
            onClose={() => setShowProfile(false)}
            onOpenNotifications={() => {
              setShowProfile(false);
              setActiveScreen(9);
            }}
            onNavigateHistory={() => setShowProfile(false)}
          />
        </MobileShell>
      </div>
    </div>
  );
}
