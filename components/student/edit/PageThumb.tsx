"use client";

import React, { useState, useRef, useEffect } from "react";
import { RotateCw, Trash2 } from "lucide-react";

export interface PageThumbProps {
  id: string;
  pageNumber: number; // 1-based display number
  rotation: number;   // 0, 90, 180, 270
  dataUrl?: string;   // rendered thumbnail canvas
  isSelected?: boolean;
  isDragging?: boolean;
  isDropTarget?: boolean;
  onSelect?: () => void;
  onRotate?: () => void;
  onDelete?: () => void;
  onDoubleClick?: () => void;
  isNonPdf?: boolean;
  fileType?: string;
  fileName?: string;
  onRenderRequest?: () => Promise<string | undefined>;
}

export default function PageThumb({
  id,
  pageNumber,
  rotation = 0,
  dataUrl,
  isSelected = false,
  isDragging = false,
  isDropTarget = false,
  onSelect,
  onRotate,
  onDelete,
  onDoubleClick,
  isNonPdf = false,
  fileType,
  fileName,
  onRenderRequest,
}: PageThumbProps) {
  const [renderedUrl, setRenderedUrl] = useState<string | undefined>(dataUrl);
  const [isLoading, setIsLoading] = useState(!dataUrl && !isNonPdf);
  const containerRef = useRef<HTMLDivElement>(null);
  const isIntersectingRef = useRef(false);

  // Sync dataUrl prop
  useEffect(() => {
    if (dataUrl) {
      setRenderedUrl(dataUrl);
      setIsLoading(false);
    }
  }, [dataUrl]);

  // Lazy-render with IntersectionObserver
  useEffect(() => {
    if (renderedUrl || isNonPdf || !onRenderRequest) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !isIntersectingRef.current) {
          isIntersectingRef.current = true;
          setIsLoading(true);
          onRenderRequest()
            .then((url) => {
              if (url) setRenderedUrl(url);
            })
            .finally(() => {
              setIsLoading(false);
            });
        }
      },
      { rootMargin: "120px" }
    );

    const el = containerRef.current;
    if (el) observer.observe(el);

    return () => {
      if (el) observer.unobserve(el);
    };
  }, [renderedUrl, isNonPdf, onRenderRequest]);

  return (
    <div
      ref={containerRef}
      data-page-id={id}
      data-page-number={pageNumber}
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
      className={`group relative flex flex-col items-center select-none cursor-pointer transition-all ${
        isDragging ? "opacity-30" : "opacity-100"
      }`}
      role="option"
      aria-selected={isSelected}
      aria-label={`Page ${pageNumber}${isSelected ? ", selected" : ""}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect?.();
        } else if (e.key === "Delete" || e.key === "Backspace") {
          e.preventDefault();
          onDelete?.();
        } else if (e.key === "r" || e.key === "R") {
          e.preventDefault();
          onRotate?.();
        }
      }}
    >
      {/* Drop Target Insertion Line (Dashed indigo vertical line on left when item is target) */}
      {isDropTarget && (
        <div
          className="absolute -left-2 top-0 bottom-6 w-0.5 border-l-2 border-dashed border-indigo-600 z-30 pointer-events-none"
          aria-hidden="true"
        />
      )}

      {/* Main Thumbnail Card */}
      <div
        className={`w-full aspect-[1/1.38] bg-white rounded-xl overflow-hidden relative transition-all duration-150 flex items-center justify-center ${
          isSelected
            ? "border-2 border-indigo-600 ring-4 ring-indigo-50 shadow-md"
            : "border border-slate-200 hover:border-slate-300 hover:shadow-sm"
        }`}
      >
        {/* Top-Center Overlay Toolbar (Rotate & Trash) — visible on hover and when selected */}
        <div
          data-no-dnd="true"
          className={`absolute top-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-white/95 backdrop-blur-xs border border-slate-200 rounded-lg p-1 shadow-md transition-opacity duration-150 ${
            isSelected
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto"
          }`}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          {/* Rotate button */}
          <button
            type="button"
            data-no-dnd="true"
            onClick={(e) => {
              e.stopPropagation();
              onRotate?.();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            className="w-6 h-6 rounded flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition-colors focus:outline-none"
            title="Rotate page 90° clockwise"
            aria-label={`Rotate page ${pageNumber}`}
          >
            <RotateCw className="w-3.5 h-3.5" strokeWidth={2.2} />
          </button>

          {/* Delete button (trash) with rose hover */}
          <button
            type="button"
            data-no-dnd="true"
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            className="w-6 h-6 rounded flex items-center justify-center text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors focus:outline-none cursor-pointer"
            title="Delete page"
            aria-label={`Delete page ${pageNumber}`}
          >
            <Trash2 className="w-3.5 h-3.5" strokeWidth={2.2} />
          </button>
        </div>

        {/* Thumbnail Canvas Content */}
        {isNonPdf ? (
          <div className="w-full h-full bg-slate-50 flex flex-col items-center justify-center p-2 text-center">
            <span className="text-[10px] font-bold text-slate-700 truncate w-full px-1">
              {fileName || "Document"}
            </span>
            <span className="text-[9px] text-slate-400 uppercase font-mono mt-1">
              {fileType || "DOC"}
            </span>
          </div>
        ) : renderedUrl ? (
          <div
            className="w-full h-full flex items-center justify-center overflow-hidden transition-transform duration-200"
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            <img
              src={renderedUrl}
              alt={`Page ${pageNumber}`}
              className="w-full h-full object-contain pointer-events-none select-none"
              draggable={false}
              loading="lazy"
            />
          </div>
        ) : isLoading ? (
          <div className="w-full h-full bg-slate-50 flex flex-col items-center justify-center gap-1.5 animate-pulse">
            <div className="w-3/4 h-2 bg-slate-200 rounded" />
            <div className="w-1/2 h-2 bg-slate-200 rounded" />
            <div className="w-2/3 h-2 bg-slate-200 rounded" />
          </div>
        ) : (
          <div className="w-full h-full bg-slate-50 flex items-center justify-center text-slate-300 text-xs font-mono">
            P.{pageNumber}
          </div>
        )}
      </div>

      {/* Page Number Centered Below matching screenshot */}
      <span className="text-xs font-medium text-slate-500 font-mono py-1.5 tabular-nums text-center">
        {pageNumber}
      </span>
    </div>
  );
}
