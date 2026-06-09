"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

// ── sessionStorage / localStorage shapes ─────────────────────────────────────

interface UploadedFile {
  fileName: string;
  fileUrl: string;
  fileSize: number;
  pages: number;
  fileType: string;
}

interface PrintPreferences {
  colorMode: "BW" | "COLOR";
  printType: "SINGLE" | "DOUBLE";
  paperSize: "A4";
  copies: number;
  pagesPerSheet: number;
  orientation: string;
  // priority intentionally removed
}

interface PrintSummary {
  totalPages: number;
  sheets: number;
  amount: number;
}

// ── Helper: read from localStorage first, fallback to sessionStorage ──────────

function readStored(key: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(key) || sessionStorage.getItem(key);
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PaymentPage() {
  const router = useRouter();
  const [fileInfo, setFileInfo] = useState<UploadedFile | null>(null);
  const [preferences, setPreferences] = useState<PrintPreferences | null>(null);
  const [summary, setSummary] = useState<PrintSummary | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"QR" | "CASH">("QR");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const rawFile = readStored("uploadedFile");
    const rawPrefs = readStored("printPreferences");
    const rawSummary = readStored("printSummary");

    if (!rawFile || !rawPrefs || !rawSummary) {
      router.push("/student/upload");
      return;
    }

    const parsedFile: UploadedFile = JSON.parse(rawFile);
    const parsedPrefs: PrintPreferences = JSON.parse(rawPrefs);
    const parsedSummary: PrintSummary = JSON.parse(rawSummary);

    // Validate that we actually have a Cloudinary URL
    if (!parsedFile.fileUrl || !parsedFile.fileUrl.startsWith("http")) {
      router.push("/student/upload");
      return;
    }

    setFileInfo(parsedFile);
    setPreferences(parsedPrefs);
    setSummary(parsedSummary);
  }, [router]);

  const handlePayment = async () => {
    if (!fileInfo || !preferences || !summary) return;

    // Final guard — ensure fileUrl is present before calling API
    if (!fileInfo.fileUrl) {
      setError("File URL is missing. Please re-upload your document.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const payload = {
        fileName: fileInfo.fileName,
        fileUrl: fileInfo.fileUrl,
        totalPages: summary.totalPages,
        copies: preferences.copies,
        colorMode: preferences.colorMode,
        printType: preferences.printType,
        paperSize: preferences.paperSize,
        amount: summary.amount,
        paymentMethod,
        // priority omitted — not part of the schema
      };

      const response = await fetch("/api/print-jobs/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Clear all workflow data
        ["uploadedFile", "printPreferences", "printSummary"].forEach((k) => {
          localStorage.removeItem(k);
          sessionStorage.removeItem(k);
        });

        // Redirect to student queue — job is visible immediately
        router.push("/student/queue");
      } else {
        const msg = data.error || "Failed to create print job";
        const missing = data.missingFields
          ? ` Missing: ${data.missingFields.join(", ")}`
          : "";
        setError(msg + missing);
        console.error("API Error:", data);
      }
    } catch (err) {
      console.error("Payment error:", err);
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!summary || !fileInfo || !preferences) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Smart Campus Printing</h1>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-2">Payment</h2>
          <p className="text-gray-600 mb-8">Review and confirm your order</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
              {error}
            </div>
          )}

          {/* Order Summary */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="font-semibold text-lg mb-4">Order Summary</h3>
            <div className="space-y-3 mb-6">
              <Row label="File" value={fileInfo.fileName} />
              <Row label="Total Pages" value={String(summary.totalPages)} />
              <Row label="Copies" value={String(preferences.copies)} />
              <Row label="Sheets Required" value={String(summary.sheets)} />
              <Row label="Color Mode" value={preferences.colorMode === "BW" ? "Black & White" : "Color"} />
              <Row label="Print Type" value={preferences.printType === "SINGLE" ? "Single Sided" : "Double Sided"} />
              <Row label="Paper Size" value={preferences.paperSize} />
              <div className="flex justify-between py-3 border-t text-xl font-bold">
                <span>Total Amount:</span>
                <span className="text-blue-600">₹{summary.amount}</span>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="font-semibold text-lg mb-4">Payment Method</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPaymentMethod("QR")}
                className={`p-4 border-2 rounded-lg transition-all ${paymentMethod === "QR" ? "border-blue-600 bg-blue-50" : "border-gray-300 hover:border-gray-400"}`}>
                <div className="text-2xl mb-2">📱</div>
                <div className="font-medium">UPI / QR Code</div>
                <div className="text-sm text-gray-600">Scan & Pay</div>
              </button>
              <button
                onClick={() => setPaymentMethod("CASH")}
                className={`p-4 border-2 rounded-lg transition-all ${paymentMethod === "CASH" ? "border-blue-600 bg-blue-50" : "border-gray-300 hover:border-gray-400"}`}>
                <div className="text-2xl mb-2">💵</div>
                <div className="font-medium">Cash</div>
                <div className="text-sm text-gray-600">Pay at counter</div>
              </button>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Payment will be verified by the admin at the print room.
              Your job will be printed after verification.
            </p>
          </div>

          <Button
            onClick={handlePayment}
            className="w-full"
            size="lg"
            disabled={loading}
          >
            {loading ? "Submitting..." : `Confirm & Pay ₹${summary.amount}`}
          </Button>
        </div>
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 border-b last:border-0">
      <span className="text-gray-600">{label}:</span>
      <span className="font-medium truncate max-w-[60%] text-right">{value}</span>
    </div>
  );
}
