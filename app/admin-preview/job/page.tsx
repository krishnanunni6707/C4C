"use client";

import React, { useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AdminShell from "@/components/admin/overview/AdminShell";
import JobHeader from "@/components/admin/job/JobHeader";
import PdfPreviewCard from "@/components/admin/job/PdfPreviewCard";
import StudentCard from "@/components/admin/job/StudentCard";
import PrintSettingsCard from "@/components/admin/job/PrintSettingsCard";
import PaymentCard from "@/components/admin/job/PaymentCard";
import JobTimeline from "@/components/admin/job/JobTimeline";
import JobActionBar from "@/components/admin/job/JobActionBar";

function JobPreviewContent() {
  const searchParams = useSearchParams();
  const stateParam = searchParams.get("state") || "printing";

  const { job, student } = useMemo(() => {
    if (stateParam === "waiting_unpaid") {
      return {
        job: {
          id: "job-mock-2",
          tokenNumber: "RP1043",
          status: "WAITING",
          paymentStatus: "PENDING",
          colorMode: "COLOR",
          printType: "DOUBLE",
          totalPages: 12,
          copies: 1,
          amount: 45.0,
          paymentMethod: "UPI",
          fileName: "Lab_Record.docx",
          createdAt: { seconds: 1730111040 },
          studentId: "stu-2",
          studentName: "Meera Iyer",
          admissionNumber: "CS21B010",
        },
        student: {
          department: "Computer Science",
          semester: 3,
        },
      };
    }

    if (stateParam === "ready") {
      return {
        job: {
          id: "job-mock-3",
          tokenNumber: "RP1046",
          status: "READY",
          paymentStatus: "PAID",
          colorMode: "BW",
          printType: "SINGLE",
          totalPages: 10,
          copies: 1,
          amount: 15.0,
          paymentMethod: "UPI",
          fileName: "Notes.pdf",
          createdAt: { seconds: 1730111040 },
          startedAt: { seconds: 1730111160 },
          readyAt: { seconds: 1730111220 },
          studentId: "stu-3",
          studentName: "Dev Patel",
          admissionNumber: "EC21B044",
        },
        student: {
          department: "Electronics & Communication",
          semester: 5,
        },
      };
    }

    if (stateParam === "cancelled") {
      return {
        job: {
          id: "job-mock-4",
          tokenNumber: "RP1048",
          status: "CANCELLED",
          paymentStatus: "PAID",
          colorMode: "BW",
          printType: "SINGLE",
          totalPages: 15,
          copies: 1,
          amount: 22.5,
          paymentMethod: "UPI",
          fileName: "Project_Draft.pdf",
          createdAt: { seconds: 1730111040 },
          cancelledAt: { seconds: 1730111400 },
          studentId: "stu-4",
          studentName: "Rohan Deshpande",
          admissionNumber: "ME21B012",
        },
        student: {
          department: "Mechanical Engineering",
          semester: 4,
        },
      };
    }

    // Default: "printing" state exactly matching screenshot RP1042
    return {
      job: {
        id: "job-mock-1",
        tokenNumber: "RP1042",
        status: "PRINTING",
        paymentStatus: "PAID",
        colorMode: "COLOR",
        printType: "DOUBLE",
        totalPages: 24,
        copies: 2,
        amount: 68.0,
        paymentMethod: "UPI",
        fileName: "Operating_Systems_Notes.pdf",
        createdAt: { seconds: 1730111040 }, // Oct 28, 2025 10:24 AM
        startedAt: { seconds: 1730111160 }, // Oct 28, 2025 10:26 AM
        studentId: "stu-1",
        studentName: "Aarav Nair",
        admissionNumber: "CS21B042",
      },
      student: {
        department: "Computer Science",
        semester: 3,
      },
    };
  }, [stateParam]);

  const locations = [
    { id: "loc-1", name: "Main Print Room", address: "Central Library\nBlock A" },
    { id: "loc-2", name: "Library Print Hub", address: "Central Library 2nd Floor" },
    { id: "loc-3", name: "Engineering Block", address: "Block B Ground Floor" },
  ];

  return (
    <AdminShell
      adminName="Admin"
      adminRole="ADMIN"
      locations={locations}
      currentLocationId="loc-1"
      currentLocationName="Main Print Room"
      locationBuilding="Central Library\nBlock A"
      isSuperAdmin={false}
    >
      <div className="space-y-5 pb-6">
        {/* Header */}
        <JobHeader
          tokenNumber={job.tokenNumber}
          status={job.status}
          colorMode={job.colorMode}
          printType={job.printType}
          createdAt={job.createdAt}
        />

        {/* 2-Column Main Content */}
        <div className="flex flex-col lg:flex-row gap-5 items-start">
          {/* Left Column (~58%): Print Preview Card */}
          <div className="w-full lg:w-[58%] flex flex-col">
            <PdfPreviewCard
              jobId={job.id}
              fileName={job.fileName}
              totalPages={job.totalPages}
              className="w-full"
            />
          </div>

          {/* Right Column (~42%): Stacked Detail Cards */}
          <div className="w-full lg:w-[42%] flex flex-col gap-4">
            <StudentCard
              studentId={job.studentId}
              studentName={job.studentName}
              admissionNumber={job.admissionNumber}
              department={student.department}
              semester={student.semester}
            />

            <PrintSettingsCard
              selectedPrinter="A1"
              colorMode={job.colorMode}
              printType={job.printType}
              totalPages={job.totalPages}
              copies={job.copies}
            />

            <PaymentCard
              jobId={job.id}
              amount={job.amount}
              paymentStatus={job.paymentStatus}
              paymentMethod={job.paymentMethod}
              createdAt={job.createdAt}
            />

            <JobTimeline
              jobId={job.id}
              status={job.status}
              paymentStatus={job.paymentStatus}
              studentName={job.studentName}
              createdAt={job.createdAt}
              startedAt={job.startedAt}
              readyAt={job.readyAt}
              cancelledAt={job.cancelledAt}
            />
          </div>
        </div>

        {/* Bottom Action Bar */}
        <JobActionBar
          jobId={job.id}
          tokenNumber={job.tokenNumber}
          status={job.status}
          paymentStatus={job.paymentStatus}
          copies={job.copies}
          printType={job.printType}
          connectionStatus="connected"
          printers={["A1", "B1", "C1"]}
          targetPrinter="A1"
          setTargetPrinter={() => {}}
          reconnectDaemon={() => {}}
          getBase64File={async () => "mockBase64"}
          printFile={async () => ({ success: true })}
          onActionSuccess={() => {}}
        />
      </div>
    </AdminShell>
  );
}

export default function JobPreviewPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading preview…</div>}>
      <JobPreviewContent />
    </Suspense>
  );
}
