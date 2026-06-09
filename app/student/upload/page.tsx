"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

interface UploadedFileInfo {
  fileName: string;   // original human-readable name
  fileUrl: string;    // Cloudinary HTTPS URL
  fileSize: number;   // bytes
  pages: number;
  fileType: string;
}

export default function UploadPage() {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [fileDetails, setFileDetails] = useState<{
    name: string;
    size: string;
    type: string;
    pages: number;
  } | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const fileType = selectedFile.name.split(".").pop()?.toLowerCase() ?? "";
    const allowedTypes = ["pdf", "docx", "pptx"];

    if (!allowedTypes.includes(fileType)) {
      alert("Only PDF, DOCX, and PPTX files are allowed");
      return;
    }

    setUploading(true);
    setFileDetails(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Upload failed");
        return;
      }

      // ── Store everything the downstream pages need ──────────────────────────
      const fileInfo: UploadedFileInfo = {
        fileName: data.fileName,       // original name  e.g. "report.pdf"
        fileUrl: data.fileUrl,         // Cloudinary URL
        fileSize: data.fileSize,
        pages: data.pages,
        fileType: fileType.toUpperCase(),
      };

      // Write to BOTH storages — localStorage survives refresh
      const serialised = JSON.stringify(fileInfo);
      localStorage.setItem("uploadedFile", serialised);
      sessionStorage.setItem("uploadedFile", serialised);

      setFileDetails({
        name: data.fileName,
        size: (data.fileSize / 1024 / 1024).toFixed(2) + " MB",
        type: fileType.toUpperCase(),
        pages: data.pages,
      });
    } catch {
      alert("An error occurred during upload. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleContinue = () => {
    if (fileDetails) {
      router.push("/student/print-preferences");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Smart Campus Printing</h1>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-2">Upload Document</h2>
          <p className="text-gray-600 mb-8">
            Upload your document to get started with printing
          </p>

          <div className="bg-white rounded-lg shadow-md p-6 md:p-8">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 md:p-12 text-center">
              <div className="text-5xl mb-4">📄</div>
              <h3 className="text-lg font-semibold mb-2">Choose a file to upload</h3>
              <p className="text-gray-600 mb-6">Supported formats: PDF, DOCX, PPTX</p>

              <label className="cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.docx,.pptx"
                  onChange={handleFileChange}
                  disabled={uploading}
                />
                <span className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
                  {uploading ? "Uploading to cloud..." : "Select File"}
                </span>
              </label>
            </div>

            {fileDetails && (
              <div className="mt-8 p-6 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-start gap-4">
                  <div className="text-3xl">✓</div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg mb-3">File Uploaded Successfully</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">File Name:</span>
                        <span className="font-medium">{fileDetails.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">File Size:</span>
                        <span className="font-medium">{fileDetails.size}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">File Type:</span>
                        <span className="font-medium">{fileDetails.type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Pages:</span>
                        <span className="font-medium">{fileDetails.pages}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <Button onClick={handleContinue} className="w-full mt-6" size="lg">
                  Continue to Print Preferences →
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
