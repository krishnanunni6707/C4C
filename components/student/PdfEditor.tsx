"use client";

/**
 * PdfEditor — real PDF preview + page trim + multi-file merge
 *
 * Features:
 *  - Renders every page of loaded PDFs as real canvas previews (pdfjs-dist)
 *  - Toggle-select pages to trim (delete) them
 *  - Load multiple PDFs — they're merged in order on submit
 *  - Drag-and-drop file loading
 *  - Zoom control on the preview grid
 */

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { PDFDocument } from "pdf-lib";
import * as PDFJS from "pdfjs-dist";

// Served from /public — static file, no webpack involvement needed
PDFJS.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ManagedPdfFile {
  id: string;
  fileName: string;
  fileSize: number;
  totalOriginalPages: number;
  /** Indices into the original document that are still kept */
  keptPageIndices: number[];
  rawBytes: Uint8Array;
}

interface PageThumb {
  fileId: string;
  originalIndex: number; // 0-based page index in the source PDF
  dataUrl: string;       // rendered canvas snapshot
}

interface PdfEditorProps {
  /** Called whenever the staged file list changes — parent uses this for cost calc */
  onFilesChange: (files: ManagedPdfFile[]) => void;
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
  const [thumbs, setThumbs] = useState<PageThumb[]>([]);
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(false);
  const [renderProgress, setRenderProgress] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  // Which file's pages are showing in the preview panel
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);

  // Propagate file list up to parent
  useEffect(() => {
    onFilesChange(files);
  }, [files, onFilesChange]);

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

      setFiles((prev) => {
        const updated = [...prev, newFile];
        return updated;
      });
      setThumbs((prev) => [...prev, ...newThumbs]);
      setPreviewFileId(id);
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

  const pageKey = (fileId: string, originalIndex: number) => `${fileId}::${originalIndex}`;

  const togglePage = (fileId: string, originalIndex: number) => {
    const key = pageKey(fileId, originalIndex);
    setSelectedPages((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const trimSelected = () => {
    if (selectedPages.size === 0) return;

    setFiles((prevFiles) => {
      const updated = prevFiles.map((f) => {
        const toRemove = new Set<number>();
        selectedPages.forEach((key) => {
          const [fid, idx] = key.split("::");
          if (fid === f.id) toRemove.add(Number(idx));
        });
        if (toRemove.size === 0) return f;
        return {
          ...f,
          keptPageIndices: f.keptPageIndices.filter((i) => !toRemove.has(i)),
        };
      }).filter((f) => f.keptPageIndices.length > 0);
      return updated;
    });

    // Remove thumbnails for deleted pages
    setThumbs((prev) =>
      prev.filter((t) => !selectedPages.has(pageKey(t.fileId, t.originalIndex)))
    );
    setSelectedPages(new Set());
  };

  const removeFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    setThumbs((prev) => prev.filter((t) => t.fileId !== fileId));
    setSelectedPages((prev) => {
      const next = new Set(prev);
      next.forEach((k) => { if (k.startsWith(fileId)) next.delete(k); });
      return next;
    });
    if (previewFileId === fileId) {
      setPreviewFileId(null);
    }
  };

  // ── Derived ────────────────────────────────────────────────────────────────

  const activeFile = files.find((f) => f.id === previewFileId) ?? files[0] ?? null;

  const visibleThumbs = thumbs.filter((t) => {
    if (!activeFile) return false;
    return (
      t.fileId === activeFile.id &&
      activeFile.keptPageIndices.includes(t.originalIndex)
    );
  });

  const totalKeptPages = files.reduce((a, f) => a + f.keptPageIndices.length, 0);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#111322] border border-[#1e2235] rounded-2xl overflow-hidden">

      {/* ── Header ── */}
      <div className="px-4 py-3 bg-[#16192e] border-b border-[#1e2235] flex items-center justify-between flex-shrink-0 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider whitespace-nowrap">PDF Editor</h2>
          {files.length > 0 && (
            <span className="text-[10px] font-mono text-gray-500">
              {files.length} file{files.length > 1 ? "s" : ""} &bull; {totalKeptPages} pages kept
            </span>
          )}
          {loading && renderProgress !== null && (
            <span className="text-[10px] font-mono text-amber-400 animate-pulse">
              Rendering… {renderProgress}%
            </span>
          )}
          {loading && renderProgress === null && (
            <span className="text-[10px] font-mono text-amber-400 animate-pulse">Loading…</span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Zoom */}
          {files.length > 0 && (
            <div className="flex items-center bg-[#0d0f1c] border border-[#22263d] rounded-lg px-2 py-1 gap-1.5 text-[11px] font-mono">
              <button
                onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}
                className="text-gray-400 hover:text-white font-bold w-4 text-center"
              >−</button>
              <span className="text-slate-300 min-w-[36px] text-center">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom((z) => Math.min(2, +(z + 0.25).toFixed(2)))}
                className="text-gray-400 hover:text-white font-bold w-4 text-center"
              >+</button>
            </div>
          )}

          {/* Trim selected */}
          {selectedPages.size > 0 && (
            <button
              onClick={trimSelected}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-[11px] font-bold rounded-lg transition-colors"
            >
              ✂ Trim {selectedPages.size} page{selectedPages.size > 1 ? "s" : ""}
            </button>
          )}

          {/* Add / merge another PDF */}
          {files.length > 0 && (
            <button
              onClick={() => secondFileInputRef.current?.click()}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 text-[11px] font-bold rounded-lg transition-colors disabled:opacity-40"
            >
              + Merge PDF
            </button>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── Left sidebar: file list ── */}
        {files.length > 1 && (
          <div className="w-48 flex-shrink-0 border-r border-[#1e2235] bg-[#0d0f1c] flex flex-col overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <p className="text-[9px] font-bold text-gray-600 uppercase tracking-wider px-3 pt-3 pb-1">Files</p>
            {files.map((f) => (
              <button
                key={f.id}
                onClick={() => setPreviewFileId(f.id)}
                className={`w-full text-left px-3 py-2.5 border-b border-[#1e2235] transition-colors ${
                  activeFile?.id === f.id
                    ? "bg-[#1b1e36] text-white"
                    : "text-gray-400 hover:bg-[#13152a]"
                }`}
              >
                <p className="text-[11px] font-mono font-bold truncate">{f.fileName}</p>
                <p className="text-[9px] text-gray-500 mt-0.5">
                  {f.keptPageIndices.length}/{f.totalOriginalPages} pages
                </p>
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(f.id); }}
                  className="mt-1 text-[9px] text-red-500/60 hover:text-red-400 font-mono"
                >
                  remove
                </button>
              </button>
            ))}
          </div>
        )}

        {/* ── Main preview area ── */}
        <div className="flex-1 min-w-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden bg-[#0b0c16]">

          {/* Empty state / drop zone */}
          {files.length === 0 && (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => !loading && fileInputRef.current?.click()}
              className={`h-full min-h-[320px] flex flex-col items-center justify-center gap-4 cursor-pointer transition-colors ${
                isDragging ? "bg-indigo-900/10 border-indigo-500" : ""
              }`}
            >
              <div className="text-4xl opacity-30 select-none">📄</div>
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-300">
                  {loading ? "Loading PDF…" : "Drop a PDF here or click to browse"}
                </p>
                <p className="text-[11px] text-gray-600 mt-1">
                  Preview pages, trim unwanted ones, or merge multiple PDFs
                </p>
              </div>
              {!loading && (
                <span className="px-4 py-2 bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-bold rounded-lg transition-colors">
                  Browse PDF
                </span>
              )}
              {loading && (
                <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              )}
            </div>
          )}

          {/* Page grid */}
          {files.length > 0 && visibleThumbs.length === 0 && !loading && (
            <div className="flex items-center justify-center h-full min-h-[200px]">
              <p className="text-xs font-mono text-gray-500">All pages trimmed from this document.</p>
            </div>
          )}

          {files.length > 0 && visibleThumbs.length > 0 && (
            <div
              className="p-4 grid gap-3"
              style={{
                gridTemplateColumns: `repeat(auto-fill, minmax(${Math.round(140 * zoom)}px, max-content))`,
              }}
            >
              {visibleThumbs.map((thumb, idx) => {
                const key = pageKey(thumb.fileId, thumb.originalIndex);
                const isSelected = selectedPages.has(key);
                return (
                  <div
                    key={key}
                    onClick={() => togglePage(thumb.fileId, thumb.originalIndex)}
                    className={`relative rounded-xl overflow-hidden cursor-pointer transition-all border-2 select-none group ${
                      isSelected
                        ? "border-red-500 ring-2 ring-red-500/30 scale-[0.97]"
                        : "border-[#1e2235] hover:border-indigo-500/60"
                    }`}
                    style={{ width: Math.round(140 * zoom) }}
                  >
                    {/* Page thumbnail */}
                    <img
                      src={thumb.dataUrl}
                      alt={`Page ${idx + 1}`}
                      className="w-full block bg-white"
                      draggable={false}
                    />

                    {/* Overlay on hover / selected */}
                    <div
                      className={`absolute inset-0 transition-opacity flex items-center justify-center ${
                        isSelected
                          ? "bg-red-900/40 opacity-100"
                          : "bg-black/0 group-hover:bg-black/20 opacity-0 group-hover:opacity-100"
                      }`}
                    >
                      {isSelected && (
                        <div className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center shadow-lg">
                          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Page number badge */}
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 bg-black/60 text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">
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
        <div className="px-4 py-2.5 bg-[#16192e] border-t border-[#1e2235] flex items-center justify-between flex-shrink-0">
          <p className="text-[10px] text-gray-500 font-mono">
            {selectedPages.size > 0
              ? `${selectedPages.size} page${selectedPages.size > 1 ? "s" : ""} selected — click ✂ Trim to remove`
              : "Click pages to select • Trim removes selected pages • Merge adds another PDF"}
          </p>
          <div className="flex items-center gap-2">
            {/* Remove single file button if only one file */}
            {files.length === 1 && (
              <button
                onClick={() => removeFile(files[0]!.id)}
                className="text-[10px] text-red-400/60 hover:text-red-400 font-mono transition-colors"
              >
                Remove file
              </button>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-4 py-2 bg-red-500/10 border-t border-red-500/20 text-red-400 text-[11px] font-mono flex-shrink-0">
          ⚠ {error}
        </div>
      )}

      {/* Hidden file inputs */}
      <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileInput} />
      <input ref={secondFileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileInput} />
    </div>
  );
}
