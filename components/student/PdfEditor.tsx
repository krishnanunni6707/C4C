"use client";

/**
 * PdfEditor — real PDF preview + page trim + page drag-to-reorder + multi-file merge
 * Clean Light Mode Styling.
 */

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { PDFDocument } from "pdf-lib";
import * as PDFJS from "pdfjs-dist";

// Served from /public — static file
PDFJS.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ManagedPdfFile {
  id: string;
  fileName: string;
  fileSize: number;
  totalOriginalPages: number;
  keptPageIndices: number[];
  rawBytes: Uint8Array;
}

export interface PageItem {
  id: string; // unique ID for key tracking: e.g. `${fileId}::${originalIndex}::${uniqueSalt}`
  fileId: string;
  originalIndex: number;
}

interface PageThumb {
  fileId: string;
  originalIndex: number; // 0-based page index in the source PDF
  dataUrl: string;       // rendered canvas snapshot
}

interface PdfEditorProps {
  /** Propagates current staged files and ordered pages up to parent */
  onFilesChange: (
    files: ManagedPdfFile[],
    orderedPages: { fileId: string; originalIndex: number }[]
  ) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function renderPageToDataUrl(
  pdfDoc: PDFJS.PDFDocumentProxy,
  pageNumber: number, // 1-based
  scale = 0.4
): Promise<string> {
  const page = await pdfDoc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const ctx = canvas.getContext("2d")!;
  await page.render({ canvasContext: ctx, viewport }).promise;

  return canvas.toDataURL("image/jpeg", 0.75);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PdfEditor({ onFilesChange }: PdfEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const secondFileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<ManagedPdfFile[]>([]);
  const [orderedPages, setOrderedPages] = useState<PageItem[]>([]);
  const [thumbs, setThumbs] = useState<PageThumb[]>([]);
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set()); // holds pageItem.id
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(false);
  const [renderProgress, setRenderProgress] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");

  // Drag states
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // Propagate changes up to parent
  useEffect(() => {
    // Map internal PageItem to the representation the parent expects
    const parentPages = orderedPages.map((p) => ({
      fileId: p.fileId,
      originalIndex: p.originalIndex,
    }));
    onFilesChange(files, parentPages);
  }, [files, orderedPages, onFilesChange]);

  // ── Load & render a PDF ────────────────────────────────────────────────────

  const loadPdf = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are supported in the editor.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);

      // Validate with pdf-lib
      const pdfLibDoc = await PDFDocument.load(uint8, { ignoreEncryption: true });
      const pageCount = pdfLibDoc.getPageCount();
      if (pageCount === 0) throw new Error("PDF has no pages.");

      const id = `pdf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const newFile: ManagedPdfFile = {
        id,
        fileName: file.name,
        fileSize: file.size,
        totalOriginalPages: pageCount,
        keptPageIndices: Array.from({ length: pageCount }, (_, i) => i),
        rawBytes: uint8,
      };

      // Render thumbnails with pdfjs
      const loadingTask = PDFJS.getDocument({ data: uint8.slice() });
      const pdfjsDoc = await loadingTask.promise;

      const newThumbs: PageThumb[] = [];
      setRenderProgress(0);
      for (let p = 1; p <= pageCount; p++) {
        const dataUrl = await renderPageToDataUrl(pdfjsDoc, p, 0.35);
        newThumbs.push({ fileId: id, originalIndex: p - 1, dataUrl });
        setRenderProgress(Math.round((p / pageCount) * 100));
      }
      setRenderProgress(null);

      // Add pages to flat list
      const newPageItems: PageItem[] = Array.from({ length: pageCount }, (_, i) => ({
        id: `${id}::${i}::${Math.random().toString(36).slice(2, 5)}`,
        fileId: id,
        originalIndex: i,
      }));

      setFiles((prev) => [...prev, newFile]);
      setThumbs((prev) => [...prev, ...newThumbs]);
      setOrderedPages((prev) => [...prev, ...newPageItems]);
    } catch (err) {
      console.error("[PdfEditor] load error", err);
      setError(err instanceof Error ? err.message : "Failed to load PDF.");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (secondFileInputRef.current) secondFileInputRef.current.value = "";
    }
  }, []);

  // ── File input / drop handlers ─────────────────────────────────────────────

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) loadPdf(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) loadPdf(f);
  };

  // ── Page selection & trim ──────────────────────────────────────────────────

  const togglePage = (pageId: string) => {
    setSelectedPages((prev) => {
      const next = new Set(prev);
      if (next.has(pageId)) next.delete(pageId);
      else next.add(pageId);
      return next;
    });
  };

  const trimSelected = () => {
    if (selectedPages.size === 0) return;

    // Filter orderedPages
    const nextPages = orderedPages.filter((p) => !selectedPages.has(p.id));
    setOrderedPages(nextPages);

    // Filter files list to exclude files that have no pages left
    setFiles((prevFiles) =>
      prevFiles
        .map((f) => {
          const kept = nextPages
            .filter((p) => p.fileId === f.id)
            .map((p) => p.originalIndex);
          return {
            ...f,
            keptPageIndices: kept,
          };
        })
        .filter((f) => f.keptPageIndices.length > 0)
    );

    setSelectedPages(new Set());
  };

  const removeFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    setOrderedPages((prev) => prev.filter((p) => p.fileId !== fileId));
    setThumbs((prev) => prev.filter((t) => t.fileId !== fileId));
    setSelectedPages((prev) => {
      const next = new Set(prev);
      next.forEach((id) => {
        if (id.startsWith(fileId)) next.delete(id);
      });
      return next;
    });
  };

  const movePage = (idx: number, direction: "left" | "right") => {
    const targetIdx = direction === "left" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= orderedPages.length) return;

    setOrderedPages((prev) => {
      const updated = [...prev];
      const [movedItem] = updated.splice(idx, 1);
      updated.splice(targetIdx, 0, movedItem);
      return updated;
    });
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full min-h-0 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">

      {/* ── Header ── */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-shrink-0 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider whitespace-nowrap">PDF Editor</h2>
          {files.length > 0 && (
            <span className="text-[10px] font-mono text-slate-500 bg-slate-200/50 px-2 py-0.5 rounded">
              {files.length} file{files.length > 1 ? "s" : ""} &bull; {orderedPages.length} pages
            </span>
          )}
          {loading && renderProgress !== null && (
            <span className="text-[10px] font-mono text-indigo-600 animate-pulse">
              Rendering… {renderProgress}%
            </span>
          )}
          {loading && renderProgress === null && (
            <span className="text-[10px] font-mono text-indigo-600 animate-pulse">Loading…</span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Zoom controls */}
          {files.length > 0 && (
            <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg px-2 py-0.5 gap-1.5 text-[11px] font-mono">
              <button
                onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}
                className="text-slate-500 hover:text-slate-800 font-bold w-4 text-center"
              >−</button>
              <span className="text-slate-700 min-w-[36px] text-center">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom((z) => Math.min(2, +(z + 0.25).toFixed(2)))}
                className="text-slate-500 hover:text-slate-800 font-bold w-4 text-center"
              >+</button>
            </div>
          )}

          {/* Trim selected */}
          {selectedPages.size > 0 && (
            <button
              onClick={trimSelected}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-[11px] font-bold rounded-lg transition-colors"
            >
              ✂ Delete {selectedPages.size} Page{selectedPages.size > 1 ? "s" : ""}
            </button>
          )}

          {/* Merge PDF */}
          {files.length > 0 && (
            <button
              onClick={() => secondFileInputRef.current?.click()}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-600 text-[11px] font-bold rounded-lg transition-colors disabled:opacity-40"
            >
              + Add PDF to Merge
            </button>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── Left sidebar: file list ── */}
        {files.length > 0 && (
          <div className="w-48 flex-shrink-0 border-r border-slate-200 bg-slate-50/50 flex flex-col overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider px-3 pt-3 pb-1">Merged Files</p>
            {files.map((f) => (
              <div
                key={f.id}
                className="px-3 py-2 border-b border-slate-200 flex flex-col gap-1 transition-colors hover:bg-slate-50 bg-white/40"
              >
                <div className="flex items-start justify-between gap-1.5">
                  <p className="text-[11px] font-mono font-bold text-slate-700 truncate" title={f.fileName}>
                    {f.fileName}
                  </p>
                  <button
                    onClick={() => removeFile(f.id)}
                    className="text-slate-400 hover:text-red-500 transition-colors text-[10px]"
                    title="Remove file"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-[9px] text-slate-400">
                  {orderedPages.filter((p) => p.fileId === f.id).length} page(s)
                </p>
              </div>
            ))}
          </div>
        )}

        {/* ── Main preview area ── */}
        <div className="flex-1 min-w-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden bg-slate-100/50">

          {/* Empty state / drop zone */}
          {files.length === 0 && (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => !loading && fileInputRef.current?.click()}
              className={`h-full min-h-[320px] flex flex-col items-center justify-center gap-4 cursor-pointer transition-colors p-6 ${
                isDragging ? "bg-indigo-50 border-2 border-dashed border-indigo-400" : "bg-white"
              }`}
            >
              <div className="text-5xl opacity-40 select-none">📄</div>
              <div className="text-center">
                <p className="text-sm font-bold text-slate-700">
                  {loading ? "Loading PDF…" : "Drag your PDF here or click to browse"}
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Once loaded, you can delete pages, change their order by dragging, or merge other PDFs.
                </p>
              </div>
              {!loading && (
                <span className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-colors shadow-sm">
                  Select PDF
                </span>
              )}
              {loading && (
                <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              )}
            </div>
          )}

          {/* Page grid */}
          {files.length > 0 && orderedPages.length === 0 && !loading && (
            <div className="flex items-center justify-center h-full min-h-[200px]">
              <p className="text-xs font-mono text-slate-500">All pages deleted. Load another file.</p>
            </div>
          )}

          {files.length > 0 && orderedPages.length > 0 && (
            <div
              className="p-4 grid gap-4 justify-start select-none"
              style={{
                gridTemplateColumns: `repeat(auto-fill, minmax(${Math.round(140 * zoom)}px, max-content))`,
              }}
            >
              {orderedPages.map((page, idx) => {
                const thumb = thumbs.find(
                  (t) => t.fileId === page.fileId && t.originalIndex === page.originalIndex
                );
                const isSelected = selectedPages.has(page.id);
                const isItemDragged = draggedIdx === idx;
                const isItemDragOver = dragOverIdx === idx;

                return (
                  <div
                    key={page.id}
                    draggable={!loading}
                    onDragStart={(e) => {
                      setDraggedIdx(idx);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverIdx(idx);
                    }}
                    onDragEnd={() => {
                      setDraggedIdx(null);
                      setDragOverIdx(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedIdx !== null && draggedIdx !== idx) {
                        setOrderedPages((prev) => {
                          const updated = [...prev];
                          const [movedItem] = updated.splice(draggedIdx, 1);
                          updated.splice(idx, 0, movedItem);
                          return updated;
                        });
                      }
                      setDraggedIdx(null);
                      setDragOverIdx(null);
                    }}
                    onClick={() => togglePage(page.id)}
                    className={`relative rounded-xl overflow-hidden cursor-pointer transition-all border-2 select-none group ${
                      isSelected
                        ? "border-red-500 ring-2 ring-red-200 scale-[0.97]"
                        : isItemDragOver
                        ? "border-indigo-600 ring-2 ring-indigo-200 scale-[1.03]"
                        : isItemDragged
                        ? "opacity-30 border-slate-300"
                        : "border-slate-200 bg-white hover:border-indigo-500 hover:shadow-sm"
                    }`}
                    style={{ width: Math.round(140 * zoom) }}
                  >
                    {/* Thumbnail render */}
                    {thumb ? (
                      <img
                        src={thumb.dataUrl}
                        alt={`Page ${idx + 1}`}
                        className="w-full block bg-white pointer-events-none"
                        draggable={false}
                      />
                    ) : (
                      <div
                        className="w-full bg-slate-100 animate-pulse flex items-center justify-center"
                        style={{ height: Math.round(180 * zoom) }}
                      >
                        <span className="text-[10px] text-slate-400">Loading...</span>
                      </div>
                    )}

                    {/* Left/Right controls (especially helpful for mobile) */}
                    <div className="absolute top-1 left-1 right-1 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity gap-1 z-10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          movePage(idx, "left");
                        }}
                        disabled={idx === 0}
                        className="w-5 h-5 rounded bg-slate-900/75 text-white flex items-center justify-center text-xs font-bold hover:bg-slate-900 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                        title="Move page left"
                      >
                        ◀
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          movePage(idx, "right");
                        }}
                        disabled={idx === orderedPages.length - 1}
                        className="w-5 h-5 rounded bg-slate-900/75 text-white flex items-center justify-center text-xs font-bold hover:bg-slate-900 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                        title="Move page right"
                      >
                        ▶
                      </button>
                    </div>

                    {/* Delete selection overlay indicator */}
                    <div
                      className={`absolute inset-0 transition-opacity flex items-center justify-center ${
                        isSelected
                          ? "bg-red-500/20 opacity-100"
                          : "bg-black/0 group-hover:bg-black/5 opacity-0 group-hover:opacity-100"
                      }`}
                    >
                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center shadow">
                          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} className="w-3.5 h-3.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Page number badge */}
                    <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 bg-slate-900/80 text-white text-[9px] font-mono font-bold px-2 py-0.5 rounded shadow-sm">
                      {idx + 1}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Footer ── */}
      {files.length > 0 && (
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
          <p className="text-[10px] text-slate-500 font-mono">
            {selectedPages.size > 0
              ? `${selectedPages.size} page(s) marked for deletion — click "Delete" above`
              : "Drag pages to reorder • Tap pages to select for deletion • Press + to merge another file"}
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200 text-red-600 text-[11px] font-mono flex-shrink-0">
          ⚠ {error}
        </div>
      )}

      {/* Hidden file inputs */}
      <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileInput} />
      <input ref={secondFileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileInput} />
    </div>
  );
}
