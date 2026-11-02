"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import * as PDFJS from "pdfjs-dist";

// Mobile components suite
import MobileShell from "@/components/mobile/MobileShell";
import MobileHeader from "@/components/mobile/MobileHeader";
import BottomTabBar, { MobileNavTab } from "@/components/mobile/BottomTabBar";
import SegmentTabs from "@/components/mobile/SegmentTabs";
import StepHeader from "@/components/mobile/StepHeader";
import UploadStepper, { MobileStepperStep } from "@/components/mobile/UploadStepper";
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

import HistoryTab from "@/components/student/history/HistoryTab";
import LocationsTab from "@/components/student/locations/LocationsTab";

import { usePrintSettings } from "@/lib/hooks/usePrintSettings";
import { usePricing } from "@/lib/hooks/usePricing";
import { usePayment } from "@/lib/hooks/usePayment";
import { useRazorpayCheckout } from "@/lib/hooks/useRazorpayCheckout";
import { processClientFile } from "@/lib/utils/clientFileProcessor";
import type { ManagedPdfFile, PageItem } from "./PdfEditor";
import type { PrintJob, PrintLocation } from "@/app/student/page";
import { Lock, ArrowRight, Sparkles, Plus } from "lucide-react";

PDFJS.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`;

interface MobileStudentViewProps {
  activeJobs?: PrintJob[];
  allJobs?: PrintJob[];
  locations?: PrintLocation[];
  onJobCreated?: () => void;
  initialTab?: MobileNavTab | "landing";
  initialStep?: "LOCATION" | "UPLOAD" | "EDIT" | "SETTINGS";
}

export default function MobileStudentView({
  activeJobs = [],
  allJobs = [],
  locations = [],
  onJobCreated,
  initialTab = "landing",
  initialStep = "LOCATION",
}: MobileStudentViewProps) {
  const { data: session } = useSession();

  // Navigation State
  const [mobileTab, setMobileTab] = useState<MobileNavTab | "landing">(initialTab);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const [showSuccessSheet, setShowSuccessSheet] = useState(false);
  const [confirmedTokenNumber, setConfirmedTokenNumber] = useState("RP1042");
  const [activeTokenSlipJob, setActiveTokenSlipJob] = useState<PrintJob | null>(null);

  // Razorpay Checkout Hook
  const {
    ready: isRazorpayReady,
    status: razorpayStatus,
    error: razorpayError,
    open: openRazorpay,
    reloadScript: reloadRazorpayScript,
  } = useRazorpayCheckout();

  // Selected Active Job for screen 8
  const [selectedActiveJobId, setSelectedActiveJobId] = useState<string | null>(
    activeJobs[0]?.id || null
  );

  // Wizard and print settings via shared hook
  const {
    wizardStep,
    setWizardStep,
    selectedLocationId,
    setSelectedLocationId,
    copies,
    setCopies,
    colorMode,
    setColorMode,
    printType,
    setPrintType,
    paperSize,
    setPaperSize,
    stagedFiles,
    setStagedFiles,
    stagedPages,
    setStagedPages,
    resetSettings,
  } = usePrintSettings({
    userId: session?.user?.id,
    locations,
  });

  // Keep internal step in sync if needed
  useEffect(() => {
    if (initialStep && initialStep !== wizardStep) {
      setWizardStep(initialStep);
    }
  }, [initialStep]);

  // Pricing via shared hook
  const {
    pricing,
    sheetsCount,
    pricePerSheet,
    estimatedCost,
  } = usePricing({
    pagesCount: stagedPages.length,
    copies,
    colorMode,
    printType,
  });

  const totalPages = stagedPages.length;
  const tokenCharge = (pricing as { tokenCharge?: number })?.tokenCharge ?? 1.0;
  const subtotal = sheetsCount * copies * pricePerSheet;
  const totalCost = stagedFiles.length > 0 && totalPages > 0 ? subtotal + tokenCharge : 0;

  // Page Editing Local State (Screen 3)
  const [rotations, setRotations] = useState<Record<string, number>>({});
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [editHistory, setEditHistory] = useState<
    { pages: PageItem[]; rotations: Record<string, number> }[]
  >([]);
  const [redoHistory, setRedoHistory] = useState<
    { pages: PageItem[]; rotations: Record<string, number> }[]
  >([]);

  // Compilation, upload, and payment via shared hook
  const {
    isRazorpayModalOpen,
    setIsRazorpayModalOpen,
    submitting,
    error: paymentError,
    setError: setPaymentError,
    handleInitiatePayment,
    handlePaymentSuccess,
  } = usePayment({
    stagedFiles,
    stagedPages,
    copies,
    colorMode,
    printType,
    paperSize,
    selectedLocationId,
    pageRotations: rotations,
    onSuccess: (newToken) => {
      if (newToken) setConfirmedTokenNumber(newToken);
      setShowPaymentSheet(false);
      setShowSuccessSheet(true);
      resetSettings();
      onJobCreated?.();
    },
  });

  const handleMobilePay = async () => {
    setPaymentError("");

    if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
      const msg = "Payment is not configured";
      if (process.env.NODE_ENV !== "production") {
        console.error("[MobileStudentView] NEXT_PUBLIC_RAZORPAY_KEY_ID is missing");
      }
      setPaymentError(msg);
      return;
    }

    if (!isRazorpayReady) {
      setPaymentError("Payment gateway is loading. Please wait a moment.");
      return;
    }

    try {
      const draft = await handleInitiatePayment();
      if (!draft || !draft.orderId) {
        return;
      }

      await openRazorpay({
        orderId: draft.orderId,
        amountRupees: draft.amountRupees ?? (draft.amount != null ? draft.amount / 100 : totalCost),
        description: "Campus Print Hub Job",
        prefill: {
          name: session?.user?.name || undefined,
          email: session?.user?.email || undefined,
        },
        onSuccess: async (res) => {
          try {
            await handlePaymentSuccess({
              razorpay_payment_id: res.razorpay_payment_id,
              razorpay_order_id: res.razorpay_order_id,
              razorpay_signature: res.razorpay_signature,
            });
          } catch (verifyErr: unknown) {
            setPaymentError(
              verifyErr instanceof Error
                ? verifyErr.message
                : "Payment verification failed."
            );
          }
        },
        onDismiss: () => {
          // Closed checkout modal without error
        },
        onFailure: (reason) => {
          setPaymentError(reason);
        },
      });
    } catch (err: unknown) {
      setPaymentError(
        err instanceof Error ? err.message : "Payment initialization failed."
      );
    }
  };

  // Build PageItem list from stagedPages
  const currentPages: PageItem[] = useMemo(() => {
    return stagedPages.map((p, idx) => ({
      id: `${p.fileId}::${p.originalIndex}::${idx}`,
      fileId: p.fileId,
      originalIndex: p.originalIndex,
    }));
  }, [stagedPages]);

  // Render PDF thumbnails for uploaded files
  useEffect(() => {
    let isCancelled = false;

    const renderThumbs = async () => {
      for (const file of stagedFiles) {
        if (file.isNonPdfDoc || !file.rawBytes || file.rawBytes.length === 0) continue;
        try {
          const raw =
            file.rawBytes instanceof Uint8Array
              ? file.rawBytes.slice()
              : new Uint8Array(file.rawBytes).slice();
          const loadingTask = PDFJS.getDocument({ data: raw });
          const pdfDoc = await loadingTask.promise;
          const numPages = pdfDoc.numPages;

          for (let i = 1; i <= numPages; i++) {
            if (isCancelled) break;
            const pageItem = currentPages.find(
              (p) => p.fileId === file.id && p.originalIndex === i - 1
            );
            if (!pageItem || thumbs[pageItem.id]) continue;

            const page = await pdfDoc.getPage(i);
            const viewport = page.getViewport({ scale: 0.35 });
            const canvas = document.createElement("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              await page.render({ canvasContext: ctx, viewport }).promise;
              const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
              if (!isCancelled) {
                setThumbs((prev) => ({ ...prev, [pageItem.id]: dataUrl }));
              }
            }
          }
        } catch (err) {
          console.error("Thumbnail generation error:", err);
        }
      }
    };

    if (stagedFiles.length > 0 && currentPages.length > 0) {
      renderThumbs();
    }

    return () => {
      isCancelled = true;
    };
  }, [stagedFiles, currentPages]);

  // Handle uploading files in screen 7
  const handleFilesSelected = async (files: File[]) => {
    try {
      let updatedFiles = [...stagedFiles];
      let updatedPages = [...stagedPages];

      for (const file of files) {
        const res = await processClientFile(file, updatedFiles);
        updatedFiles = [...updatedFiles, res.file];
        updatedPages = [...updatedPages, ...res.pages];
      }

      setStagedFiles(updatedFiles);
      setStagedPages(updatedPages);
      if (updatedPages.length > 0 && !selectedPageId) {
        setSelectedPageId(`${updatedPages[0].fileId}::${updatedPages[0].originalIndex}::0`);
      }
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : "Failed to load files.");
    }
  };

  const handleRemoveFile = (id: string) => {
    const nextFiles = stagedFiles.filter((f) => f.id !== id);
    const nextPages = stagedPages.filter((p) => p.fileId !== id);
    setStagedFiles(nextFiles);
    setStagedPages(nextPages);
  };

  // Reorder pages in screen 3
  const handleReorderPages = (activeId: string, overId: string) => {
    const oldIdx = currentPages.findIndex((p) => p.id === activeId);
    const newIdx = currentPages.findIndex((p) => p.id === overId);
    if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return;

    setEditHistory((prev) => [...prev, { pages: currentPages, rotations }]);
    setRedoHistory([]);

    const reordered = [...currentPages];
    const [moved] = reordered.splice(oldIdx, 1);
    reordered.splice(newIdx, 0, moved);

    setStagedPages(reordered.map((p) => ({ fileId: p.fileId, originalIndex: p.originalIndex })));
  };

  // Rotate single page
  const handleRotatePage = (pageId: string) => {
    setEditHistory((prev) => [...prev, { pages: currentPages, rotations }]);
    setRedoHistory([]);
    setRotations((prev) => ({
      ...prev,
      [pageId]: ((prev[pageId] || 0) + 90) % 360,
    }));
  };

  // Delete single page
  const handleDeletePage = (pageId: string) => {
    setEditHistory((prev) => [...prev, { pages: currentPages, rotations }]);
    setRedoHistory([]);
    const nextPages = currentPages.filter((p) => p.id !== pageId);
    setStagedPages(nextPages.map((p) => ({ fileId: p.fileId, originalIndex: p.originalIndex })));
    if (selectedPageId === pageId) {
      setSelectedPageId(nextPages[0]?.id || null);
    }
  };

  // Rotate all pages
  const handleRotateAll = () => {
    setEditHistory((prev) => [...prev, { pages: currentPages, rotations }]);
    setRedoHistory([]);
    const nextRotations = { ...rotations };
    currentPages.forEach((p) => {
      nextRotations[p.id] = ((nextRotations[p.id] || 0) + 90) % 360;
    });
    setRotations(nextRotations);
  };

  // Undo / Redo
  const handleUndo = () => {
    if (editHistory.length === 0) return;
    const last = editHistory[editHistory.length - 1];
    setRedoHistory((prev) => [...prev, { pages: currentPages, rotations }]);
    setEditHistory((prev) => prev.slice(0, -1));
    setStagedPages(last.pages.map((p) => ({ fileId: p.fileId, originalIndex: p.originalIndex })));
    setRotations(last.rotations);
  };

  const handleRedo = () => {
    if (redoHistory.length === 0) return;
    const next = redoHistory[redoHistory.length - 1];
    setEditHistory((prev) => [...prev, { pages: currentPages, rotations }]);
    setRedoHistory((prev) => prev.slice(0, -1));
    setStagedPages(next.pages.map((p) => ({ fileId: p.fileId, originalIndex: p.originalIndex })));
    setRotations(next.rotations);
  };

  // Map locations for Screen 2
  const mobileLocationsData: MobileLocationData[] = useMemo(() => {
    return locations.map((loc, idx) => ({
      id: loc.id,
      name: loc.name,
      building: loc.building,
      floor: loc.floor,
      openTime: loc.openTime || "8:00 AM",
      closeTime: loc.closeTime || "8:00 PM",
      isOpen: loc.isActive !== false,
      queueAhead: idx === 0 ? 3 : idx === 1 ? 5 : 1,
      estWaitMinutes: idx === 0 ? 4 : idx === 1 ? 7 : 2,
      printersCount: idx === 0 ? 5 : idx === 1 ? 3 : 4,
      isSelectable: loc.isActive !== false,
    }));
  }, [locations]);

  // Stepper step (1: Upload, 2: Edit, 3: Confirm/Preferences, 4: Pay)
  const currentStepperStep: MobileStepperStep = useMemo(() => {
    if (wizardStep === "LOCATION" || wizardStep === "UPLOAD") return 1;
    if (wizardStep === "EDIT") return 2;
    if (wizardStep === "SETTINGS") return 3;
    return 4;
  }, [wizardStep]);

  // Current active job for Screen 8
  const activeJobToDisplay: PrintJob = useMemo(() => {
    if (selectedActiveJobId) {
      const found = activeJobs.find((j) => j.id === selectedActiveJobId);
      if (found) return found;
    }
    if (activeJobs.length > 0) return activeJobs[0];
    return {
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
    };
  }, [activeJobs, selectedActiveJobId]);

  // Determine if BottomTabBar should be hidden
  // Requirement: "Hide on step screens 2–6 and token slip."
  const isStepScreen =
    mobileTab === "new" &&
    (wizardStep === "LOCATION" || wizardStep === "SETTINGS");
  const hideBottomBar = isStepScreen || activeTokenSlipJob !== null;

  return (
    <MobileShell className="h-[100dvh] max-h-[100dvh] flex flex-col justify-between overflow-hidden">
      {/* ── Screen 10: Token Slip View ── */}
      {activeTokenSlipJob ? (
        <div className="flex-1 min-h-0 px-3 py-4 pb-6 overflow-y-auto">
          <TokenSlipTicket
            job={activeTokenSlipJob}
            locationName={
              locations.find((l) => l.id === selectedLocationId)?.name ||
              "Main Print Room"
            }
            onBack={() => setActiveTokenSlipJob(null)}
            onClose={() => setActiveTokenSlipJob(null)}
          />
        </div>
      ) : (
        <>
          {/* Top Header */}
          <MobileHeader
            onOpenNotifications={() => setShowNotifications(true)}
            onOpenProfile={() => setShowProfileSheet(true)}
            showBell={true}
          />

          {/* ── Screen 1: Landing View ── */}
          {mobileTab === "landing" && (
            <div className="flex-1 min-h-0 flex flex-col justify-between overflow-y-auto">
              <MobileLandingView
                onStartPrinting={() => {
                  setMobileTab("new");
                  setWizardStep("LOCATION");
                }}
                onSeeHowItWorks={() => {
                  setMobileTab("new");
                  setWizardStep("LOCATION");
                }}
              />
            </div>
          )}

          {/* ── Screen 2: Choose Location ── */}
          {mobileTab === "new" && wizardStep === "LOCATION" && (
            <div className="flex-1 min-h-0 flex flex-col justify-between p-4 pb-4 space-y-3 overflow-y-auto">
              <StepHeader
                title="Choose a print location"
                subtitle="Select a print center near you."
                onBack={() => setMobileTab("landing")}
                backLabel="Back"
              />

              <div className="space-y-2.5 my-auto overflow-y-auto">
                {mobileLocationsData.map((loc) => (
                  <LocationCard
                    key={loc.id}
                    location={loc}
                    isSelected={selectedLocationId === loc.id}
                    onSelect={(id) => setSelectedLocationId(id)}
                  />
                ))}
              </div>

              {/* Sticky Continue Footer */}
              <div className="pt-2 bg-[#F8FAFC]">
                <button
                  type="button"
                  disabled={!selectedLocationId}
                  onClick={() => setWizardStep("UPLOAD")}
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </div>
          )}

          {/* ── Screen 7: New Print, Upload Step ── */}
          {mobileTab === "new" && wizardStep === "UPLOAD" && (
            <div className="flex-1 min-h-0 flex flex-col justify-between overflow-hidden">
              <div>
                {/* Segment Tabs */}
                <SegmentTabs
                  activeTab={mobileTab}
                  onTabChange={(tab) => setMobileTab(tab)}
                />
              </div>

              <div className="px-4 py-2 space-y-3 flex-1 min-h-0 overflow-y-auto">
                {/* 4-Step Mini Stepper */}
                <UploadStepper
                  currentStep={1}
                  onStepClick={(step) => {
                    if (step === 2 && stagedPages.length > 0) setWizardStep("EDIT");
                    if (step === 3 && stagedPages.length > 0) setWizardStep("SETTINGS");
                  }}
                />

                {/* File Drop Area */}
                <FileDropArea
                  onFilesSelected={handleFilesSelected}
                  isProcessing={submitting}
                />

                {/* Uploaded Files List */}
                {stagedFiles.length > 0 && (
                  <div className="space-y-1.5 pt-0.5">
                    <h3 className="text-xs font-bold text-slate-700">
                      Uploaded Files ({stagedFiles.length})
                    </h3>
                    <div className="space-y-1.5">
                      {stagedFiles.map((file) => (
                        <UploadedFileRow
                          key={file.id}
                          file={{
                            id: file.id,
                            name: file.fileName,
                            sizeBytes: file.fileSize,
                            pageCount: file.keptPageIndices?.length || file.totalOriginalPages || 1,
                            type: file.fileType,
                          }}
                          onRemove={handleRemoveFile}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Price Footer */}
              <div className="bg-white border-t border-slate-200/90 px-4 py-2.5 flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-xs text-slate-400 font-medium block">
                    Estimated total
                  </span>
                  <span className="text-xl font-black text-[#0F172A] font-mono">
                    ₹{totalCost.toFixed(2)}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={stagedFiles.length === 0}
                  onClick={() => setWizardStep("EDIT")}
                  className="h-10 px-6 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-500/25 flex items-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </div>
          )}

          {/* ── Screen 3: Edit Pages ── */}
          {mobileTab === "new" && wizardStep === "EDIT" && (
            <div className="flex-1 min-h-0 flex flex-col justify-between overflow-hidden">
              <div className="p-3.5 space-y-2 flex-1 min-h-0 overflow-y-auto">
                <StepHeader
                  onBack={() => setWizardStep("UPLOAD")}
                  backLabel="Edit Pages"
                  rightElement={`${currentPages.length} pages`}
                />

                {/* 3-Column Thumb Grid */}
                <PageThumbGrid
                  pages={currentPages}
                  rotations={rotations}
                  thumbs={thumbs}
                  selectedPageId={selectedPageId}
                  onSelectPage={(id) => setSelectedPageId(id)}
                  onRotatePage={handleRotatePage}
                  onDeletePage={handleDeletePage}
                  onReorderPages={handleReorderPages}
                />
              </div>

              {/* Page Action Bar */}
              <PageActionBar
                onRotateSelected={() => {
                  if (selectedPageId) handleRotatePage(selectedPageId);
                }}
                onDeleteSelected={() => {
                  if (selectedPageId) handleDeletePage(selectedPageId);
                }}
                onRotateAll={handleRotateAll}
                onUndo={handleUndo}
                onRedo={handleRedo}
                canUndo={editHistory.length > 0}
                canRedo={redoHistory.length > 0}
                hasSelection={selectedPageId !== null}
                onDone={() => setWizardStep("SETTINGS")}
              />
            </div>
          )}

          {/* ── Screen 4: Print Preferences ── */}
          {mobileTab === "new" && wizardStep === "SETTINGS" && (
            <div className="flex-1 min-h-0 flex flex-col justify-between p-4 pb-3 space-y-2.5 overflow-y-auto">
              <StepHeader
                title="Print Preferences"
                subtitle="Choose your options."
                onBack={() => setWizardStep("EDIT")}
                backLabel="Back"
              />

              <div className="space-y-2.5 my-auto">
                {/* Color Mode Section */}
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

                {/* Print Sides Section */}
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

                {/* Copies Section */}
                <div className="space-y-1.5">
                  <h3 className="text-xs font-bold text-slate-700">Copies</h3>
                  <CopiesStepper
                    value={copies}
                    onChange={(val) => setCopies(val)}
                  />
                </div>

                {/* Paper Size Section (Locked) */}
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

              {/* Sticky Footer: Total & Continue */}
              <div className="pt-2 bg-[#F8FAFC] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">
                    Total
                  </span>
                  <span className="text-2xl font-black text-[#0F172A] font-mono">
                    ₹{totalCost.toFixed(2)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowPaymentSheet(true)}
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
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

          {/* ── Screen 8: Active Job Detail ── */}
          {mobileTab === "active" && (
            <div className="flex-1 min-h-0 px-4 py-2 space-y-3 overflow-y-auto">
              <ActiveJobCard
                job={activeJobToDisplay}
                queuePosition={2}
                estWaitMinutes={3}
                onOpenTokenSlip={(jobId) => {
                  const job = activeJobs.find((j) => j.id === jobId) || activeJobToDisplay;
                  setActiveTokenSlipJob(job);
                }}
              />
            </div>
          )}

          {/* ── History Tab ── */}
          {mobileTab === "history" && (
            <div className="flex-1 min-h-0 p-4 pb-4 space-y-4 overflow-y-auto">
              <HistoryTab
                allJobs={allJobs}
                onReprint={() => {
                  setMobileTab("new");
                  setWizardStep("UPLOAD");
                }}
              />
            </div>
          )}

          {/* ── Locations Tab ── */}
          {mobileTab === "locations" && (
            <div className="flex-1 min-h-0 p-4 pb-4 space-y-4 overflow-y-auto">
              <LocationsTab
                locations={locations}
                selectedLocationId={selectedLocationId}
                onSelectLocation={(id) => {
                  setSelectedLocationId(id);
                  setMobileTab("new");
                  setWizardStep("UPLOAD");
                }}
              />
            </div>
          )}

          {/* ── Screen 5: Payment Sheet ── */}
          <PaymentSheet
            isOpen={showPaymentSheet}
            onClose={() => setShowPaymentSheet(false)}
            subtotal={subtotal}
            tokenCharge={tokenCharge}
            total={totalCost}
            isProcessing={submitting || razorpayStatus === "opening"}
            isReady={isRazorpayReady}
            isCheckoutOpen={razorpayStatus === "open"}
            isUnavailable={!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID}
            errorMessage={paymentError || razorpayError}
            onRetryScript={reloadRazorpayScript}
            onPay={handleMobilePay}
          />

          {/* ── Screen 6: Success Sheet ── */}
          <SuccessSheet
            isOpen={showSuccessSheet}
            onClose={() => setShowSuccessSheet(false)}
            tokenNumber={confirmedTokenNumber}
            queueAheadCount={2}
            estimatedWaitMinutes={3}
            onViewTokenSlip={() => {
              setShowSuccessSheet(false);
              setActiveTokenSlipJob(activeJobToDisplay);
            }}
            onBackToHome={() => {
              setShowSuccessSheet(false);
              setMobileTab("active");
            }}
          />

          {/* ── Screen 9: Notifications Sheet ── */}
          <NotificationsSheet
            isOpen={showNotifications}
            onClose={() => setShowNotifications(false)}
          />

          {/* ── Profile Bottom Sheet ── */}
          <ProfileSheet
            isOpen={showProfileSheet}
            onClose={() => setShowProfileSheet(false)}
            onOpenNotifications={() => setShowNotifications(true)}
            onNavigateHistory={() => {
              setMobileTab("history");
              setShowProfileSheet(false);
            }}
          />

          {/* Bottom Tab Bar (Screen 1, 7, 8 & other tabs) */}
          {!hideBottomBar && (
            <BottomTabBar
              activeTab={mobileTab}
              className="relative flex-shrink-0"
              onTabChange={(tab) => setMobileTab(tab)}
              activeJobsCount={activeJobs.length}
            />
          )}
        </>
      )}
    </MobileShell>
  );
}