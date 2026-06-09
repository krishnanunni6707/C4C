"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

// ── sessionStorage + localStorage contract ───────────────────────────────────
//
//  KEY              STORAGE          WRITTEN BY       READ BY
//  uploadedFile     localStorage     upload page      preferences, payment
//  printPreferences localStorage     preferences      payment
//  printSummary     localStorage     preferences      payment
//
// localStorage survives page refresh; sessionStorage does not.
// ────────────────────────────────────────────────────────────────────────────

interface UploadedFile {
  fileName: string;
  fileUrl: string;
  fileSize: number;
  pages: number;
  fileType: string;
}

export default function PrintPreferencesPage() {
  const router = useRouter();
  const [fileInfo, setFileInfo] = useState<UploadedFile | null>(null);
  const [preferences, setPreferences] = useState({
    pageRange: "all" as "all" | "custom",
    customRange: "",
    copies: 1,
    colorMode: "BW" as "BW" | "COLOR",
    paperSize: "A4" as "A4",
    pagesPerSheet: 1,
    orientation: "portrait" as "portrait" | "landscape",
    printType: "SINGLE" as "SINGLE" | "DOUBLE",
  });

  useEffect(() => {
    // Try localStorage first (survives refresh), fallback to sessionStorage
    const stored =
      localStorage.getItem("uploadedFile") ||
      sessionStorage.getItem("uploadedFile");

    if (!stored) {
      router.push("/student/upload");
      return;
    }

    const parsed: UploadedFile = JSON.parse(stored);
    setFileInfo(parsed);
    // Migrate to localStorage if it was only in sessionStorage
    localStorage.setItem("uploadedFile", JSON.stringify(parsed));
  }, [router]);

  // ── Cost calculation ──────────────────────────────────────────────────────

  const calculatePrintDetails = () => {
    if (!fileInfo) return { totalPages: 0, sheets: 0, amount: 0 };

    let totalPages = fileInfo.pages;

    if (preferences.pageRange === "custom" && preferences.customRange.trim()) {
      totalPages = preferences.customRange
        .split(",")
        .reduce((acc, range) => {
          const trimmed = range.trim();
          if (trimmed.includes("-")) {
            const [start, end] = trimmed.split("-").map(Number);
            return acc + (end - start + 1);
          }
          return acc + 1;
        }, 0);
      totalPages = Math.max(1, totalPages);
    }

    const pagesPerPhysicalSheet =
      preferences.printType === "DOUBLE"
        ? preferences.pagesPerSheet * 2
        : preferences.pagesPerSheet;

    const sheets =
      Math.ceil(totalPages / pagesPerPhysicalSheet) * preferences.copies;

    const pricePerSheet = preferences.colorMode === "COLOR" ? 5 : 2;
    const amount = sheets * pricePerSheet;

    return { totalPages, sheets, amount };
  };

  const { totalPages, sheets, amount } = calculatePrintDetails();

  const handleContinue = () => {
    const prefs = {
      colorMode: preferences.colorMode,
      printType: preferences.printType,
      paperSize: preferences.paperSize,
      copies: preferences.copies,
      pagesPerSheet: preferences.pagesPerSheet,
      orientation: preferences.orientation,
    };
    const summary = { totalPages, sheets, amount };

    // Write to both storages so refresh works
    localStorage.setItem("printPreferences", JSON.stringify(prefs));
    localStorage.setItem("printSummary", JSON.stringify(summary));
    sessionStorage.setItem("printPreferences", JSON.stringify(prefs));
    sessionStorage.setItem("printSummary", JSON.stringify(summary));

    router.push("/student/payment");
  };

  if (!fileInfo) return null;

  const pricePerSheet = preferences.colorMode === "COLOR" ? 5 : 2;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Smart Campus Printing</h1>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-2">Print Preferences</h2>
          <p className="text-gray-600 mb-8">Configure your printing options</p>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* ── Left: Form ── */}
            <div className="lg:col-span-2 space-y-6">

              {/* File Info */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="font-semibold text-lg mb-4">Document</h3>
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl">📄</div>
                  <div>
                    <p className="font-medium">{fileInfo.fileName}</p>
                    <p className="text-sm text-gray-600">{fileInfo.pages} pages</p>
                  </div>
                </div>
              </div>

              {/* Pages to Print */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="font-semibold text-lg mb-4">Pages to Print</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="radio" name="pageRange"
                      checked={preferences.pageRange === "all"}
                      onChange={() => setPreferences({ ...preferences, pageRange: "all" })}
                      className="w-4 h-4" />
                    <span>All Pages</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="radio" name="pageRange"
                      checked={preferences.pageRange === "custom"}
                      onChange={() => setPreferences({ ...preferences, pageRange: "custom" })}
                      className="w-4 h-4" />
                    <span>Custom Range</span>
                  </label>
                  {preferences.pageRange === "custom" && (
                    <input type="text" placeholder="e.g. 1-5, 8, 11-13"
                      value={preferences.customRange}
                      onChange={(e) => setPreferences({ ...preferences, customRange: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  )}
                </div>
              </div>

              {/* Copies */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="font-semibold text-lg mb-4">Number of Copies</h3>
                <input type="number" min="1" max="100" value={preferences.copies}
                  onChange={(e) => setPreferences({ ...preferences, copies: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>

              {/* Color Mode */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="font-semibold text-lg mb-4">Color Mode</h3>
                <div className="grid grid-cols-2 gap-3">
                  {(["BW", "COLOR"] as const).map((mode) => (
                    <button key={mode}
                      onClick={() => setPreferences({ ...preferences, colorMode: mode })}
                      className={`p-4 border-2 rounded-lg transition-all ${preferences.colorMode === mode ? "border-blue-600 bg-blue-50" : "border-gray-300 hover:border-gray-400"}`}>
                      <div className="text-2xl mb-2">{mode === "BW" ? "⚫" : "🎨"}</div>
                      <div className="font-medium">{mode === "BW" ? "Black & White" : "Color"}</div>
                      <div className="text-sm text-gray-600">₹{mode === "COLOR" ? 5 : 2}/sheet</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Print Type */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="font-semibold text-lg mb-4">Print Type</h3>
                <div className="grid grid-cols-2 gap-3">
                  {(["SINGLE", "DOUBLE"] as const).map((type) => (
                    <button key={type}
                      onClick={() => setPreferences({ ...preferences, printType: type })}
                      className={`p-4 border-2 rounded-lg transition-all ${preferences.printType === type ? "border-blue-600 bg-blue-50" : "border-gray-300 hover:border-gray-400"}`}>
                      <div className="font-medium">{type === "SINGLE" ? "Single Sided" : "Double Sided"}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Paper Size — A4 only */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="font-semibold text-lg mb-4">Paper Size</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button className="p-4 border-2 border-blue-600 bg-blue-50 rounded-lg">
                    <div className="font-medium">A4</div>
                    <div className="text-sm text-gray-600">210 × 297 mm</div>
                  </button>
                </div>
              </div>

              {/* Pages Per Sheet */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="font-semibold text-lg mb-4">Pages Per Sheet</h3>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {[1, 2, 4, 6, 9, 16].map((num) => (
                    <button key={num}
                      onClick={() => setPreferences({ ...preferences, pagesPerSheet: num })}
                      className={`p-3 border-2 rounded-lg font-medium transition-all ${preferences.pagesPerSheet === num ? "border-blue-600 bg-blue-50" : "border-gray-300 hover:border-gray-400"}`}>
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Orientation */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="font-semibold text-lg mb-4">Orientation</h3>
                <div className="grid grid-cols-2 gap-3">
                  {(["portrait", "landscape"] as const).map((o) => (
                    <button key={o}
                      onClick={() => setPreferences({ ...preferences, orientation: o })}
                      className={`p-4 border-2 rounded-lg transition-all ${preferences.orientation === o ? "border-blue-600 bg-blue-50" : "border-gray-300 hover:border-gray-400"}`}>
                      <div className="text-2xl mb-2">{o === "portrait" ? "📄" : "📃"}</div>
                      <div className="font-medium capitalize">{o}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Right: Summary ── */}
            <div className="lg:col-span-1">
              <div className="sticky top-4">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="font-semibold text-lg mb-4">Print Summary</h3>
                  <div className="space-y-3 mb-6">
                    <SummaryRow label="Total Pages" value={String(totalPages)} />
                    <SummaryRow label="Pages/Sheet" value={String(preferences.pagesPerSheet)} />
                    <SummaryRow label="Print Type" value={preferences.printType === "SINGLE" ? "Single Sided" : "Double Sided"} />
                    <SummaryRow label="Sheets Required" value={String(sheets)} />
                    <SummaryRow label="Price/Sheet" value={`₹${pricePerSheet}`} />
                    <div className="flex justify-between py-3 border-t">
                      <span className="text-gray-600 font-medium">Total Amount</span>
                      <span className="font-bold text-2xl text-blue-600">₹{amount}</span>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 mb-6 text-sm space-y-2">
                    <SummaryRow label="Color" value={preferences.colorMode === "BW" ? "Black & White" : "Color"} />
                    <SummaryRow label="Paper" value={preferences.paperSize} />
                    <SummaryRow label="Orientation" value={preferences.orientation} />
                    <SummaryRow label="Copies" value={String(preferences.copies)} />
                  </div>

                  <Button onClick={handleContinue} className="w-full" size="lg">
                    Continue to Payment →
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-gray-600 text-sm">{label}</span>
      <span className="font-semibold text-sm capitalize">{value}</span>
    </div>
  );
}
