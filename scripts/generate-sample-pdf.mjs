import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import * as fs from "fs";
import * as path from "path";

async function generateSamplePdf() {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const topics = [
    { title: "Operating Systems", subtitle: "Lecture Notes\nDepartment of Computer Science\n2026", isCover: true },
    { title: "1. Introduction", subtitle: "What is an Operating System?\nAn operating system (OS) is system software that manages computer hardware, software resources, and provides common services for computer programs." },
    { title: "2. Process Management", subtitle: "Processes and Threads\nA process is an instance of a computer program that is being executed. It contains the program code and its current activity." },
    { title: "3. Memory Management", subtitle: "Virtual Memory & Paging\nMemory management is the functionality of an operating system which handles or oversees primary memory." },
    { title: "4. Memory Management", subtitle: "Page Replacement Algorithms\nFIFO, LRU, Optimal Page Replacement." },
    { title: "5. File Systems", subtitle: "Directories and File Allocation\nA file system controls how data is stored and retrieved." },
    {
      title: "7. Deadlocks",
      isDeadlockPage: true,
      subtitle: `7.1  Introduction\nA deadlock is a situation where a set of processes are blocked because each process is holding a resource and waiting for another resource held by another process in the set.\n\n7.2  Conditions for Deadlock\nDeadlock can occur only if the following four conditions hold simultaneously:\n  1. Mutual exclusion\n  2. Hold and wait\n  3. No preemption\n  4. Circular wait\n\n7.3  Resource Allocation Graph`
    },
    { title: "8. Scheduling", subtitle: "CPU Scheduling Algorithms: FCFS, SJF, Priority, Round Robin.\nDispatcher and context switching latency." },
    { title: "9. Memory Management", subtitle: "Segmentation and Paging Tables in modern microarchitectures." },
    { title: "10. File Systems", subtitle: "File system mounting, virtual file systems, journaling and inode structures." },
    { title: "11. Memory Management", subtitle: "Address translation and Translation Lookaside Buffer (TLB) operations." },
    { title: "12. Memory Management", subtitle: "Kernel memory allocation: buddy system and slab allocators." },
    { title: "13. I/O Systems", subtitle: "Polling, interrupts, and Direct Memory Access (DMA) controllers." },
    { title: "14. Scheduling", subtitle: "Multi-level feedback queues and real-time scheduling constraints." },
    { title: "15. Deadlocks", subtitle: "Resource Allocation Graphs with multiple instances per resource type." },
    { title: "16. Security", subtitle: "Access control matrices, role-based access control, cryptographic hashing." },
    { title: "17. Virtual Memory", subtitle: "Copy-on-write mechanisms, memory-mapped files, page fault handling." },
    { title: "18. Distributed", subtitle: "Remote Procedure Calls (RPC), distributed locking, and clock synchronization." },
    { title: "19. I/O Systems", subtitle: "Block devices vs character devices, stream buffering, device drivers." },
    { title: "20. Virtual Memory", subtitle: "Thrashing prevention, working-set model, and page-fault frequency." },
    { title: "21. Memory Management", subtitle: "Shared memory IPC and page table isolation techniques." },
    { title: "22. Scheduling", subtitle: "Completely Fair Scheduler (CFS) and thread affinity." },
    { title: "23. Deadlocks", subtitle: "Banker's Algorithm safety and resource-request state validation." },
    { title: "24. Conclusion", subtitle: "Review of key operating system design principles, performance trade-offs, and final notes." },
  ];

  for (let i = 0; i < topics.length; i++) {
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const t = topics[i];

    if (t.isCover) {
      page.drawText(t.title, {
        x: 140,
        y: 500,
        size: 28,
        font: boldFont,
        color: rgb(0.06, 0.09, 0.16),
      });
      page.drawText("Lecture Notes", {
        x: 230,
        y: 440,
        size: 14,
        font: font,
        color: rgb(0.3, 0.35, 0.45),
      });
      page.drawText("Department of Computer Science\n2026", {
        x: 180,
        y: 350,
        size: 12,
        font: font,
        color: rgb(0.4, 0.45, 0.55),
        lineHeight: 18,
      });
      page.drawText(`${i + 1}`, {
        x: 290,
        y: 40,
        size: 10,
        font: font,
        color: rgb(0.5, 0.55, 0.65),
      });
      continue;
    }

    // Header
    page.drawText("Operating Systems", {
      x: 50,
      y: 780,
      size: 20,
      font: boldFont,
      color: rgb(0.06, 0.09, 0.16),
    });

    page.drawText(t.title, {
      x: 50,
      y: 745,
      size: 14,
      font: boldFont,
      color: rgb(0.2, 0.25, 0.7),
    });

    page.drawText(t.subtitle, {
      x: 50,
      y: 700,
      size: 11,
      font: font,
      color: rgb(0.3, 0.35, 0.45),
      lineHeight: 18,
      maxWidth: 495,
    });

    if (t.isDeadlockPage) {
      // Draw Resource Allocation Graph diagram matching screenshot!
      // Screenshot shows R1, R2, R3 squares and P1, P2, P3 circles with arrows
      const startY = 320;
      // Draw P1, P2, P3 circles
      page.drawCircle({ x: 180, y: startY + 60, size: 18, color: rgb(0.95, 0.97, 1), borderColor: rgb(0.25, 0.35, 0.8), borderWidth: 1.5 });
      page.drawText("P1", { x: 174, y: startY + 56, size: 10, font: boldFont, color: rgb(0.2, 0.25, 0.7) });

      page.drawCircle({ x: 280, y: startY + 60, size: 18, color: rgb(0.95, 0.97, 1), borderColor: rgb(0.25, 0.35, 0.8), borderWidth: 1.5 });
      page.drawText("P2", { x: 274, y: startY + 56, size: 10, font: boldFont, color: rgb(0.2, 0.25, 0.7) });

      page.drawCircle({ x: 380, y: startY + 60, size: 18, color: rgb(0.95, 0.97, 1), borderColor: rgb(0.25, 0.35, 0.8), borderWidth: 1.5 });
      page.drawText("P3", { x: 374, y: startY + 56, size: 10, font: boldFont, color: rgb(0.2, 0.25, 0.7) });

      // Draw R1, R2, R3 squares
      page.drawRectangle({ x: 165, y: startY - 20, width: 30, height: 30, color: rgb(0.95, 0.97, 1), borderColor: rgb(0.25, 0.35, 0.8), borderWidth: 1.5 });
      page.drawText("R1", { x: 173, y: startY - 12, size: 10, font: boldFont, color: rgb(0.2, 0.25, 0.7) });

      page.drawRectangle({ x: 265, y: startY - 20, width: 30, height: 30, color: rgb(0.95, 0.97, 1), borderColor: rgb(0.25, 0.35, 0.8), borderWidth: 1.5 });
      page.drawText("R2", { x: 273, y: startY - 12, size: 10, font: boldFont, color: rgb(0.2, 0.25, 0.7) });

      page.drawRectangle({ x: 365, y: startY - 20, width: 30, height: 30, color: rgb(0.95, 0.97, 1), borderColor: rgb(0.25, 0.35, 0.8), borderWidth: 1.5 });
      page.drawText("R3", { x: 373, y: startY - 12, size: 10, font: boldFont, color: rgb(0.2, 0.25, 0.7) });

      // Caption
      page.drawText("Figure 7.1: Resource Allocation Graph", {
        x: 200,
        y: startY - 50,
        size: 9,
        font: font,
        color: rgb(0.4, 0.45, 0.6),
      });
    }

    // Footer divider and page number
    page.drawLine({
      start: { x: 50, y: 70 },
      end: { x: 545, y: 70 },
      thickness: 0.5,
      color: rgb(0.85, 0.88, 0.92),
    });

    page.drawText("Operating Systems - Lecture Notes", {
      x: 50,
      y: 50,
      size: 8,
      font: font,
      color: rgb(0.5, 0.55, 0.65),
    });

    page.drawText(`${i + 1}`, {
      x: 535,
      y: 50,
      size: 8,
      font: font,
      color: rgb(0.5, 0.55, 0.65),
    });
  }

  const pdfBytes = await pdfDoc.save();
  const outputPath = path.join(process.cwd(), "public", "Operating_Systems_Notes.pdf");
  fs.writeFileSync(outputPath, pdfBytes);
  console.log(`Generated sample PDF with ${topics.length} pages at ${outputPath}`);
}

generateSamplePdf();
