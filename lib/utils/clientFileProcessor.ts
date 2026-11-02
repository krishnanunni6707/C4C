import { PDFDocument } from "pdf-lib";
import type { ManagedPdfFile } from "@/components/student/PdfEditor";

export interface ProcessedFileResult {
  file: ManagedPdfFile;
  pages: { fileId: string; originalIndex: number }[];
}

export async function processClientFile(
  file: File,
  existingFiles: ManagedPdfFile[],
  onProgress?: (percent: number) => void
): Promise<ProcessedFileResult> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const allowedExts = ["pdf", "doc", "docx", "pptx", "png", "jpg", "jpeg"];

  if (!allowedExts.includes(ext)) {
    throw new Error(
      `Unsupported file type ".${ext}". Supported formats: PDF, DOCX, PPTX, JPG, PNG.`
    );
  }

  // 50 MB client limit
  if (file.size > 50 * 1024 * 1024) {
    throw new Error("File size exceeds 50MB limit.");
  }

  const isOfficeDoc = ["doc", "docx", "pptx"].includes(ext);
  const hasExistingNonPdf = existingFiles.some((f) => f.isNonPdfDoc);

  // Non-PDF single file rule
  if (isOfficeDoc && (existingFiles.length > 0 || hasExistingNonPdf)) {
    throw new Error(
      "Office documents (.docx, .doc, .pptx) are only supported as a single file. Please upload it alone or convert to PDF."
    );
  }

  if (hasExistingNonPdf && existingFiles.length > 0) {
    throw new Error(
      "Office documents (.docx, .doc, .pptx) are only supported as a single file. Please upload it alone or convert to PDF."
    );
  }

  onProgress?.(10);

  // Read file as ArrayBuffer with progress and native fallback
  let uint8: Uint8Array;
  try {
    const arrayBuffer = await file.arrayBuffer();
    uint8 = new Uint8Array(arrayBuffer);
    onProgress?.(80);
  } catch {
    const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onprogress = (e) => {
        if (e.lengthComputable && e.total > 0) {
          const pct = Math.round((e.loaded / e.total) * 75);
          onProgress?.(Math.max(10, pct));
        }
      };
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsArrayBuffer(file);
    });
    uint8 = new Uint8Array(arrayBuffer);
  }

  let isPdf = ext === "pdf";

  // Convert PNG / JPG / JPEG to 1-page PDF
  if (["png", "jpg", "jpeg"].includes(ext)) {
    try {
      const imgDoc = await PDFDocument.create();
      const img =
        ext === "png"
          ? await imgDoc.embedPng(uint8)
          : await imgDoc.embedJpg(uint8);
      const page = imgDoc.addPage([img.width, img.height]);
      page.drawImage(img, {
        x: 0,
        y: 0,
        width: img.width,
        height: img.height,
      });
      const pdfBytes = await imgDoc.save();
      uint8 = new Uint8Array(pdfBytes);
      isPdf = true;
    } catch {
      // fallback
    }
  }

  // Non-PDF Office document (doc, docx, pptx)
  if (!isPdf) {
    const estPages =
      ext === "pptx"
        ? Math.max(1, Math.ceil(file.size / 102400))
        : Math.max(1, Math.ceil(file.size / 30720));

    const id = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newFile: ManagedPdfFile = {
      id,
      fileName: file.name,
      fileSize: file.size,
      totalOriginalPages: estPages,
      keptPageIndices: Array.from({ length: estPages }, (_, i) => i),
      rawBytes: uint8,
      isNonPdfDoc: true,
      fileType: ext,
    };

    const pages = Array.from({ length: estPages }, (_, i) => ({
      fileId: id,
      originalIndex: i,
    }));

    onProgress?.(100);
    return { file: newFile, pages };
  }

  // Standard PDF with safe page count extraction
  let pageCount = 1;
  try {
    const pdfLibDoc = await PDFDocument.load(uint8, { ignoreEncryption: true });
    pageCount = Math.max(1, pdfLibDoc.getPageCount());
  } catch (pdfErr) {
    console.warn("[clientFileProcessor] Could not parse PDF with pdf-lib, defaulting to 1 page:", pdfErr);
    pageCount = 1;
  }

  const id = `file_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const newFile: ManagedPdfFile = {
    id,
    fileName: file.name,
    fileSize: file.size,
    totalOriginalPages: pageCount,
    keptPageIndices: Array.from({ length: pageCount }, (_, i) => i),
    rawBytes: uint8,
    fileType: ext,
  };

  const pages = Array.from({ length: pageCount }, (_, i) => ({
    fileId: id,
    originalIndex: i,
  }));

  onProgress?.(100);
  return { file: newFile, pages };
}
