import { describe, it, expect, vi, beforeEach } from "vitest";
import { PDFDocument } from "pdf-lib";
import { POST as uploadPost } from "@/app/api/upload/route";
import { sanitizeFileName } from "@/lib/upload/validate";

// Mock next-auth
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

// Mock firestore uploads & settings
vi.mock("@/lib/firestore/uploads", () => ({
  createUploadRecord: vi.fn().mockImplementation(async (data) => ({
    id: "upload_mock_123",
    ...data,
  })),
}));

vi.mock("@/lib/firestore/settings", () => ({
  getSettings: vi.fn().mockResolvedValue({
    maxFileSizeMB: 15,
    maxPagesPerJob: 200,
  }),
}));

// Mock cloudinary upload_stream
vi.mock("cloudinary", () => ({
  v2: {
    config: vi.fn(),
    uploader: {
      upload_stream: vi.fn().mockImplementation((opts, callback) => {
        const stream = {
          end: (buffer: Buffer) => {
            callback(null, {
              public_id: opts.public_id || "mock_public_id",
              secure_url: `https://res.cloudinary.com/test/raw/upload/${opts.public_id}.pdf`,
              bytes: buffer.length,
            });
          },
        };
        return stream;
      }),
    },
  },
}));

import { getServerSession } from "next-auth";

describe("Upload Route Hardening (P-03)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = "demo-cloud";
    process.env.CLOUDINARY_API_KEY = "123456789";
    process.env.CLOUDINARY_API_SECRET = "secret987654";
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "student-456", name: "Student Bob", role: "STUDENT" },
    } as any);
  });

  describe("sanitizeFileName", () => {
    it("strips path traversal characters and normalizes file name", () => {
      const sanitized = sanitizeFileName("../../../etc/passwd.pdf");
      expect(sanitized).toBe("passwd.pdf");
      expect(sanitized).not.toContain("..");
      expect(sanitized).not.toContain("/");
    });

    it("replaces special characters and spaces with underscores", () => {
      const sanitized = sanitizeFileName("my thesis (final) [2026] #1.pdf");
      expect(sanitized).toBe("my_thesis_final_2026_1.pdf");
    });
  });

  describe("POST /api/upload validation", () => {
    it("counts exact pages for a valid multi-page PDF", async () => {
      // Create a 3-page PDF in memory
      const pdf = await PDFDocument.create();
      pdf.addPage();
      pdf.addPage();
      pdf.addPage();
      const pdfBytes = await pdf.save();

      const blob = new Blob([Buffer.from(pdfBytes)], { type: "application/pdf" });
      const formData = new FormData();
      formData.append("file", blob, "three_pages.pdf");

      const req = new Request("http://localhost/api/upload", {
        method: "POST",
        body: formData,
      });

      const res = await uploadPost(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.pages).toBe(3);
      expect(json.uploadId).toBe("upload_mock_123");
    });

    it("rejects renamed .exe as .pdf via magic bytes check", async () => {
      // Windows PE executable header: MZ (0x4D, 0x5A)
      const fakePdfBytes = Buffer.from([
        0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00,
      ]);
      const blob = new Blob([fakePdfBytes], { type: "application/pdf" });
      const formData = new FormData();
      formData.append("file", blob, "malware.pdf");

      const req = new Request("http://localhost/api/upload", {
        method: "POST",
        body: formData,
      });

      const res = await uploadPost(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/File content does not match expected format for \.pdf/);
    });

    it("rejects corrupt PDF file", async () => {
      // Valid %PDF- header but corrupt trailer/structure
      const corruptPdfBytes = Buffer.from("%PDF-1.4\nCorrupt bytes that do not form a valid PDF");
      const blob = new Blob([corruptPdfBytes], { type: "application/pdf" });
      const formData = new FormData();
      formData.append("file", blob, "corrupt.pdf");

      const req = new Request("http://localhost/api/upload", {
        method: "POST",
        body: formData,
      });

      const res = await uploadPost(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/Corrupted or unreadable PDF file/);
    });

    it("rejects encrypted PDF", async () => {
      // Mock PDFDocument.load throwing encrypted error
      const originalLoad = PDFDocument.load;
      PDFDocument.load = vi.fn().mockRejectedValueOnce(
        new Error("Password required to read encrypted document")
      );

      const pdf = await PDFDocument.create();
      pdf.addPage();
      const pdfBytes = await pdf.save();

      const blob = new Blob([Buffer.from(pdfBytes)], { type: "application/pdf" });
      const formData = new FormData();
      formData.append("file", blob, "encrypted.pdf");

      const req = new Request("http://localhost/api/upload", {
        method: "POST",
        body: formData,
      });

      const res = await uploadPost(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/Encrypted or password-protected PDFs are not supported/);

      PDFDocument.load = originalLoad;
    });

    it("rejects oversize file exceeding max limit", async () => {
      // Valid PDF header with 16MB of content (> 15MB limit)
      const oversizeBuffer = Buffer.alloc(16 * 1024 * 1024);
      oversizeBuffer.write("%PDF-1.4", 0);

      const blob = new Blob([oversizeBuffer], { type: "application/pdf" });
      const formData = new FormData();
      formData.append("file", blob, "large.pdf");

      const req = new Request("http://localhost/api/upload", {
        method: "POST",
        body: formData,
      });

      const res = await uploadPost(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/exceeds maximum allowed limit of 15 MB/);
    });

    it("rejects Office documents with 'save as PDF' guidance", async () => {
      const docxBytes = Buffer.from("dummy docx content");
      const blob = new Blob([docxBytes], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      const formData = new FormData();
      formData.append("file", blob, "Assignment.docx");

      const req = new Request("http://localhost/api/upload", {
        method: "POST",
        body: formData,
      });

      const res = await uploadPost(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/Office documents \(\.docx, \.doc, \.pptx\) are not accepted/);
      expect(json.error).toMatch(/save or export your document as a PDF/);
    });

    it("allows valid PNG images as 1 page", async () => {
      // Valid PNG signature: 89 50 4E 47 0D 0A 1A 0A
      const pngBytes = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      ]);
      const blob = new Blob([pngBytes], { type: "image/png" });
      const formData = new FormData();
      formData.append("file", blob, "photo.png");

      const req = new Request("http://localhost/api/upload", {
        method: "POST",
        body: formData,
      });

      const res = await uploadPost(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.pages).toBe(1);
    });
  });
});
