"use client";

import React, { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AnimatePresence, motion } from "framer-motion";
import PageThumb from "./PageThumb";
import type { PageItem, ManagedPdfFile } from "../PdfEditor";

export interface PageGridProps {
  pages: PageItem[];
  rotations: Record<string, number>;
  thumbs: Record<string, string>;
  selectedPageId: string | null;
  files: ManagedPdfFile[];
  onSelectPage: (id: string) => void;
  onRotatePage: (id: string) => void;
  onDeletePage: (id: string) => void;
  onReorderPages: (activeId: string, overId: string) => void;
  onDoubleClickPage?: (id: string) => void;
  onRenderPageRequest?: (page: PageItem) => Promise<string | undefined>;
}

interface SortablePageThumbProps {
  page: PageItem;
  pageNumber: number;
  rotation: number;
  thumbUrl?: string;
  isSelected: boolean;
  isDropTarget: boolean;
  onSelect: () => void;
  onRotate: () => void;
  onDelete: () => void;
  onDoubleClick?: () => void;
  isNonPdf?: boolean;
  fileType?: string;
  fileName?: string;
  onRenderRequest?: () => Promise<string | undefined>;
}

function SortablePageThumb({
  page,
  pageNumber,
  rotation,
  thumbUrl,
  isSelected,
  isDropTarget,
  onSelect,
  onRotate,
  onDelete,
  onDoubleClick,
  isNonPdf,
  fileType,
  fileName,
  onRenderRequest,
}: SortablePageThumbProps) {
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
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.15 }}
      {...attributes}
      {...listeners}
    >
      <PageThumb
        id={page.id}
        pageNumber={pageNumber}
        rotation={rotation}
        dataUrl={thumbUrl}
        isSelected={isSelected}
        isDragging={isDragging}
        isDropTarget={isDropTarget}
        onSelect={onSelect}
        onRotate={onRotate}
        onDelete={onDelete}
        onDoubleClick={onDoubleClick}
        isNonPdf={isNonPdf}
        fileType={fileType}
        fileName={fileName}
        onRenderRequest={onRenderRequest}
      />
    </motion.div>
  );
}

export default function PageGrid({
  pages,
  rotations,
  thumbs,
  selectedPageId,
  files,
  onSelectPage,
  onRotatePage,
  onDeletePage,
  onReorderPages,
  onDoubleClickPage,
  onRenderPageRequest,
}: PageGridProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [liveAnnouncement, setLiveAnnouncement] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px movement required before drag starts, preserving clicks
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragOver = (event: DragOverEvent) => {
    if (event.over) {
      setOverId(String(event.over.id));
    } else {
      setOverId(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const fromIdx = pages.findIndex((p) => p.id === active.id);
      const toIdx = pages.findIndex((p) => p.id === over.id);
      onReorderPages(String(active.id), String(over.id));
      setLiveAnnouncement(`Page ${fromIdx + 1} moved to position ${toIdx + 1}`);
    }
    setActiveId(null);
    setOverId(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setOverId(null);
  };

  const activePage = pages.find((p) => p.id === activeId);
  const activePageIdx = activePage ? pages.indexOf(activePage) : -1;
  const activeFile = activePage ? files.find((f) => f.id === activePage.fileId) : undefined;
  const activeThumbUrl = activePage
    ? thumbs[`${activePage.fileId}::${activePage.originalIndex}`]
    : undefined;

  // Keyboard navigation across the grid
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (pages.length === 0) return;
    const currentIdx = selectedPageId
      ? pages.findIndex((p) => p.id === selectedPageId)
      : 0;

    let targetIdx = currentIdx;

    if (e.key === "ArrowRight") {
      e.preventDefault();
      targetIdx = Math.min(pages.length - 1, currentIdx + 1);
      if (e.altKey && currentIdx < pages.length - 1) {
        onReorderPages(pages[currentIdx].id, pages[currentIdx + 1].id);
        return;
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      targetIdx = Math.max(0, currentIdx - 1);
      if (e.altKey && currentIdx > 0) {
        onReorderPages(pages[currentIdx].id, pages[currentIdx - 1].id);
        return;
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      targetIdx = Math.min(pages.length - 1, currentIdx + 6);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      targetIdx = Math.max(0, currentIdx - 6);
    } else if (e.key === "Delete" || e.key === "Backspace") {
      if (selectedPageId) {
        e.preventDefault();
        onDeletePage(selectedPageId);
        return;
      }
    } else if (e.key === "r" || e.key === "R") {
      if (selectedPageId) {
        e.preventDefault();
        onRotatePage(selectedPageId);
        return;
      }
    }

    if (targetIdx !== currentIdx && pages[targetIdx]) {
      onSelectPage(pages[targetIdx].id);
    }
  };

  if (pages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
        <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
          <span className="text-xl font-bold">!</span>
        </div>
        <h3 className="text-sm font-bold text-slate-800">Keep at least one page</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-xs">
          All pages were removed. Please click undo or add a file to continue with your print job.
        </p>
      </div>
    );
  }

  return (
    <div
      className="relative focus:outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      role="listbox"
      aria-label="Document pages grid"
      aria-multiselectable={false}
    >
      {/* Screen Reader Live Region for Announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {liveAnnouncement}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={pages.map((p) => p.id)} strategy={rectSortingStrategy}>
          {/* Grid: 6 columns desktop, 4 at ≥768, 3 at ≥640, 2 below, gap 16 */}
          <div className="grid grid-cols-2 min-[640px]:grid-cols-3 min-[768px]:grid-cols-4 xl:grid-cols-6 gap-4">
            <AnimatePresence mode="popLayout">
              {pages.map((page, idx) => {
                const parentFile = files.find((f) => f.id === page.fileId);
                const thumbKey = `${page.fileId}::${page.originalIndex}`;
                const thumbUrl = thumbs[thumbKey];
                const rotation = rotations[page.id] || 0;
                const isSelected = selectedPageId === page.id;
                const isDropTarget = overId === page.id && activeId !== page.id;

                return (
                  <SortablePageThumb
                    key={page.id}
                    page={page}
                    pageNumber={idx + 1}
                    rotation={rotation}
                    thumbUrl={thumbUrl}
                    isSelected={isSelected}
                    isDropTarget={isDropTarget}
                    onSelect={() => onSelectPage(page.id)}
                    onRotate={() => onRotatePage(page.id)}
                    onDelete={() => onDeletePage(page.id)}
                    onDoubleClick={() => onDoubleClickPage?.(page.id)}
                    isNonPdf={parentFile?.isNonPdfDoc}
                    fileType={parentFile?.fileType}
                    fileName={parentFile?.fileName}
                    onRenderRequest={
                      onRenderPageRequest
                        ? () => onRenderPageRequest(page)
                        : undefined
                    }
                  />
                );
              })}
            </AnimatePresence>
          </div>
        </SortableContext>

        {/* Drag Overlay: Lifted, tilted ~4°, stronger shadow, cursor grabbing */}
        <DragOverlay adjustScale={false} dropAnimation={null}>
          {activePage ? (
            <div className="transform rotate-[4deg] scale-105 shadow-2xl rounded-xl ring-2 ring-indigo-500/40 bg-white cursor-grabbing select-none pointer-events-none">
              <PageThumb
                id={activePage.id}
                pageNumber={activePageIdx + 1}
                rotation={rotations[activePage.id] || 0}
                dataUrl={activeThumbUrl}
                isSelected={true}
                isDragging={false}
                isNonPdf={activeFile?.isNonPdfDoc}
                fileType={activeFile?.fileType}
                fileName={activeFile?.fileName}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
