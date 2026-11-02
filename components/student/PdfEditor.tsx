"use client";

/**
 * PdfEditor — redesigned student print page editor matching 1440 desktop specification.
 * Composes: StepperBar, StudentTopNav, FileHeader, EditToolbar, PageGrid, PageThumb, PreviewPanel, SelectedPageCard.
 */

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { ArrowLeft, X, Undo2 } from "lucide-react";
import { PDFDocument, degrees } from "pdf-lib";
import * as PDFJS from "pdfjs-dist";
import type { RenderTask } from "pdfjs-dist/types/src/display/api";

import StudentTopNav, { StudentNavTab } from "./edit/StudentTopNav";
import StepperBar, { WizardStepId } from "./edit/StepperBar";
import FileHeader from "./edit/FileHeader";
import EditToolbar from "./edit/EditToolbar";
import PageGrid from "./edit/PageGrid";
import PreviewPanel from "./edit/PreviewPanel";
import { processClientFile } from "@/lib/utils/clientFileProcessor";

// Static worker served from /public
PDFJS.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`;

// ─── Exported Types ──────────────────────────────────────────────────────────

export interface ManagedPdfFile {
  id: string;
  fileName: string;
  fileSize: number;
  totalOriginalPages: number;
  keptPageIndices: number[];
  rawBytes: Uint8Array;
  isNonPdfDoc?: boolean;
  fileType?: string;
}

export interface PageItem {
  id: string; // unique ID for key tracking: e.g. `${fileId}::${originalIndex}::${uniqueSalt}`
  fileId: string;
  originalIndex: number;
}

export interface PdfEditorProps {
  /** Propagates current staged files and ordered pages up to parent */
  onFilesChange?: (
    files: ManagedPdfFile[],
    orderedPages: { fileId: string; originalIndex: number }[]
  ) => void;
  /** Initial files from parent/draft if any */
  initialFiles?: ManagedPdfFile[];
  /** Initial ordered pages from parent/draft if any */
  initialPages?: { fileId: string; originalIndex: number }[];
  /** Navigation callback to proceed or go back */
  onNavigate?: (step: WizardStepId) => void;
  /** Active jobs count for badge */
  activeJobsCount?: number;
  /** Active tab change callback */
  onTabChange?: (tab: StudentNavTab) => void;
  /** Active tab */
  activeTab?: StudentNavTab;
  /** User details if provided */
  userName?: string | null;
  admissionNumber?: string | null;
}

interface HistorySnapshot {
  orderedPages: PageItem[];
  rotations: Record<string, number>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function renderPageToDataUrl(
  pdfDoc: PDFJS.PDFDocumentProxy,
  pageNumber: number, // 1-based
  scale = 0.35
): Promise<string> {
  const page = await pdfDoc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const ctx = canvas.getContext("2d")!;
  await page.render({ canvasContext: ctx, viewport }).promise;

  return canvas.toDataURL("image/jpeg", 0.85);
}

function buildInitialPages(
  files: ManagedPdfFile[],
  pages?: { fileId: string; originalIndex: number }[]
): PageItem[] {
  if (pages && pages.length > 0) {
    return pages.map((p, idx) => ({
      id: `${p.fileId}::${p.originalIndex}::${idx}`,
      fileId: p.fileId,
      originalIndex: p.originalIndex,
    }));
  }
  const result: PageItem[] = [];
  files.forEach((file) => {
    const indices =
      file.keptPageIndices && file.keptPageIndices.length > 0
        ? file.keptPageIndices
        : Array.from({ length: file.totalOriginalPages || 1 }, (_, i) => i);
    indices.forEach((origIdx, idx) => {
      result.push({
        id: `${file.id}::${origIdx}::${idx}`,
        fileId: file.id,
        originalIndex: origIdx,
      });
    });
  });
  return result;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PdfEditor({
  onFilesChange,
  initialFiles = [],
  initialPages = [],
  onNavigate,
  activeJobsCount = 0,
  onTabChange,
  activeTab = "new",
  userName,
  admissionNumber,
}: PdfEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Core Document & Arrangement State
  const [files, setFiles] = useState<ManagedPdfFile[]>(initialFiles);
  const [activeFileId, setActiveFileId] = useState<string>(
    initialFiles[0]?.id || ""
  );
  const [orderedPages, setOrderedPages] = useState<PageItem[]>(() =>
    buildInitialPages(initialFiles, initialPages)
  );
  const [rotations, setRotations] = useState<Record<string, number>>({});
  const [selectedPageId, setSelectedPageId] = useState<string | null>(() => {
    const initialItems = buildInitialPages(initialFiles, initialPages);
    return initialItems[0]?.id || null;
  });

  // Render & Cache State
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [zoom, setZoom] = useState<number>(1.0);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  // Responsive Bottom Sheet for preview on mobile/tablet (<1024px)
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);

  // Undo / Redo History
  const [undoStack, setUndoStack] = useState<HistorySnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<HistorySnapshot[]>([]);

  // Toast Notification
  const [toast, setToast] = useState<{ message: string; showUndo: boolean } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // PDF Document proxies cache
  const docProxiesRef = useRef<Record<string, PDFJS.PDFDocumentProxy>>({});
  const currentRenderTaskRef = useRef<RenderTask | null>(null);

  // Show Toast Helper
  const showToast = useCallback((message: string, showUndo = false) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, showUndo });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 4500);
  }, []);

  // Save current state into undo stack
  const pushToUndo = useCallback(
    (currentPages: PageItem[], currentRotations: Record<string, number>) => {
      setUndoStack((prev) => [
        ...prev.slice(-30),
        {
          orderedPages: [...currentPages],
          rotations: { ...currentRotations },
        },
      ]);
      setRedoStack([]);
    },
    []
  );

  // ── Sync initialFiles and initialPages from Props / Draft if uninitialized ──
  useEffect(() => {
    if (files.length === 0 && initialFiles.length > 0) {
      setFiles(initialFiles);
      setActiveFileId(initialFiles[0]?.id || "");
      const newPages = buildInitialPages(initialFiles, initialPages);
      setOrderedPages(newPages);
      setSelectedPageId(newPages[0]?.id || null);
    }
  }, [initialFiles, initialPages, files.length]);

  // ── Default Load: If no files exist, load Operating_Systems_Notes.pdf ──────
  useEffect(() => {
    if (files.length === 0 && initialFiles.length === 0) {
      setLoading(true);
      fetch("/Operating_Systems_Notes.pdf")
        .then((res) => {
          if (!res.ok) throw new Error("Sample file not found");
          return res.arrayBuffer();
        })
        .then(async (arrayBuffer) => {
          const uint8 = new Uint8Array(arrayBuffer);
          const pdfLibDoc = await PDFDocument.load(uint8, {
            ignoreEncryption: true,
          });
          const pageCount = pdfLibDoc.getPageCount();

          const fileId = "file_operating_systems_notes";
          const newFile: ManagedPdfFile = {
            id: fileId,
            fileName: "Operating_Systems_Notes.pdf",
            fileSize: 2.8 * 1024 * 1024,
            totalOriginalPages: pageCount,
            keptPageIndices: Array.from({ length: pageCount }, (_, i) => i),
            rawBytes: uint8,
            fileType: "application/pdf",
          };

          const newPageItems: PageItem[] = Array.from(
            { length: pageCount },
            (_, i) => ({
              id: `${fileId}::${i}::seed`,
              fileId: fileId,
              originalIndex: i,
            })
          );

          setFiles([newFile]);
          setActiveFileId(fileId);
          setOrderedPages(newPageItems);

          // By default in screenshot, Page 7 is selected (0-indexed 6)
          if (newPageItems.length >= 7) {
            setSelectedPageId(newPageItems[6].id);
          } else if (newPageItems.length > 0) {
            setSelectedPageId(newPageItems[0].id);
          }
        })
        .catch((err) => {
          console.warn("[PdfEditor] Default sample fetch error:", err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [files.length, initialFiles.length]);

  // ── Propagate changes up to parent ──────────────────────────────────────────
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const parentPages = orderedPages.map((p) => ({
      fileId: p.fileId,
      originalIndex: p.originalIndex,
    }));
    onFilesChange?.(files, parentPages);
  }, [files, orderedPages, onFilesChange]);

  // ── Cache PDF Proxies and initial thumbnails for files ──────────────────────
  useEffect(() => {
    files.forEach(async (f) => {
      if (f.rawBytes && f.rawBytes.length > 0 && !f.isNonPdfDoc) {
        if (!docProxiesRef.current[f.id]) {
          try {
            const raw =
              f.rawBytes instanceof Uint8Array
                ? f.rawBytes.slice()
                : new Uint8Array(f.rawBytes).slice();
            const loadingTask = PDFJS.getDocument({ data: raw });
            const doc = await loadingTask.promise;
            docProxiesRef.current[f.id] = doc;

            // Render first 12 thumbnails immediately for rapid display
            const initialCount = Math.min(f.totalOriginalPages, 12);
            for (let p = 1; p <= initialCount; p++) {
              const key = `${f.id}::${p - 1}`;
              setThumbs((prev) => {
                if (prev[key]) return prev;
                // Render asynchronously
                renderPageToDataUrl(doc, p, 0.3)
                  .then((dataUrl) => {
                    setThumbs((t) => ({ ...t, [key]: dataUrl }));
                  })
                  .catch(() => {});
                return prev;
              });
            }
          } catch (err) {
            console.error("[PdfEditor] Failed to create proxy for file:", f.id, err);
          }
        }
      }
    });
  }, [files]);

  // ── Lazy render request for a single page thumbnail ─────────────────────────
  const handleRenderPageRequest = useCallback(
    async (page: PageItem): Promise<string | undefined> => {
      const key = `${page.fileId}::${page.originalIndex}`;
      if (thumbs[key]) return thumbs[key];

      let doc = docProxiesRef.current[page.fileId];
      if (!doc) {
        const file = files.find((f) => f.id === page.fileId);
        if (!file?.rawBytes || file.isNonPdfDoc) return undefined;
        try {
          const raw =
            file.rawBytes instanceof Uint8Array
              ? file.rawBytes.slice()
              : new Uint8Array(file.rawBytes).slice();
          const loadingTask = PDFJS.getDocument({ data: raw });
          doc = await loadingTask.promise;
          docProxiesRef.current[page.fileId] = doc;
        } catch {
          return undefined;
        }
      }

      try {
        const url = await renderPageToDataUrl(doc, page.originalIndex + 1, 0.3);
        setThumbs((prev) => ({ ...prev, [key]: url }));
        return url;
      } catch (err) {
        console.warn("[PdfEditor] Lazy render error:", err);
        return undefined;
      }
    },
    [files, thumbs]
  );

  // ── Selected Page High-Res Preview Render ───────────────────────────────────
  const activeSelectedPage =
    orderedPages.find((p) => p.id === selectedPageId) || orderedPages[0];

  useEffect(() => {
    if (!activeSelectedPage) {
      setPreviewDataUrl(null);
      return;
    }

    const parentFile = files.find((f) => f.id === activeSelectedPage.fileId);
    if (!parentFile || parentFile.isNonPdfDoc) {
      setPreviewDataUrl(null);
      return;
    }

    let isMounted = true;
    setPreviewLoading(true);

    if (currentRenderTaskRef.current) {
      try {
        currentRenderTaskRef.current.cancel();
      } catch {
        // ignore cancellation error
      }
      currentRenderTaskRef.current = null;
    }

    (async () => {
      try {
        let doc = docProxiesRef.current[activeSelectedPage.fileId];
        if (!doc && parentFile.rawBytes) {
          const raw =
            parentFile.rawBytes instanceof Uint8Array
              ? parentFile.rawBytes.slice()
              : new Uint8Array(parentFile.rawBytes).slice();
          const loadingTask = PDFJS.getDocument({
            data: raw,
          });
          doc = await loadingTask.promise;
          docProxiesRef.current[activeSelectedPage.fileId] = doc;
        }
        if (!doc || !isMounted) return;

        const page = await doc.getPage(activeSelectedPage.originalIndex + 1);
        const viewport = page.getViewport({ scale: 1.2 });

        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;

        const task = page.render({ canvasContext: ctx, viewport });
        currentRenderTaskRef.current = task;
        await task.promise;

        if (isMounted) {
          setPreviewDataUrl(canvas.toDataURL("image/jpeg", 0.9));
        }
      } catch (err: unknown) {
        if ((err as { name?: string })?.name !== "RenderingCancelledException") {
          console.warn("[PdfEditor] Preview render error:", err);
        }
      } finally {
        if (isMounted) setPreviewLoading(false);
      }
    })();

    return () => {
      isMounted = false;
      if (currentRenderTaskRef.current) {
        try {
          currentRenderTaskRef.current.cancel();
        } catch {
          // ignore
        }
      }
    };
  }, [activeSelectedPage, files]);

  // ── Actions: Reorder, Rotate, Delete, Undo, Redo, Rotate All, Sort, Add Files ──

  const handleSelectPage = (id: string) => {
    setSelectedPageId(id);
    const selected = orderedPages.find((p) => p.id === id);
    if (selected && selected.fileId) {
      setActiveFileId(selected.fileId);
    }
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setMobilePreviewOpen(true);
    }
  };

  const handleReorderPages = (activeId: string, overId: string) => {
    pushToUndo(orderedPages, rotations);
    setOrderedPages((prev) => {
      const oldIndex = prev.findIndex((p) => p.id === activeId);
      const newIndex = prev.findIndex((p) => p.id === overId);
      if (oldIndex === -1 || newIndex === -1) return prev;
      const updated = [...prev];
      const [movedItem] = updated.splice(oldIndex, 1);
      updated.splice(newIndex, 0, movedItem);
      return updated;
    });
  };

  const handleRotatePage = (id: string) => {
    pushToUndo(orderedPages, rotations);
    setRotations((prev) => ({
      ...prev,
      [id]: ((prev[id] || 0) + 90) % 360,
    }));
  };

  const handleDeletePage = (id: string) => {
    pushToUndo(orderedPages, rotations);
    const nextPages = orderedPages.filter((p) => p.id !== id);
    setOrderedPages(nextPages);

    if (selectedPageId === id) {
      setSelectedPageId(nextPages[0]?.id || null);
    }

    // Filter files list to exclude files that have no pages left
    setFiles((prevFiles) => {
      const updated = prevFiles
        .map((f) => {
          const kept = nextPages
            .filter((p) => p.fileId === f.id)
            .map((p) => p.originalIndex);
          return {
            ...f,
            keptPageIndices: kept,
          };
        })
        .filter((f) => f.keptPageIndices.length > 0);
      if (updated.length > 0 && !updated.some((f) => f.id === activeFileId)) {
        setActiveFileId(updated[0].id);
      }
      return updated;
    });

    showToast("Page deleted.", true);
  };

  const handleRotateAll = () => {
    pushToUndo(orderedPages, rotations);
    setRotations((prev) => {
      const updated: Record<string, number> = {};
      orderedPages.forEach((p) => {
        updated[p.id] = ((prev[p.id] || 0) + 90) % 360;
      });
      return updated;
    });
    showToast("All pages rotated 90° clockwise.");
  };

  const handleSort = (order: "original" | "reverse") => {
    pushToUndo(orderedPages, rotations);
    setOrderedPages((prev) => {
      if (order === "reverse") {
        return [...prev].reverse();
      }
      // Original: sorted by file order, then originalIndex
      const fileIndexMap = new Map(files.map((f, i) => [f.id, i]));
      return [...prev].sort((a, b) => {
        const fA = fileIndexMap.get(a.fileId) ?? 0;
        const fB = fileIndexMap.get(b.fileId) ?? 0;
        if (fA !== fB) return fA - fB;
        return a.originalIndex - b.originalIndex;
      });
    });
    showToast(`Sorted by ${order} order.`);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const lastSnapshot = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [
      ...prev,
      {
        orderedPages: [...orderedPages],
        rotations: { ...rotations },
      },
    ]);
    setOrderedPages(lastSnapshot.orderedPages);
    setRotations(lastSnapshot.rotations);
    if (!lastSnapshot.orderedPages.some((p) => p.id === selectedPageId)) {
      setSelectedPageId(lastSnapshot.orderedPages[0]?.id || null);
    }
    setToast(null);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const nextSnapshot = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [
      ...prev,
      {
        orderedPages: [...orderedPages],
        rotations: { ...rotations },
      },
    ]);
    setOrderedPages(nextSnapshot.orderedPages);
    setRotations(nextSnapshot.rotations);
    if (!nextSnapshot.orderedPages.some((p) => p.id === selectedPageId)) {
      setSelectedPageId(nextSnapshot.orderedPages[0]?.id || null);
    }
  };

  // Add Files Trigger & Handler
  const handleAddFilesClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setLoading(true);
    setError("");

    try {
      let currentFiles = [...files];
      let currentPages = [...orderedPages];

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const res = await processClientFile(file, currentFiles);
        currentFiles = [...currentFiles, res.file];

        const newItems: PageItem[] = res.pages.map((p, idx) => ({
          id: `${p.fileId}::${p.originalIndex}::${Date.now()}_${idx}`,
          fileId: p.fileId,
          originalIndex: p.originalIndex,
        }));
        currentPages = [...currentPages, ...newItems];
      }

      pushToUndo(orderedPages, rotations);
      setFiles(currentFiles);
      setOrderedPages(currentPages);
      if (!selectedPageId && currentPages.length > 0) {
        setSelectedPageId(currentPages[0].id);
      }
      showToast(`${fileList.length} file(s) added.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load files";
      setError(msg);
      showToast(msg);
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Zoom controls for Preview
  const handleZoomIn = () => {
    setZoom((z) => Math.min(2.0, +(z + 0.25).toFixed(2)));
  };

  const handleZoomOut = () => {
    setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)));
  };

  const handleToggleFitZoom = () => {
    setZoom((z) => (z >= 1.4 ? 1.0 : 1.5));
  };

  // Prev / Next Page in Preview
  const currentSelectedIdx = activeSelectedPage
    ? orderedPages.indexOf(activeSelectedPage)
    : 0;

  const handlePrevPage = () => {
    if (currentSelectedIdx > 0) {
      setSelectedPageId(orderedPages[currentSelectedIdx - 1].id);
    }
  };

  const handleNextPage = () => {
    if (currentSelectedIdx < orderedPages.length - 1) {
      setSelectedPageId(orderedPages[currentSelectedIdx + 1].id);
    }
  };

  // ── Save arrangement & continue ─────────────────────────────────────────────
  const handleSaveAndContinue = async () => {
    if (orderedPages.length === 0) return;
    setIsSaving(true);

    try {
      // Build output order and update file bytes with rotations if needed
      const parentPages = orderedPages.map((p) => ({
        fileId: p.fileId,
        originalIndex: p.originalIndex,
      }));

      // If rotations exist and files are PDFs, apply rotation to rawBytes
      const updatedFiles = await Promise.all(
        files.map(async (file) => {
          if (!file.rawBytes || file.rawBytes.length === 0 || file.isNonPdfDoc) {
            return file;
          }

          // Check if any pages of this file are rotated
          const filePages = orderedPages.filter((p) => p.fileId === file.id);
          const hasRotations = filePages.some((p) => (rotations[p.id] || 0) !== 0);

          if (!hasRotations) return file;

          try {
            const pdfDoc = await PDFDocument.load(file.rawBytes, {
              ignoreEncryption: true,
            });
            const pdfLibPages = pdfDoc.getPages();

            filePages.forEach((p) => {
              const rot = rotations[p.id] || 0;
              if (rot !== 0 && pdfLibPages[p.originalIndex]) {
                const currentPage = pdfLibPages[p.originalIndex];
                const existingRot = currentPage.getRotation().angle;
                currentPage.setRotation(degrees((existingRot + rot) % 360));
              }
            });

            const newBytes = await pdfDoc.save();
            return {
              ...file,
              rawBytes: new Uint8Array(newBytes),
            };
          } catch (err) {
            console.warn("[PdfEditor] Rotation save warning:", err);
            return file;
          }
        })
      );

      setFiles(updatedFiles);
      onFilesChange?.(updatedFiles, parentPages);
      onNavigate?.("SETTINGS");
    } catch (err) {
      console.error("[PdfEditor] Save arrangement error:", err);
      showToast("Error saving arrangement. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const selectedFile =
    files.find((f) => f.id === activeSelectedPage?.fileId) || files[0];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 antialiased flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* ── 1. TOP NAV (Reusable StudentTopNav) ── */}
      <StudentTopNav
        activeTab={activeTab}
        onTabChange={onTabChange}
        activeJobsCount={activeJobsCount}
        userName={userName}
        admissionNumber={admissionNumber}
      />

      {/* ── Main Viewport Container (Max 1440px Desktop Layout) ── */}
      <main className="max-w-[1440px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex-1 flex flex-col gap-6">
        {/* ── 2. "Back to home" pill under nav matching screenshot ── */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-xs sm:text-sm font-medium transition-colors w-fit focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label="Back to home page"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to home</span>
          </Link>
        </div>

        {/* ── 3. STEPPER BAR (Full width, 5 steps joined by thin lines) ── */}
        <div className="w-full">
          <StepperBar
            currentStep="EDIT"
            onStepClick={(step) => onNavigate?.(step)}
          />
        </div>

        {/* ── 4. MAIN GRID: Left card ~68%, Right card ~32%, gap 24 ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1">
          {/* ── LEFT CARD (EDITOR): ~68% width ── */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col">
            {/* File Header matching screenshot */}
            <FileHeader
              files={files}
              activeFileId={activeFileId}
              onSelectFile={setActiveFileId}
              totalPageCount={orderedPages.length}
            />

            {/* Edit Toolbar matching screenshot */}
            <EditToolbar
              onAddFiles={handleAddFilesClick}
              onRotateAll={handleRotateAll}
              onSort={handleSort}
              onUndo={handleUndo}
              onRedo={handleRedo}
              canUndo={undoStack.length > 0}
              canRedo={redoStack.length > 0}
              loading={loading}
            />

            {/* Error Banner if any */}
            {error && (
              <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl flex items-center justify-between">
                <span>{error}</span>
                <button
                  type="button"
                  onClick={() => setError("")}
                  className="text-red-400 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Page Grid (6 columns desktop, 4 at ≥768, 3 at ≥640, 2 below, gap 16) */}
            <div className="mt-2 min-h-[300px]">
              <PageGrid
                pages={orderedPages}
                rotations={rotations}
                thumbs={thumbs}
                selectedPageId={selectedPageId}
                files={files}
                onSelectPage={handleSelectPage}
                onRotatePage={handleRotatePage}
                onDeletePage={handleDeletePage}
                onReorderPages={handleReorderPages}
                onDoubleClickPage={() => {
                  if (typeof window !== "undefined" && window.innerWidth < 1024) {
                    setMobilePreviewOpen(true);
                  } else {
                    handleToggleFitZoom();
                  }
                }}
                onRenderPageRequest={handleRenderPageRequest}
              />
            </div>
          </div>

          {/* ── RIGHT CARD (PREVIEW): ~32% width (Desktop ≥1024px) ── */}
          <div className="hidden lg:block lg:col-span-4 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sticky top-24">
            <PreviewPanel
              selectedPageNumber={currentSelectedIdx + 1}
              totalPages={orderedPages.length}
              zoom={zoom}
              rotation={rotations[activeSelectedPage?.id || ""] || 0}
              previewDataUrl={previewDataUrl}
              loadingPreview={previewLoading}
              isSaving={isSaving}
              disabled={orderedPages.length === 0}
              isNonPdf={selectedFile?.isNonPdfDoc}
              fileName={selectedFile?.fileName}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onPrevPage={handlePrevPage}
              onNextPage={handleNextPage}
              onToggleFitZoom={handleToggleFitZoom}
              onSaveAndContinue={handleSaveAndContinue}
              onDeleteSelectedPage={() => {
                if (activeSelectedPage) {
                  handleDeletePage(activeSelectedPage.id);
                }
              }}
            />
          </div>
        </div>
      </main>

      {/* ── Mobile / Tablet Bottom Bar (<1024px) ── */}
      <div className="lg:hidden sticky bottom-0 z-30 bg-white border-t border-slate-200 p-4 shadow-lg flex items-center gap-3">
        <button
          type="button"
          onClick={() => setMobilePreviewOpen(true)}
          className="h-12 px-4 rounded-[10px] border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors flex-shrink-0"
        >
          Preview Page {currentSelectedIdx + 1}
        </button>

        <button
          type="button"
          onClick={handleSaveAndContinue}
          disabled={orderedPages.length === 0 || isSaving}
          className="flex-1 h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm rounded-[10px] flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-600/20 disabled:bg-slate-200 disabled:text-slate-400"
        >
          <span>Save arrangement &amp; continue &rarr;</span>
        </button>
      </div>

      {/* ── Mobile / Tablet Preview Bottom Sheet (<1024px) ── */}
      {mobilePreviewOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex flex-col justify-end">
          <div className="bg-white rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-[#0F172A]">Page Preview</h3>
              <button
                type="button"
                onClick={() => setMobilePreviewOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                aria-label="Close preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 flex-1">
              <PreviewPanel
                selectedPageNumber={currentSelectedIdx + 1}
                totalPages={orderedPages.length}
                zoom={zoom}
                rotation={rotations[activeSelectedPage?.id || ""] || 0}
                previewDataUrl={previewDataUrl}
                loadingPreview={previewLoading}
                isSaving={isSaving}
                disabled={orderedPages.length === 0}
                isNonPdf={selectedFile?.isNonPdfDoc}
                fileName={selectedFile?.fileName}
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onPrevPage={handlePrevPage}
                onNextPage={handleNextPage}
                onToggleFitZoom={handleToggleFitZoom}
                onSaveAndContinue={() => {
                  setMobilePreviewOpen(false);
                  handleSaveAndContinue();
                }}
                onDeleteSelectedPage={() => {
                  if (activeSelectedPage) {
                    handleDeletePage(activeSelectedPage.id);
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Floating Toast: "Page deleted. Undo" ── */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-3 text-xs font-medium animate-in fade-in slide-in-from-bottom-2 duration-150"
        >
          <span>{toast.message}</span>
          {toast.showUndo && (
            <button
              type="button"
              onClick={handleUndo}
              className="text-indigo-300 hover:text-white font-bold flex items-center gap-1 transition-colors underline underline-offset-2"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Undo</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-slate-200 ml-1"
            aria-label="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Hidden File Input for "+ Add files" */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,image/png,image/jpeg,.png,.jpg,.jpeg,.doc,.docx,.pptx"
        className="hidden"
        onChange={handleFileInputChange}
      />
    </div>
  );
}