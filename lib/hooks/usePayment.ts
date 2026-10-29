"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import type { ManagedPdfFile } from "@/components/student/PdfEditor";

export interface UsePaymentOptions {
  stagedFiles: ManagedPdfFile[];
  stagedPages: { fileId: string; originalIndex: number }[];
  copies: number;
  colorMode: "BW" | "COLOR";
  printType: "single-sided" | "double-sided";
  paperSize: "A4" | "Letter";
  selectedLocationId: string;
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
        docCache[f.id] = await PDFDocument.load(f.rawBytes);
      }
      for (const page of stagedPages) {
        const src = docCache[page.fileId];
        if (src) {
          const [copiedPage] = await master.copyPages(src, [page.originalIndex]);
          master.addPage(copiedPage);
        }
      }
      const saved = await master.save();
      return new Uint8Array(saved.buffer as ArrayBuffer) as Uint8Array<ArrayBuffer>;
    } catch (err) {
      console.error("[compile]", err);
      setError("Failed to compile PDF. Please try again.");
      return null;
    } finally {
      setCompiling(false);
    }
  };

  const handleDownload = async () => {
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
        uploadBlob = new Blob([nonPdfDoc.rawBytes as unknown as BlobPart]);
        fileName = nonPdfDoc.fileName;
      } else {
        const bytes = await compileAndBakePdf();
        if (!bytes) throw new Error("Document compilation failed.");
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
        throw new Error(d.error || d.details || "Upload failed.");
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
        throw new Error(d.error || "Failed to create print job draft.");
      }

      const draftData = await draftRes.json();
      setPendingOrderId(draftData.orderId);
      setIsRazorpayModalOpen(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Payment initialization failed.");
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
      if (newToken) setDispatchedTokens((prev) => [...prev, newToken]);

      setIsRazorpayModalOpen(false);
      onSuccess?.(newToken);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Payment fulfillment failed.");
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
