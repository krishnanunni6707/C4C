"use client";

import React, { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { RotateCw, Trash2, Check, FileText } from "lucide-react";
import type { PageItem } from "@/components/student/PdfEditor";

export interface MobilePageThumbGridProps {
  pages: PageItem[];
  rotations: Record<string, number>;
  thumbs: Record<string, string>;
  selectedPageId: string | null;
  onSelectPage: (id: string) => void;
  onRotatePage: (id: string) => void;
  onDeletePage: (id: string) => void;
  onReorderPages: (activeId: string, overId: string) => void;
  className?: string;
}

interface SortableThumbProps {
  page: PageItem;
  positionNumber: number;
  rotation: number;
  thumbUrl?: string;
  isSelected: boolean;
  onSelect: () => void;
}

function SortableThumb({
  page,
  positionNumber,
  rotation,
  thumbUrl,
  isSelected,
  onSelect,
}: SortableThumbProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onSelect}
      className={`relative flex flex-col items-center select-none cursor-pointer touch-manipulation group ${
        isDragging ? "opacity-30" : "opacity-100"
      }`}
    >
      {/* Thumbnail Card */}
      <div
        className={`w-full aspect-[1/1.22] max-h-[115px] bg-white rounded-xl overflow-hidden flex items-center justify-center relative transition-all shadow-xs border ${
          isSelected
            ? "border-2 border-indigo-600 ring-2 ring-indigo-100 shadow-sm"
            : "border-slate-200 hover:border-slate-300"
        }`}
      >
        {/* Selected Check Badge */}
        {isSelected && (
          <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs z-10">
            <Check className="w-2.5 h-2.5 stroke-[3]" />
          </div>
        )}

        {/* Thumbnail Preview or Document Placeholders */}
        <div
          className="w-full h-full flex items-center justify-center p-1.5 transition-transform duration-200"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          {thumbUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbUrl}
              alt={`Page ${positionNumber}`}
              className="max-w-full max-h-full object-contain pointer-events-none rounded-sm"
            />
          ) : (
            <div className="w-full h-full bg-slate-50 border border-slate-100 rounded flex flex-col items-center justify-center p-2 text-slate-300">
              <FileText className="w-6 h-6 stroke-[1.5] text-slate-300 mb-1" />
              <div className="w-3/4 h-1 bg-slate-200 rounded-full mb-1" />
              <div className="w-1/2 h-1 bg-slate-200 rounded-full" />
            </div>
          )}
        </div>
      </div>

      {/* Position Number */}
      <span className="text-[11px] font-semibold text-slate-500 mt-1">
        {positionNumber}
      </span>
    </div>
  );
}

export default function PageThumbGrid({
  pages,
  rotations,
  thumbs,
  selectedPageId,
  onSelectPage,
  onRotatePage,
  onDeletePage,
  onReorderPages,
  className = "",
}: MobilePageThumbGridProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  // 300ms long-press sensor for mobile touch reordering
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 300,
        tolerance: 5,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      onReorderPages(String(active.id), String(over.id));
    }
    setActiveId(null);
  };

  const draggedIndex = pages.findIndex((p) => p.id === activeId);
  const draggedPage = activeId ? pages[draggedIndex] : null;

  return (
    <div className={`w-full ${className}`}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <SortableContext
          items={pages.map((p) => p.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-3 gap-3">
            {pages.map((page, index) => {
              const pos = index + 1;
              const isSelected = selectedPageId === page.id;
              const rot = rotations[page.id] ?? 0;
              const url = thumbs[page.id];

              return (
                <SortableThumb
                  key={page.id}
                  page={page}
                  positionNumber={pos}
                  rotation={rot}
                  thumbUrl={url}
                  isSelected={isSelected}
                  onSelect={() => onSelectPage(page.id)}
                />
              );
            })}
          </div>
        </SortableContext>

        {/* Drag Overlay (Lifted, tilted page thumb with floating mini toolbar) */}
        <DragOverlay>
          {draggedPage && (
            <div className="flex flex-col items-center select-none cursor-grabbing">
              {/* Floating Mini Toolbar above dragged page */}
              <div className="mb-2 bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-lg rounded-full px-2.5 py-1 flex items-center gap-2 text-slate-600 animate-in fade-in zoom-in-95 duration-100 z-50">
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    onRotatePage(draggedPage.id);
                  }}
                  className="p-1 hover:text-indigo-600 rounded-full"
                  aria-label="Rotate page"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
                <div className="w-px h-3 bg-slate-200" />
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    onDeletePage(draggedPage.id);
                  }}
                  className="p-1 hover:text-rose-600 rounded-full"
                  aria-label="Delete page"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Lifted Tilted Card */}
              <div className="w-24 aspect-[3/4] bg-white rounded-xl shadow-2xl border-2 border-indigo-600 overflow-hidden transform rotate-3 scale-105 flex items-center justify-center p-1">
                {thumbs[draggedPage.id] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumbs[draggedPage.id]}
                    alt={`Page ${draggedIndex + 1}`}
                    className="max-w-full max-h-full object-contain pointer-events-none"
                    style={{
                      transform: `rotate(${rotations[draggedPage.id] ?? 0}deg)`,
                    }}
                  />
                ) : (
                  <FileText className="w-8 h-8 text-indigo-400 stroke-[1.5]" />
                )}
              </div>
              <span className="text-[11px] font-bold text-indigo-600 mt-1">
                {draggedIndex + 1}
              </span>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
