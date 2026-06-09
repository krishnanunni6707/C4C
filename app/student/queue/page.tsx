import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getPrintJobsByStudent } from "@/lib/firestore/print-jobs";
import { FirestorePrintJob } from "@/lib/firebase/collections";
import Link from "next/link";

export default async function QueuePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const printJobs: FirestorePrintJob[] = await getPrintJobsByStudent(
    session.user.id
  );

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "WAITING":  return "bg-yellow-100 text-yellow-800";
      case "PRINTING": return "bg-blue-100 text-blue-800";
      case "READY":    return "bg-green-100 text-green-800";
      case "COLLECTED":return "bg-gray-100 text-gray-800";
      default:         return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "WAITING":  return "Waiting";
      case "PRINTING": return "Printing";
      case "READY":    return "Ready for Pickup";
      case "COLLECTED":return "Collected";
      default:         return status;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Smart Campus Printing</h1>
            <Link href="/dashboard" className="text-blue-600 hover:underline">
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-2">Print Queue</h2>
          <p className="text-gray-600 mb-8">Track your print jobs</p>

          {printJobs.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <div className="text-5xl mb-4">📄</div>
              <h3 className="text-xl font-semibold mb-2">No Print Jobs</h3>
              <p className="text-gray-600 mb-6">
                You haven&apos;t submitted any print jobs yet
              </p>
              <Link
                href="/student/upload"
                className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
              >
                Upload Document
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {printJobs.map((job: FirestorePrintJob) => (
                <div
                  key={job.id}
                  className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-2xl font-bold">{job.tokenNumber}</h3>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(job.status)}`}
                        >
                          {getStatusText(job.status)}
                        </span>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-600">File:</span>
                          <span className="ml-2 font-medium">{job.fileName}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Color:</span>
                          <span className="ml-2 font-medium">{job.colorMode}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Pages:</span>
                          <span className="ml-2 font-medium">{job.totalPages}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Copies:</span>
                          <span className="ml-2 font-medium">{job.copies}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Amount:</span>
                          <span className="ml-2 font-medium">₹{job.amount}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Submitted:</span>
                          <span className="ml-2 font-medium">
                            {formatDate(job.createdAt)}
                          </span>
                        </div>
                      </div>

                      {job.status === "READY" && (
                        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-green-800 font-medium">
                            ✓ Your print is ready. Please collect it from the print room.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <Link
                        href={`/student/token-slip/${job.id}`}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-center text-sm"
                      >
                        View Token Slip
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
