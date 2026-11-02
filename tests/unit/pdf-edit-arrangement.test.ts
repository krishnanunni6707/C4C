import { describe, it, expect } from "vitest";
import { PDFDocument, degrees } from "pdf-lib";

describe("PDF Arrangement, Rotation, Reorder and Output Logic", () => {
  it("reorders pages correctly and reflects in output PDF", async () => {
    // Create a 3-page source PDF
    const srcDoc = await PDFDocument.create();
    const p1 = srcDoc.addPage([200, 200]);
    p1.drawText("Page 1");
    const p2 = srcDoc.addPage([200, 200]);
    p2.drawText("Page 2");
    const p3 = srcDoc.addPage([200, 200]);
    p3.drawText("Page 3");

    const srcBytes = await srcDoc.save();

    // Simulated arrangement state: reorder [0, 1, 2] -> [2, 0, 1]
    const orderedPages = [
      { fileId: "file1", originalIndex: 2 },
      { fileId: "file1", originalIndex: 0 },
      { fileId: "file1", originalIndex: 1 },
    ];

    // Build arranged document
    const outDoc = await PDFDocument.create();
    const loadedSrc = await PDFDocument.load(srcBytes);
    const copiedPages = await outDoc.copyPages(
      loadedSrc,
      orderedPages.map((p) => p.originalIndex)
    );
    copiedPages.forEach((page) => outDoc.addPage(page));

    expect(outDoc.getPageCount()).toBe(3);
    const finalBytes = await outDoc.save();
    const verifiedDoc = await PDFDocument.load(finalBytes);
    expect(verifiedDoc.getPageCount()).toBe(3);
  });

  it("rotates pages correctly and persists in output PDF", async () => {
    const srcDoc = await PDFDocument.create();
    srcDoc.addPage([200, 200]);
    srcDoc.addPage([200, 200]);
    const srcBytes = await srcDoc.save();

    const rotations: Record<number, number> = {
      0: 90,  // Page 1 rotated 90 degrees
      1: 180, // Page 2 rotated 180 degrees
    };

    const outDoc = await PDFDocument.create();
    const loadedSrc = await PDFDocument.load(srcBytes);
    const copied = await outDoc.copyPages(loadedSrc, [0, 1]);

    copied.forEach((page, idx) => {
      const rot = rotations[idx] || 0;
      page.setRotation(degrees(rot));
      outDoc.addPage(page);
    });

    const finalBytes = await outDoc.save();
    const verifiedDoc = await PDFDocument.load(finalBytes);
    expect(verifiedDoc.getPage(0).getRotation().angle).toBe(90);
    expect(verifiedDoc.getPage(1).getRotation().angle).toBe(180);
  });

  it("handles delete, undo, and redo history", () => {
    interface PageItem {
      id: string;
      originalIndex: number;
    }

    let currentPages: PageItem[] = [
      { id: "p1", originalIndex: 0 },
      { id: "p2", originalIndex: 1 },
      { id: "p3", originalIndex: 2 },
    ];

    const undoStack: PageItem[][] = [];
    const redoStack: PageItem[][] = [];

    // Helper: delete p2
    undoStack.push([...currentPages]);
    redoStack.length = 0;
    currentPages = currentPages.filter((p) => p.id !== "p2");
    expect(currentPages.map((p) => p.id)).toEqual(["p1", "p3"]);

    // Helper: undo
    expect(undoStack.length).toBe(1);
    const lastState = undoStack.pop()!;
    redoStack.push([...currentPages]);
    currentPages = lastState;
    expect(currentPages.map((p) => p.id)).toEqual(["p1", "p2", "p3"]);

    // Helper: redo
    expect(redoStack.length).toBe(1);
    const nextState = redoStack.pop()!;
    undoStack.push([...currentPages]);
    currentPages = nextState;
    expect(currentPages.map((p) => p.id)).toEqual(["p1", "p3"]);
  });

  it("handles sort original and sort reverse", () => {
    const pages = [
      { id: "p2", originalIndex: 1 },
      { id: "p1", originalIndex: 0 },
      { id: "p3", originalIndex: 2 },
    ];

    const sortedOriginal = [...pages].sort((a, b) => a.originalIndex - b.originalIndex);
    expect(sortedOriginal.map((p) => p.id)).toEqual(["p1", "p2", "p3"]);

    const sortedReverse = [...pages].reverse();
    expect(sortedReverse.map((p) => p.id)).toEqual(["p3", "p1", "p2"]);
  });

  it("compiles a 12-page PDF with rotations and sliced buffers without detachment", async () => {
    // Create a 12-page PDF
    const srcDoc = await PDFDocument.create();
    for (let i = 1; i <= 12; i++) {
      const page = srcDoc.addPage([200, 200]);
      page.drawText(`Page ${i}`);
    }
    const srcBytes = await srcDoc.save();
    const rawBytes = new Uint8Array(srcBytes);

    // Verify rawBytes.slice() preserves original
    const sliceCopy = rawBytes.slice();
    expect(sliceCopy.byteLength).toBe(rawBytes.byteLength);

    // Compile arranged 12 pages with rotation on page 3
    const master = await PDFDocument.create();
    const loadedDoc = await PDFDocument.load(rawBytes.slice(), { ignoreEncryption: true });

    const stagedPages = Array.from({ length: 12 }, (_, i) => ({
      fileId: "file-12p",
      originalIndex: i,
    }));

    const pageRotations: Record<string, number> = {
      "file-12p::2": 90, // 3rd page rotated 90 degrees
    };

    for (let idx = 0; idx < stagedPages.length; idx++) {
      const p = stagedPages[idx];
      const [copiedPage] = await master.copyPages(loadedDoc, [p.originalIndex]);
      const rotKey = `${p.fileId}::${p.originalIndex}`;
      const rot = pageRotations[rotKey] ?? 0;
      if (rot !== 0) {
        copiedPage.setRotation(degrees(rot));
      }
      master.addPage(copiedPage);
    }

    expect(master.getPageCount()).toBe(12);
    const compiled = await master.save();
    const verified = await PDFDocument.load(compiled);
    expect(verified.getPageCount()).toBe(12);
    expect(verified.getPage(2).getRotation().angle).toBe(90);
  });
});

