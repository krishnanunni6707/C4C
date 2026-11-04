"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  FileText,
  Minus,
  Plus,
  ChevronLeft,
  ChevronRight,
  Download,
  Maximize2,
  Minimize2,
  RefreshCw,
  AlertCircle,
  FileSpreadsheet,
  Presentation,
  File,
  X,
  Trash2,
} from "lucide-react";

interface PdfPreviewCardProps {
  jobId: string;
  fileName: string;
  totalPages?: number;
  className?: string;
  isSuperAdmin?: boolean;
  isFileDeleted?: boolean;
  onBase64Loaded?: (base64: string) => void;
  onFileDeleted?: () => void;
}

export default function PdfPreviewCard({
  jobId,
  fileName,
  totalPages = 1,
  className = "",
  isSuperAdmin = false,
  isFileDeleted = false,
  onBase64Loaded,
  onFileDeleted,
}: PdfPreviewCardProps) {
  const [loading, setLoading] = useState(!isFileDeleted);
  const [error, setError] = useState<string | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(totalPages || 1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageInput, setPageInput] = useState<string>("1");
  const [zoom, setZoom] = useState<number>(100); // 50% to 200%
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isNonPdfDoc, setIsNonPdfDoc] = useState(false);
  const [fileBlob, setFileBlob] = useState<Blob | null>(null);
  const [fileDeletedState, setFileDeletedState] = useState(isFileDeleted);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingFile, setDeletingFile] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    setFileDeletedState(isFileDeleted);
  }, [isFileDeleted]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fullscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<any>(null);
  const fullscreenRenderTaskRef = useRef<any>(null);

  const fileExt = fileName?.split(".").pop()?.toLowerCase() || "";
  const isImage = ["png", "jpg", "jpeg", "webp", "gif"].includes(fileExt);
  const isDocOrPpt = ["doc", "docx", "ppt", "pptx", "xls", "xlsx"].includes(fileExt);

  // Helper to draw realistic sample document cover page matching the screenshot
  const drawMockCoverPage = useCallback((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 460;
    canvas.height = 650;

    // White page background with subtle border
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 1. QDoc Seal & Brand Header
    ctx.save();
    ctx.fillStyle = "#1E293B";
    // Circular seal
    ctx.beginPath();
    ctx.arc(60, 52, 18, 0, Math.PI * 2);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#1E293B";
    ctx.stroke();
    // Inner emblem details
    ctx.beginPath();
    ctx.arc(60, 52, 14, 0, Math.PI * 2);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.font = "bold 9px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Q", 60, 55);

    // Brand text
    ctx.textAlign = "left";
    ctx.font = "bold 15px sans-serif";
    ctx.fillStyle = "#0F172A";
    ctx.fillText("QDoc University", 88, 48);
    ctx.font = "400 9px sans-serif";
    ctx.fillStyle = "#64748B";
    ctx.fillText("Knowledge for a Better Tomorrow", 88, 60);

    // Thin separator line
    ctx.beginPath();
    ctx.moveTo(40, 78);
    ctx.lineTo(260, 78);
    ctx.strokeStyle = "#CBD5E1";
    ctx.lineWidth = 1;
    ctx.stroke();

    // 2. Title & Subtitle
    ctx.fillStyle = "#0F172A";
    ctx.font = "800 22px sans-serif";
    ctx.fillText("Operating Systems", 40, 122);
    ctx.fillStyle = "#334155";
    ctx.font = "600 13px sans-serif";
    ctx.fillText("Notes and Concepts", 40, 144);

    // 3. Architectural Building Sketch / Photo Block
    ctx.fillStyle = "#E2E8F0";
    ctx.fillRect(40, 170, 380, 240);
    // Draw building pillars and windows in grayscale
    ctx.fillStyle = "#CBD5E1";
    for (let i = 0; i < 9; i++) {
      ctx.fillRect(60 + i * 40, 200, 24, 200);
    }
    ctx.fillStyle = "#94A3B8";
    ctx.fillRect(40, 170, 380, 30);
    // Windows pattern
    ctx.fillStyle = "#64748B";
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 8; c++) {
        ctx.fillRect(65 + c * 42, 220 + r * 34, 14, 18);
      }
    }
    // Vignette overlay
    const grad = ctx.createLinearGradient(40, 170, 40, 410);
    grad.addColorStop(0, "rgba(255,255,255,0.1)");
    grad.addColorStop(1, "rgba(30,41,59,0.35)");
    ctx.fillStyle = grad;
    ctx.fillRect(40, 170, 380, 240);

    // 4. Department & Year text
    ctx.fillStyle = "#1E293B";
    ctx.font = "700 10.5px sans-serif";
    ctx.fillText("Department of Computer Science", 40, 470);
    ctx.fillStyle = "#64748B";
    ctx.font = "500 10px sans-serif";
    ctx.fillText("2025", 40, 488);

    // 5. Decorative soft indigo wave at bottom
    ctx.fillStyle = "#C7D2FE";
    ctx.beginPath();
    ctx.moveTo(0, 650);
    ctx.lineTo(0, 590);
    ctx.bezierCurveTo(90, 560, 180, 640, 300, 600);
    ctx.bezierCurveTo(360, 575, 420, 620, 460, 650);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }, []);

  // 1. Fetch file from /api/admin/jobs/[id]/file
  const loadFile = useCallback(async () => {
    if (fileDeletedState) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Handle mock preview mode directly for visual fidelity
    if (jobId.startsWith("job-mock-")) {
      setTimeout(() => {
        setLoading(false);
        setNumPages(totalPages || 24);
        setCurrentPage(1);
        setPageInput("1");
        if (canvasRef.current) {
          drawMockCoverPage(canvasRef.current);
        }
      }, 100);
      return;
    }

    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/file`);
      if (res.status === 410) {
        setFileDeletedState(true);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to load file (HTTP ${res.status})`);
      }

      const contentType = res.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        const data = await res.json();
        if (!data.base64Data) {
          throw new Error("No file content returned from server");
        }
        if (onBase64Loaded) onBase64Loaded(data.base64Data);

        // Convert base64 to binary
        const binaryStr = atob(data.base64Data);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: "application/pdf" });
        setFileBlob(blob);
        await initPdf(bytes);
      } else {
        const arrayBuf = await res.arrayBuffer();
        const blob = new Blob([arrayBuf], { type: contentType || "application/octet-stream" });
        setFileBlob(blob);

        // Convert to base64 for print daemon callback if needed
        if (onBase64Loaded) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            const b64 = result.includes(",") ? result.split(",")[1] : result;
            onBase64Loaded(b64);
          };
          reader.readAsDataURL(blob);
        }

        if (isImage) {
          const url = URL.createObjectURL(blob);
          setImageUrl(url);
          setLoading(false);
        } else if (isDocOrPpt) {
          setIsNonPdfDoc(true);
          setLoading(false);
        } else {
          // Attempt PDF rendering
          const bytes = new Uint8Array(arrayBuf);
          await initPdf(bytes);
        }
      }
    } catch (err: unknown) {
      console.error("[PdfPreviewCard] Load error:", err);
      setError(err instanceof Error ? err.message : "Could not load file. Retry");
      setLoading(false);
    }
  }, [jobId, isImage, isDocOrPpt, onBase64Loaded, totalPages, drawMockCoverPage]);

  // 2. Initialize PDF.js
  const initPdf = async (data: Uint8Array) => {
    try {
      const PDFJS = await import("pdfjs-dist");
      PDFJS.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

      const loadingTask = PDFJS.getDocument({ data });
      const doc = await loadingTask.promise;
      setPdfDoc(doc);
      setNumPages(doc.numPages);
      setCurrentPage(1);
      setPageInput("1");
      setLoading(false);
    } catch (pdfErr) {
      console.error("[PdfPreviewCard] PDF init error:", pdfErr);
      setError("Could not parse PDF file document.");
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFile();

    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [loadFile]);

  // 3. Render page to canvas
  const renderCurrentPage = useCallback(
    async (targetCanvas: HTMLCanvasElement | null, isFs = false) => {
      if (!targetCanvas || !pdfDoc) return;

      try {
        if (isFs) {
          fullscreenRenderTaskRef.current?.cancel();
        } else {
          renderTaskRef.current?.cancel();
        }

        const page = await pdfDoc.getPage(currentPage);
        const scale = (zoom / 100) * (isFs ? 1.6 : 1.25);
        const viewport = page.getViewport({ scale });

        targetCanvas.width = viewport.width;
        targetCanvas.height = viewport.height;

        const ctx = targetCanvas.getContext("2d");
        if (!ctx) return;

        const renderTask = page.render({
          canvasContext: ctx,
          viewport,
        });

        if (isFs) {
          fullscreenRenderTaskRef.current = renderTask;
        } else {
          renderTaskRef.current = renderTask;
        }

        await renderTask.promise;
      } catch (err: any) {
        if (err?.name !== "RenderingCancelledException") {
          console.warn("[PdfPreviewCard] Render error:", err);
        }
      }
    },
    [pdfDoc, currentPage, zoom]
  );

  useEffect(() => {
    if (pdfDoc && !loading && !error && canvasRef.current) {
      renderCurrentPage(canvasRef.current, false);
    }
  }, [pdfDoc, currentPage, zoom, loading, error, renderCurrentPage]);

  useEffect(() => {
    if (isFullscreen && pdfDoc && fullscreenCanvasRef.current) {
      renderCurrentPage(fullscreenCanvasRef.current, true);
    }
  }, [isFullscreen, pdfDoc, currentPage, zoom, renderCurrentPage]);

  // 4. Page navigation & Zoom handlers
  const handlePrevPage = () => {
    if (currentPage > 1) {
      const next = currentPage - 1;
      setCurrentPage(next);
      setPageInput(String(next));
    }
  };

  const handleNextPage = () => {
    if (currentPage < numPages) {
      const next = currentPage + 1;
      setCurrentPage(next);
      setPageInput(String(next));
    }
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(pageInput, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= numPages) {
      setCurrentPage(pageNum);
    } else {
      setPageInput(String(currentPage));
    }
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(200, prev + 25));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(50, prev - 25));
  };

  const handleDownload = () => {
    if (!fileBlob) return;
    const url = URL.createObjectURL(fileBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName || "document.pdf";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDeleteFile = async () => {
    setDeletingFile(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/file`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete file from storage.");
      }
      setFileDeletedState(true);
      setShowDeleteModal(false);
      if (onFileDeleted) onFileDeleted();
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete file");
    } finally {
      setDeletingFile(false);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        handlePrevPage();
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        handleNextPage();
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === "-") {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentPage, numPages, isFullscreen]);

  return (
    <>
      <div
        className={`bg-white rounded-[16px] border border-slate-200/80 p-5 shadow-sm flex flex-col justify-between ${className}`}
      >
        {/* ── Header ────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 mb-4">
          {/* Left: Icon + Title */}
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Print Preview
            </h2>
          </div>

          {/* Right: Controls Toolbar */}
          <div className="flex items-center gap-2 sm:gap-3 text-xs text-slate-600">
            {/* Zoom Controls "− 100% +" */}
            <div className="flex items-center bg-slate-50 border border-slate-200/80 rounded-lg px-2 py-1">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoom <= 50 || loading || !!error}
                aria-label="Zoom out"
                className="p-0.5 hover:text-slate-900 disabled:opacity-40 transition-colors"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-10 text-center font-semibold text-slate-700 tabular-nums select-none">
                {zoom}%
              </span>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoom >= 200 || loading || !!error}
                aria-label="Zoom in"
                className="p-0.5 hover:text-slate-900 disabled:opacity-40 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <span className="text-slate-300">|</span>

            {/* Page Navigation "‹ 1 / 24 ›" */}
            <div className="flex items-center bg-slate-50 border border-slate-200/80 rounded-lg px-1.5 py-1">
              <button
                type="button"
                onClick={handlePrevPage}
                disabled={currentPage <= 1 || loading || !!error}
                aria-label="Previous page"
                className="p-0.5 hover:text-slate-900 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <form onSubmit={handlePageInputSubmit} className="flex items-center">
                <input
                  type="text"
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value)}
                  onBlur={() => setPageInput(String(currentPage))}
                  disabled={loading || !!error || numPages <= 1}
                  aria-label="Current page number"
                  className="w-7 text-center font-bold text-slate-900 bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded text-xs tabular-nums"
                />
              </form>

              <span className="text-slate-400 font-medium select-none pr-1">
                / {numPages}
              </span>

              <button
                type="button"
                onClick={handleNextPage}
                disabled={currentPage >= numPages || loading || !!error}
                aria-label="Next page"
                className="p-0.5 hover:text-slate-900 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Download Icon */}
            <button
              type="button"
              onClick={handleDownload}
              disabled={loading || !fileBlob || fileDeletedState}
              title={fileDeletedState ? "File deleted" : "Download original file"}
              aria-label="Download original file"
              className="p-1.5 rounded-lg border border-slate-200/80 bg-slate-50 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 transition-colors text-slate-600"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Fullscreen Icon */}
            <button
              type="button"
              onClick={() => setIsFullscreen(true)}
              disabled={loading || !!error || fileDeletedState}
              title={fileDeletedState ? "File deleted" : "Fullscreen viewer"}
              aria-label="Fullscreen viewer"
              className="p-1.5 rounded-lg border border-slate-200/80 bg-slate-50 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 transition-colors text-slate-600"
            >
              <Maximize2 className="w-4 h-4" />
            </button>

            {/* Super Admin Delete File Button */}
            {isSuperAdmin && !fileDeletedState && (
              <button
                type="button"
                onClick={() => {
                  setDeleteError(null);
                  setShowDeleteModal(true);
                }}
                title="Delete file permanently (Super Admin only)"
                aria-label="Delete uploaded file"
                className="p-1.5 rounded-lg border border-rose-200/80 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 text-rose-600 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* ── Preview Stage ────────────────────────────────────────── */}
        <div className="relative w-full h-[590px] bg-[#2B2F36] rounded-xl overflow-auto p-4 sm:p-6 flex items-center justify-center shadow-inner">
          {fileDeletedState ? (
            /* File Deleted State */
            <div className="text-center p-8 bg-slate-900/90 border border-slate-700 rounded-2xl max-w-sm space-y-3 shadow-xl">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/15 ring-1 ring-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
                <Trash2 className="w-7 h-7" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">File Deleted from Storage</p>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  The uploaded file was permanently deleted by a Super Admin. Job parameters and audit records remain saved.
                </p>
              </div>
            </div>
          ) : loading ? (
            /* Skeleton Loading State */
            <div className="w-[320px] h-[440px] bg-slate-700/60 rounded-lg animate-pulse flex flex-col items-center justify-center gap-3 shadow-lg">
              <div className="w-10 h-10 rounded-xl bg-slate-600/70 flex items-center justify-center text-slate-400">
                <FileText className="w-5 h-5 animate-bounce" />
              </div>
              <p className="text-xs text-slate-300 font-medium">Loading document preview…</p>
            </div>
          ) : error ? (
            /* Error State with Retry Button */
            <div className="text-center p-6 bg-slate-900/80 border border-slate-700 rounded-2xl max-w-sm space-y-3 shadow-xl">
              <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
              <div>
                <p className="text-sm font-semibold text-white">Could not load file</p>
                <p className="text-xs text-slate-400 mt-1">{error}</p>
              </div>
              <button
                type="button"
                onClick={loadFile}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            </div>
          ) : isImage && imageUrl ? (
            /* Inline Image View */
            <div className="max-w-full max-h-full flex items-center justify-center">
              <img
                src={imageUrl}
                alt={fileName}
                className="max-h-[460px] max-w-full object-contain rounded shadow-2xl transition-transform"
                style={{ transform: `scale(${zoom / 100})` }}
              />
            </div>
          ) : isNonPdfDoc ? (
            /* DOC / PPT File Fallback Card */
            <div className="bg-slate-900/90 border border-slate-700 rounded-2xl p-6 text-center max-w-sm shadow-xl space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/15 ring-1 ring-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400">
                {fileExt.startsWith("ppt") ? (
                  <Presentation className="w-8 h-8" />
                ) : fileExt.startsWith("xls") ? (
                  <FileSpreadsheet className="w-8 h-8" />
                ) : (
                  <File className="w-8 h-8" />
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-white truncate" title={fileName}>
                  {fileName}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Preview not available for this format. Download to view.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownload}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>Download File</span>
              </button>
            </div>
          ) : (
            /* Canvas PDF Page */
            <div
              className="bg-white shadow-2xl rounded-sm transition-transform duration-150 ease-out origin-center my-auto"
              style={{
                maxWidth: "100%",
              }}
            >
              <canvas
                ref={canvasRef}
                className="block max-w-full h-auto"
                style={{
                  boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.4)",
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Fullscreen Dialog ──────────────────────────────────────── */}
      {isFullscreen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Fullscreen Document Viewer"
          className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col animate-in fade-in duration-200"
        >
          {/* Top Bar inside Fullscreen */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-indigo-400" />
              <span className="text-sm font-bold text-white truncate max-w-md">
                {fileName}
              </span>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4 text-xs">
              {/* Zoom */}
              <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-slate-300">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  disabled={zoom <= 50}
                  className="p-1 hover:text-white"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-12 text-center font-bold tabular-nums">
                  {zoom}%
                </span>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  disabled={zoom >= 200}
                  className="p-1 hover:text-white"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Page Nav */}
              <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-slate-300">
                <button
                  type="button"
                  onClick={handlePrevPage}
                  disabled={currentPage <= 1}
                  className="p-1 hover:text-white disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 font-bold tabular-nums">
                  {currentPage} / {numPages}
                </span>
                <button
                  type="button"
                  onClick={handleNextPage}
                  disabled={currentPage >= numPages}
                  className="p-1 hover:text-white disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Download */}
              <button
                type="button"
                onClick={handleDownload}
                className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-colors"
                title="Download"
              >
                <Download className="w-4 h-4" />
              </button>

              {/* Close */}
              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-colors"
                title="Close fullscreen (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Fullscreen Canvas Stage */}
          <div className="flex-1 overflow-auto p-8 flex items-center justify-center">
            {isImage && imageUrl ? (
              <img
                src={imageUrl}
                alt={fileName}
                className="max-h-[85vh] object-contain rounded shadow-2xl"
              />
            ) : (
              <div className="bg-white shadow-2xl rounded-sm my-auto">
                <canvas ref={fullscreenCanvasRef} className="block max-w-full h-auto" />
              </div>
            )}
          </div>
        </div>
      )}
      {/* ── Delete Confirmation Modal ─────────────────────────── */}
      {showDeleteModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirm Delete File"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in"
        >
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Delete Uploaded File?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Are you sure you want to permanently delete <strong className="text-slate-800">{fileName}</strong> from Cloudinary storage?
                This action is irreversible. The print job details and financial records will be preserved.
              </p>
            </div>

            {deleteError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-600">
                {deleteError}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={deletingFile}
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteError(null);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingFile}
                onClick={handleDeleteFile}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {deletingFile ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>{deletingFile ? "Deleting…" : "Delete Permanently"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
