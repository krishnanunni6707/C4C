"use client";

import { useState, useCallback, useEffect } from "react";
import type { ManagedPdfFile } from "@/components/student/PdfEditor";
import { useDraftPersistence, DraftState } from "@/lib/hooks/useDraftPersistence";

export interface PrintLocationOption {
  id: string;
  name?: string;
}

export interface UsePrintSettingsOptions {
  userId?: string | null;
  locations?: PrintLocationOption[];
  onFileError?: (err: string) => void;
}

export function usePrintSettings({
  userId,
  locations = [],
  onFileError,
}: UsePrintSettingsOptions = {}) {
  const [wizardStep, setWizardStep] = useState<"UPLOAD" | "EDIT" | "SETTINGS" | "PAYMENT">("UPLOAD");
  const [selectedLocationId, setSelectedLocationId] = useState<string>(() => locations[0]?.id ?? "");
  const [copies, setCopies] = useState<number>(1);
  const [colorMode, setColorMode] = useState<"BW" | "COLOR">("BW");
  const [printType, setPrintType] = useState<"single-sided" | "double-sided">("single-sided");
  const [paperSize, setPaperSize] = useState<"A4" | "Letter">("A4");
  const paymentMethod = "razorpay" as const;

  const [stagedFiles, setStagedFiles] = useState<ManagedPdfFile[]>([]);
  const [stagedPages, setStagedPages] = useState<{ fileId: string; originalIndex: number }[]>([]);

  // Draft persistence hook
  const {
    promptState,
    pendingDraft,
    acceptDraft,
    discardDraft,
    saveDraft,
    clearDraft,
  } = useDraftPersistence({
    userId,
    availableLocationIds: locations.map((l) => l.id),
    defaultLocationId: locations[0]?.id ?? "",
  });

  // Save wizard state when changed
  useEffect(() => {
    saveDraft({
      wizardStep,
      stagedFiles,
      stagedPages,
      selectedLocationId,
      copies,
      colorMode,
      printType,
      paperSize,
      paymentMethod,
    });
  }, [
    wizardStep,
    stagedFiles,
    stagedPages,
    selectedLocationId,
    copies,
    colorMode,
    printType,
    paperSize,
    saveDraft,
  ]);

  const handleFilesChange = useCallback((
    files: ManagedPdfFile[],
    pages: { fileId: string; originalIndex: number }[]
  ) => {
    setStagedFiles(files);
    setStagedPages(pages);
    if (files.length > 0) {
      setWizardStep((prev) => (prev === "UPLOAD" ? "EDIT" : prev));
    } else {
      setWizardStep("UPLOAD");
    }
    onFileError?.("");
  }, [onFileError]);

  const handleAcceptDraft = useCallback((): DraftState | null => {
    const draft = acceptDraft();
    if (draft) {
      setWizardStep(draft.wizardStep);
      setStagedFiles(draft.stagedFiles);
      setStagedPages(draft.stagedPages);
      if (draft.selectedLocationId) setSelectedLocationId(draft.selectedLocationId);
      setCopies(draft.copies);
      setColorMode(draft.colorMode);
      setPrintType(draft.printType);
      setPaperSize(draft.paperSize);
    }
    return draft;
  }, [acceptDraft]);

  const resetSettings = useCallback(() => {
    setStagedFiles([]);
    setStagedPages([]);
    setWizardStep("UPLOAD");
    clearDraft();
  }, [clearDraft]);

  return {
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
    paymentMethod,
    stagedFiles,
    setStagedFiles,
    stagedPages,
    setStagedPages,
    handleFilesChange,
    promptState,
    pendingDraft,
    handleAcceptDraft,
    discardDraft,
    clearDraft,
    resetSettings,
  };
}
