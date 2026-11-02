"use client";

import React from "react";
import { ChevronLeft, ChevronRight, ArrowRight, Loader2, Save, FileText } from "lucide-react";
import SelectedPageCard from "./SelectedPageCard";

export interface PreviewPanelProps {
  selectedPageNumber: number;
  totalPages: number;
  zoom: number;
  rotation?: number;
  previewDataUrl?: string | null;
  loadingPreview?: boolean;
  isSaving?: boolean;
  disabled?: boolean;
  isNonPdf?: boolean;
  fileName?: string;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onToggleFitZoom: () => void;
  onSaveAndContinue: () => void;
  onDeleteSelectedPage?: () => void;
}

export default function PreviewPanel({
  selectedPageNumber,
  totalPages,
  zoom,
  rotation = 0,
  previewDataUrl,
  loadingPreview = false,
  isSaving = false,
  disabled = false,
  isNonPdf = false,
  fileName,
  onZoomIn,
  onZoomOut,
  onPrevPage,
  onNextPage,
  onToggleFitZoom,
  onSaveAndContinue,
  onDeleteSelectedPage,
}: PreviewPanelProps) {
  const zoomPercent = Math.round(zoom * 100);

  return (
    <div className="flex flex-col justify-between h-full space-y-4">
      {/* Top Bar matching screenshot */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        {/* Zoom Controls: − 100% + */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onZoomOut}
            disabled={zoom <= 0.5}
            className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-[#0F172A] flex items-center justify-center text-sm font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            title="Zoom out"
            aria-label="Zoom out"
          >
            &minus;
          </button>

          <button
            type="button"
            onClick={onToggleFitZoom}
            className="px-2 h-7 text-xs font-mono font-medium text-slate-700 min-w-[48px] text-center hover:bg-slate-50 rounded transition-colors"
            title="Click to toggle fit / zoom"
            aria-label="Current zoom level"
          >
            {zoomPercent}%
          </button>

          <button
            type="button"
            onClick={onZoomIn}
            disabled={zoom >= 2.0}
            className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-[#0F172A] flex items-center justify-center text-sm font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            title="Zoom in"
            aria-label="Zoom in"
          >
            &#43;
          </button>
        </div>

        {/* Page Position & Prev/Next Arrows */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700 tabular-nums">
            Page {totalPages > 0 ? selectedPageNumber : 0} of {totalPages}
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onPrevPage}
              disabled={selectedPageNumber <= 1}
              className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-[#0F172A] flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              title="Previous page"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onNextPage}
              disabled={selectedPageNumber >= totalPages}
              className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-[#0F172A] flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              title="Next page"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Large Page Preview Stage on slate-50 */}
      <div
        onDoubleClick={onToggleFitZoom}
        className="h-[360px] min-h-[320px] max-h-[400px] bg-[#F8FAFC] border border-slate-200/80 rounded-xl p-3 flex items-center justify-center overflow-hidden cursor-zoom-in relative select-none"
        title="Double click to toggle zoom"
      >
        {isNonPdf ? (
          <div className="w-[260px] h-[340px] bg-white rounded-lg shadow-md border border-slate-200 p-6 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
              <FileText className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-[#0F172A] break-words max-w-full">
              {fileName || "Non-PDF Document"}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Preview rendered at standard letter format
            </p>
          </div>
        ) : previewDataUrl ? (
          <div
            className="transition-transform duration-200 ease-out origin-center"
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
            }}
          >
            <div className="bg-white shadow-lg rounded border border-slate-200/60 overflow-hidden max-w-[260px]">
              <img
                src={previewDataUrl}
                alt={`Page ${selectedPageNumber}`}
                className="w-full h-auto block pointer-events-none select-none"
                draggable={false}
              />
            </div>
          </div>
        ) : loadingPreview ? (
          <div className="flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
            <span className="text-xs text-slate-400 font-mono">
              Rendering high-res preview&hellip;
            </span>
          </div>
        ) : (
          <div className="text-center text-slate-400 text-xs font-mono">
            No page selected
          </div>
        )}
      </div>

      {/* Selected Page Card */}
      <SelectedPageCard
        selectedPageNumber={selectedPageNumber}
        totalPages={totalPages}
        onDoubleClick={onToggleFitZoom}
        onDelete={onDeleteSelectedPage}
      />

      {/* Full-width primary button: "Save arrangement & continue →" matching screenshot */}
      <button
        type="button"
        onClick={onSaveAndContinue}
        disabled={disabled || totalPages === 0 || isSaving}
        className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold text-sm rounded-[10px] flex items-center justify-center gap-2 transition-all shadow-sm shadow-indigo-600/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        aria-label="Save arrangement and continue to preferences"
      >
        {isSaving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Saving arrangement&hellip;</span>
          </>
        ) : (
          <>
            <Save className="w-4 h-4" />
            <span>Save arrangement &amp; continue &rarr;</span>
          </>
        )}
      </button>
    </div>
  );
}
