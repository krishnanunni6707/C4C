/**
 * Unit tests for Admin Job Detail components & transitions.
 */

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderToString } from "react-dom/server";
import StatusChip from "@/components/admin/job/StatusChip";
import JobHeader from "@/components/admin/job/JobHeader";
import StudentCard from "@/components/admin/job/StudentCard";
import PrintSettingsCard from "@/components/admin/job/PrintSettingsCard";
import PaymentCard from "@/components/admin/job/PaymentCard";
import JobTimeline from "@/components/admin/job/JobTimeline";
import JobActionBar from "@/components/admin/job/JobActionBar";
import CancelDialog from "@/components/admin/job/CancelDialog";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/queue/job-1",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("Admin Job Detail Components Unit Tests", () => {
  describe("StatusChip", () => {
    it("renders Printing status chip", () => {
      const html = renderToString(<StatusChip type="status" value="PRINTING" />);
      expect(html).toContain("Printing");
      expect(html).toContain("bg-indigo-50");
    });

    it("renders Color and Double sided chips", () => {
      const colorHtml = renderToString(<StatusChip type="colorMode" value="COLOR" />);
      expect(colorHtml).toContain("Color");
      expect(colorHtml).toContain("bg-emerald-50");

      const sidesHtml = renderToString(<StatusChip type="sides" value="DOUBLE" />);
      expect(sidesHtml).toContain("Double sided");
      expect(sidesHtml).toContain("bg-indigo-50");
    });

    it("renders Waiting, Ready, and Cancelled status chips", () => {
      const waitingHtml = renderToString(<StatusChip type="status" value="WAITING" />);
      expect(waitingHtml).toContain("Waiting");
      expect(waitingHtml).toContain("bg-amber-50");

      const readyHtml = renderToString(<StatusChip type="status" value="READY" />);
      expect(readyHtml).toContain("Ready");
      expect(readyHtml).toContain("bg-emerald-50");

      const cancelledHtml = renderToString(<StatusChip type="status" value="CANCELLED" />);
      expect(cancelledHtml).toContain("Cancelled");
      expect(cancelledHtml).toContain("bg-rose-50");
    });
  });

  describe("JobHeader", () => {
    it("renders back to queue link, token number, and chips", () => {
      const html = renderToString(
        <JobHeader
          tokenNumber="RP1042"
          status="PRINTING"
          colorMode="COLOR"
          printType="DOUBLE"
          createdAt={{ seconds: 1730111040 }}
        />
      );

      expect(html).toContain("Back to Queue");
      expect(html).toContain("/admin/queue");
      expect(html).toContain("RP1042");
      expect(html).toContain("Printing");
      expect(html).toContain("Color");
      expect(html).toContain("Double sided");
      expect(html).toContain("Created:");
    });
  });

  describe("StudentCard", () => {
    it("renders student name, admission number, and academic info", () => {
      const html = renderToString(
        <StudentCard
          studentId="stu-1"
          studentName="Aarav Nair"
          admissionNumber="CS21B042"
          department="Computer Science"
          semester={3}
        />
      );

      expect(html).toContain("Aarav Nair");
      expect(html).toContain("CS21B042");
      expect(html).toContain("Computer Science • Sem 3");
      expect(html).toContain("Edit");
      expect(html).toContain("/admin/students?focus=stu-1");
    });

    it("hides department/semester when missing", () => {
      const html = renderToString(
        <StudentCard
          studentId="stu-2"
          studentName="Meera Iyer"
          admissionNumber="EC21B010"
        />
      );

      expect(html).toContain("Meera Iyer");
      expect(html).toContain("EC21B010");
      expect(html).not.toContain("Sem");
    });
  });

  describe("PrintSettingsCard", () => {
    it("renders the 4 tiles: Printer, Color, Sides, Pages", () => {
      const html = renderToString(
        <PrintSettingsCard
          selectedPrinter="A1"
          colorMode="COLOR"
          printType="DOUBLE"
          totalPages={24}
          copies={2}
        />
      );

      expect(html).toContain("Print Settings");
      expect(html).toContain("A1");
      expect(html).toContain("Color");
      expect(html).toContain("Double sided");
      expect(html).toContain("24 × 2");
    });

    it("shows 'Not selected' when no printer is connected", () => {
      const html = renderToString(
        <PrintSettingsCard
          selectedPrinter={null}
          colorMode="BW"
          printType="SINGLE"
          totalPages={5}
          copies={1}
        />
      );

      expect(html).toContain("Not selected");
      expect(html).toContain("Black &amp; White");
      expect(html).toContain("Single sided");
      expect(html).toContain("5 × 1");
    });
  });

  describe("PaymentCard", () => {
    it("renders formatted rupee amount, paid status pill, and via method", () => {
      const html = renderToString(
        <PaymentCard
          jobId="job-1"
          amount={68}
          paymentStatus="PAID"
          paymentMethod="UPI"
          paidAt={{ seconds: 1730111040 }}
        />
      );

      expect(html).toContain("₹68.00");
      expect(html).toContain("Paid");
      expect(html).toContain("via UPI");
      expect(html).toContain("Mark unpaid");
    });

    it("renders Pending status pill and Verify payment link when unpaid", () => {
      const html = renderToString(
        <PaymentCard
          jobId="job-2"
          amount={45}
          paymentStatus="PENDING"
        />
      );

      expect(html).toContain("₹45.00");
      expect(html).toContain("Pending");
      expect(html).toContain("Verify payment");
    });
  });

  describe("JobTimeline", () => {
    it("renders stepper with Created, Paid, Printing, Ready, Collected steps", () => {
      const html = renderToString(
        <JobTimeline
          jobId="job-1"
          status="PRINTING"
          paymentStatus="PAID"
          studentName="Aarav Nair"
          createdAt={{ seconds: 1730111040 }}
          startedAt={{ seconds: 1730111160 }}
        />
      );

      expect(html).toContain("Job Timeline");
      expect(html).toContain("Created");
      expect(html).toContain("Paid");
      expect(html).toContain("Printing");
      expect(html).toContain("Ready");
      expect(html).toContain("Collected");
    });

    it("renders Cancelled step and stops when job is CANCELLED", () => {
      const html = renderToString(
        <JobTimeline
          jobId="job-c"
          status="CANCELLED"
          paymentStatus="PAID"
          studentName="Dev Patel"
          createdAt={{ seconds: 1730111040 }}
          cancelledAt={{ seconds: 1730111500 }}
        />
      );

      expect(html).toContain("Created");
      expect(html).toContain("Cancelled");
      expect(html).not.toContain("Collected");
    });
  });

  describe("JobActionBar transition rules", () => {
    const dummyGetBase64 = async () => "dummy";
    const dummyPrintFile = async () => ({ success: true });

    it("enables Print only when WAITING and PAID with online daemon", () => {
      const activeHtml = renderToString(
        <JobActionBar
          jobId="job-1"
          tokenNumber="RP1042"
          status="WAITING"
          paymentStatus="PAID"
          copies={1}
          printType="SINGLE"
          connectionStatus="connected"
          printers={["A1"]}
          targetPrinter="A1"
          setTargetPrinter={vi.fn()}
          reconnectDaemon={vi.fn()}
          getBase64File={dummyGetBase64}
          printFile={dummyPrintFile}
          onActionSuccess={vi.fn()}
        />
      );

      expect(activeHtml).toContain("action-btn-print");
      expect(activeHtml).not.toContain("title=\"Payment pending");

      // When UNPAID, print button contains disabled tooltip
      const unpaidHtml = renderToString(
        <JobActionBar
          jobId="job-1"
          tokenNumber="RP1042"
          status="WAITING"
          paymentStatus="PENDING"
          copies={1}
          printType="SINGLE"
          connectionStatus="connected"
          printers={["A1"]}
          targetPrinter="A1"
          setTargetPrinter={vi.fn()}
          reconnectDaemon={vi.fn()}
          getBase64File={dummyGetBase64}
          printFile={dummyPrintFile}
          onActionSuccess={vi.fn()}
        />
      );

      expect(unpaidHtml).toContain("Payment pending");
    });

    it("enables Mark Ready only when PRINTING", () => {
      const printingHtml = renderToString(
        <JobActionBar
          jobId="job-1"
          tokenNumber="RP1042"
          status="PRINTING"
          paymentStatus="PAID"
          copies={1}
          printType="SINGLE"
          connectionStatus="connected"
          printers={["A1"]}
          targetPrinter="A1"
          setTargetPrinter={vi.fn()}
          reconnectDaemon={vi.fn()}
          getBase64File={dummyGetBase64}
          printFile={dummyPrintFile}
          onActionSuccess={vi.fn()}
        />
      );

      expect(printingHtml).toContain("Mark Ready");

      const waitingHtml = renderToString(
        <JobActionBar
          jobId="job-1"
          tokenNumber="RP1042"
          status="WAITING"
          paymentStatus="PAID"
          copies={1}
          printType="SINGLE"
          connectionStatus="connected"
          printers={["A1"]}
          targetPrinter="A1"
          setTargetPrinter={vi.fn()}
          reconnectDaemon={vi.fn()}
          getBase64File={dummyGetBase64}
          printFile={dummyPrintFile}
          onActionSuccess={vi.fn()}
        />
      );

      expect(waitingHtml).toContain("Start printing first");
    });

    it("renders terminal banner when status is COLLECTED or CANCELLED", () => {
      const collectedHtml = renderToString(
        <JobActionBar
          jobId="job-1"
          tokenNumber="RP1042"
          status="COLLECTED"
          paymentStatus="PAID"
          copies={1}
          printType="SINGLE"
          connectionStatus="connected"
          printers={["A1"]}
          targetPrinter="A1"
          setTargetPrinter={vi.fn()}
          reconnectDaemon={vi.fn()}
          getBase64File={dummyGetBase64}
          printFile={dummyPrintFile}
          onActionSuccess={vi.fn()}
        />
      );

      expect(collectedHtml).toContain("This job is <span class=\"font-bold uppercase\">COLLECTED</span>");
    });
  });

  describe("CancelDialog", () => {
    it("renders cancel dialog with reason selection", () => {
      const html = renderToString(
        <CancelDialog
          jobId="job-1"
          tokenNumber="RP1042"
          isOpen={true}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />
      );

      expect(html).toContain("Cancel Print Job #RP1042?");
      expect(html).toContain("Paper jam or physical printer malfunction");
      expect(html).toContain("Cancel Job");
    });
  });
});
