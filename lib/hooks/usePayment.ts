"use client";

import { useState } from "react";
import { PDFDocument, degrees } from "pdf-lib";
import type { ManagedPdfFile } from "@/components/student/PdfEditor";

export interface UsePaymentOptions {
  stagedFiles: ManagedPdfFile[];
  stagedPages: { fileId: string; originalIndex: number }[];
  copies: number;
  colorMode: "BW" | "COLOR";
  printType: "single-sided" | "double-sided";
  paperSize: "A4" | "Letter";
  selectedLocationId: string;
  pageRotations?: Record<string, number>;
  onSuccess?: (newToken?: string) => void;
}

export function usePayment({
  stagedFiles,
  stagedPages,
  copies,
  colorMode,
  printType,
  paperSize,
  selectedLocationId,
  pageRotations,
  onSuccess,
}: UsePaymentOptions) {
  const [isRazorpayModalOpen, setIsRazorpayModalOpen] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [compiling, setCompiling] = useState(false);
  const [error, setError] = useState("");
  const [dispatchedTokens, setDispatchedTokens] = useState<string[]>([]);

  const compileAndBakePdf = async (): Promise<Uint8Array<ArrayBuffer> | null> => {
    if (stagedFiles.length === 0 || stagedPages.length === 0) return null;

    // Filter to PDF files (non-PDF docs skip compilation)
    const pdfFiles = stagedFiles.filter((f) => !f.isNonPdfDoc);
    if (pdfFiles.length === 0) return null;

    try {
      setCompiling(true);
      const master = await PDFDocument.create();
      const docCache: Record<string, PDFDocument> = {};

      for (const f of pdfFiles) {
        if (!f.rawBytes || f.rawBytes.byteLength === 0) {
          throw new Error(`File data for "${f.fileName}" is empty or missing.`);
        }
        const raw =
          f.rawBytes instanceof Uint8Array
            ? f.rawBytes.slice()
            : new Uint8Array(f.rawBytes).slice();
        docCache[f.id] = await PDFDocument.load(raw, { ignoreEncryption: true });
      }

      for (let idx = 0; idx < stagedPages.length; idx++) {
        const page = stagedPages[idx];
        if (!page) continue;
        const src = docCache[page.fileId];
        if (src) {
          const pageCount = src.getPageCount();
          if (page.originalIndex >= 0 && page.originalIndex < pageCount) {
            const [copiedPage] = await master.copyPages(src, [page.originalIndex]);

            // Apply page rotation if any
            const rotKey = `${page.fileId}::${page.originalIndex}::${idx}`;
            const altRotKey = `${page.fileId}::${page.originalIndex}`;
            const rot = pageRotations?.[rotKey] ?? pageRotations?.[altRotKey] ?? 0;
            if (rot !== 0) {
              const currentAngle = copiedPage.getRotation().angle;
              copiedPage.setRotation(degrees((currentAngle + rot) % 360));
            }

            master.addPage(copiedPage);
          }
        }
      }

      if (master.getPageCount() === 0) {
        throw new Error("No valid pages were found to compile.");
      }

      const saved = await master.save();
      return new Uint8Array(saved.buffer as ArrayBuffer) as Uint8Array<ArrayBuffer>;
    } catch (err: unknown) {
      console.error("[compile]", err);
      const msg = err instanceof Error ? err.message : "Failed to compile PDF document.";
      setError(msg);
      throw err;
    } finally {
      setCompiling(false);
    }
  };

  const handleDownload = async () => {
    try {
      const bytes = await compileAndBakePdf();
      if (!bytes) return;
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `QDoc_Edited_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // error handled in compileAndBakePdf
    }
  };

  const handleInitiatePayment = async () => {
    if (stagedFiles.length === 0 || stagedPages.length === 0) {
      setError("Please load at least one file before submitting.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      let uploadBlob: Blob;
      let fileName: string;

      const nonPdfDoc = stagedFiles.find((f) => f.isNonPdfDoc);
      if (nonPdfDoc && stagedFiles.length === 1) {
        if (!nonPdfDoc.rawBytes || nonPdfDoc.rawBytes.byteLength === 0) {
          throw new Error(`File data for "${nonPdfDoc.fileName}" is empty. Please re-upload it.`);
        }
        const raw =
          nonPdfDoc.rawBytes instanceof Uint8Array
            ? nonPdfDoc.rawBytes.slice()
            : new Uint8Array(nonPdfDoc.rawBytes).slice();
        uploadBlob = new Blob([raw as unknown as BlobPart]);
        fileName = nonPdfDoc.fileName;
      } else {
        const bytes = await compileAndBakePdf();
        if (!bytes || bytes.byteLength === 0) {
          throw new Error("Document compilation failed.");
        }
        uploadBlob = new Blob([bytes], { type: "application/pdf" });
        const baseName =
          stagedFiles.length === 1
            ? stagedFiles[0]!.fileName.replace(/\.[^/.]+$/, "")
            : `Merged_${stagedFiles.length}_docs`;
        fileName = `${baseName}.pdf`;
      }

      const formData = new FormData();
      formData.append("file", uploadBlob, fileName);

      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      if (!uploadRes.ok) {
        const d = await uploadRes.json().catch(() => ({}));
        const uploadMsg = d.error || d.details || "Upload failed.";
        if (process.env.NODE_ENV !== "production") {
          console.error("[usePayment:upload]", uploadRes.status, uploadMsg);
        }
        throw new Error(uploadMsg);
      }
      const uploadData = await uploadRes.json();

      const draftRes = await fetch("/api/print-jobs/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uploadId: uploadData.uploadId,
          copies,
          colorMode,
          printType,
          paperSize,
          locationId: selectedLocationId,
        }),
      });

      if (!draftRes.ok) {
        const d = await draftRes.json().catch(() => ({}));
        const draftMsg = d.error || "Failed to create print job draft.";
        if (process.env.NODE_ENV !== "production") {
          console.error("[usePayment:draft]", draftRes.status, draftMsg);
        }
        throw new Error(draftMsg);
      }

      const draftData = await draftRes.json();
      setPendingOrderId(draftData.orderId);
      setIsRazorpayModalOpen(true);
      return draftData as {
        success: boolean;
        orderId: string;
        amount: number;
        amountRupees: number;
        keyId?: string;
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Payment initialization failed.";
      setError(msg);
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentSuccess = async (paymentInfo: {
    razorpay_payment_id: string;
    razorpay_order_id?: string;
    razorpay_signature?: string;
  }) => {
    try {
      setSubmitting(true);
      const verifyRes = await fetch("/api/payment/razorpay/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpay_order_id: paymentInfo.razorpay_order_id || pendingOrderId,
          razorpay_payment_id: paymentInfo.razorpay_payment_id,
          razorpay_signature: paymentInfo.razorpay_signature || "mock_signature_test",
        }),
      });

      if (!verifyRes.ok) {
        const d = await verifyRes.json().catch(() => ({}));
        throw new Error(d.error || "Payment verification failed.");
      }

      const verifyData = await verifyRes.json();
      const newToken: string | undefined = verifyData.printJob?.tokenNumber;
      const jobId: string | undefined = verifyData.printJob?.id;
      if (newToken) setDispatchedTokens((prev) => [...prev, newToken]);

      onSuccess?.(newToken);
      return { tokenNumber: newToken, jobId };
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Payment fulfillment failed.");
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  return {
    isRazorpayModalOpen,
    setIsRazorpayModalOpen,
    pendingOrderId,
    setPendingOrderId,
    submitting,
    setSubmitting,
    compiling,
    error,
    setError,
    dispatchedTokens,
    setDispatchedTokens,
    compileAndBakePdf,
    handleDownload,
    handleInitiatePayment,
    handlePaymentSuccess,
  };
}
