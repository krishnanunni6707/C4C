import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getPrintJobById } from "@/lib/firestore/print-jobs";
import { PrintButton } from "@/components/PrintButton";
import Link from "next/link";

export default async function TokenSlipPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const printJob = await getPrintJobById(params.id);

  if (!printJob || printJob.studentId !== session.user.id) {
    redirect("/student");
  }

  const formatDate = (ts: unknown) => {
    const date =
      ts && typeof ts === "object" && "toDate" in ts
        ? (ts as { toDate: () => Date }).toDate()
        : new Date(ts as string);
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto p-8">
        {/* Print Button — hidden when actually printing */}
        <div className="mb-6 no-print flex gap-4">
          <PrintButton />
          <Link
            href="/student/queue"
            className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 inline-block"
          >
            View Queue
          </Link>
        </div>

        {/* Token Slip */}
        <div className="border-4 border-dashed border-gray-800 p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">Smart Campus Printing</h1>
            <p className="text-gray-600">Token Slip</p>
          </div>

          <div className="border-t-2 border-b-2 border-gray-800 py-6 mb-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Token Number</p>
              <p className="text-5xl font-bold">{printJob.tokenNumber}</p>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex justify-between border-b pb-2">
              <span className="font-semibold">Student Name:</span>
              <span>{printJob.studentName}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="font-semibold">Admission No:</span>
              <span>{printJob.admissionNumber}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="font-semibold">File Name:</span>
              <span>{printJob.fileName}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="font-semibold">Pages:</span>
              <span>
                {printJob.totalPages} pages × {printJob.copies} cop
                {printJob.copies === 1 ? "y" : "ies"}
              </span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="font-semibold">Color Mode:</span>
              <span>{printJob.colorMode === "BW" ? "Black & White" : "Color"}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="font-semibold">Print Type:</span>
              <span>{printJob.printType === "SINGLE" ? "Single Sided" : "Double Sided"}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="font-semibold">Amount Paid:</span>
              <span>₹{printJob.amount}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="font-semibold">Payment:</span>
              <span>
                {printJob.paymentMethod} —{" "}
                <span
                  className={
                    printJob.paymentStatus === "PAID"
                      ? "text-green-600 font-medium"
                      : "text-amber-600 font-medium"
                  }
                >
                  {printJob.paymentStatus}
                </span>
              </span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="font-semibold">Date &amp; Time:</span>
              <span>{formatDate(printJob.createdAt)}</span>
            </div>
          </div>

          <div className="text-center text-sm text-gray-600">
            <p>Please present this token slip at the printer location</p>
            <p className="mt-2">Thank you for using Smart Campus Printing!</p>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none; }
          body { margin: 0; padding: 20px; }
        }
      `}</style>
    </div>
  );
}
