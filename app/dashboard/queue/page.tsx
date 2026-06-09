"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface PrintJob {
  id: string;
  tokenNumber: string;
  documentName: string;
  totalPages: number;
  sheetsRequired: number;
  status: string;
  queuePosition: number;
  printerLocation: string;
  totalAmount: number;
  createdAt: string;
}

export default function QueuePage() {
  const router = useRouter();
  const [printJobs, setPrintJobs] = useState<PrintJob[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = async () => {
    try {
      const response = await fetch("/api/print-jobs/user");
      const data = await response.json();
      
      if (response.ok) {
        setPrintJobs(data.printJobs);
      }
    } catch (error) {
      console.error("Failed to fetch jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    
    // Auto refresh every 10 seconds
    const interval = setInterval(fetchJobs, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "IN_QUEUE":
        return "bg-yellow-100 text-yellow-800";
      case "PRINTING":
        return "bg-blue-100 text-blue-800";
      case "COMPLETED":
        return "bg-green-100 text-green-800";
      case "COLLECTED":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "PENDING":
        return "Pending";
      case "IN_QUEUE":
        return "Waiting";
      case "PRINTING":
        return "Printing";
      case "COMPLETED":
        return "Ready for Pickup";
      case "COLLECTED":
        return "Collected";
      default:
        return status;
    }
  };

  const getEstimatedWaitTime = (queuePosition: number, status: string) => {
    if (status === "COMPLETED" || status === "COLLECTED") {
      return "N/A";
    }
    const minutes = queuePosition * 2;
    return `~${minutes} min`;
  };

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(date));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading queue...</p>
        </div>
      </div>
    );
  }

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
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-3xl font-bold mb-2">Print Queue</h2>
              <p className="text-gray-600">Track your print jobs (auto-refreshes every 10s)</p>
            </div>
          </div>

          {printJobs.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <div className="text-5xl mb-4">📄</div>
              <h3 className="text-xl font-semibold mb-2">No Print Jobs</h3>
              <p className="text-gray-600 mb-6">
                You haven't submitted any print jobs yet
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
              {printJobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                        <h3 className="text-2xl font-bold">{job.tokenNumber}</h3>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                            job.status
                          )}`}
                        >
                          {getStatusText(job.status)}
                        </span>
                      </div>

                      {/* Progress Indicator */}
                      <div className="mb-4">
                        <div className="flex items-center gap-2 text-sm">
                          <div className={`flex items-center gap-1 ${
                            ["IN_QUEUE", "PRINTING", "COMPLETED", "COLLECTED"].includes(job.status)
                              ? "text-blue-600 font-medium"
                              : "text-gray-400"
                          }`}>
                            <div className="w-3 h-3 rounded-full bg-current"></div>
                            <span>Queued</span>
                          </div>
                          <div className="flex-1 h-1 bg-gray-200">
                            <div className={`h-full ${
                              ["PRINTING", "COMPLETED", "COLLECTED"].includes(job.status)
                                ? "bg-blue-600"
                                : "bg-gray-200"
                            }`} style={{ width: "100%" }}></div>
                          </div>
                          <div className={`flex items-center gap-1 ${
                            ["PRINTING", "COMPLETED", "COLLECTED"].includes(job.status)
                              ? "text-blue-600 font-medium"
                              : "text-gray-400"
                          }`}>
                            <div className="w-3 h-3 rounded-full bg-current"></div>
                            <span>Printing</span>
                          </div>
                          <div className="flex-1 h-1 bg-gray-200">
                            <div className={`h-full ${
                              ["COMPLETED", "COLLECTED"].includes(job.status)
                                ? "bg-green-600"
                                : "bg-gray-200"
                            }`} style={{ width: "100%" }}></div>
                          </div>
                          <div className={`flex items-center gap-1 ${
                            ["COMPLETED", "COLLECTED"].includes(job.status)
                              ? "text-green-600 font-medium"
                              : "text-gray-400"
                          }`}>
                            <div className="w-3 h-3 rounded-full bg-current"></div>
                            <span>Ready</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-600">Document:</span>
                          <span className="ml-2 font-medium">{job.documentName}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Location:</span>
                          <span className="ml-2 font-medium">{job.printerLocation}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Queue Position:</span>
                          <span className="ml-2 font-medium">
                            {job.status === "COMPLETED" || job.status === "COLLECTED"
                              ? "N/A"
                              : job.queuePosition}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Wait Time:</span>
                          <span className="ml-2 font-medium">
                            {getEstimatedWaitTime(job.queuePosition, job.status)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Sheets:</span>
                          <span className="ml-2 font-medium">{job.sheetsRequired}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Submitted:</span>
                          <span className="ml-2 font-medium">{formatDate(job.createdAt)}</span>
                        </div>
                      </div>

                      {job.status === "COMPLETED" && (
                        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-green-800 font-medium">
                            ✓ Your print is ready. Please collect it from {job.printerLocation}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <Link
                        href={`/dashboard/token/${job.tokenNumber}`}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-center text-sm"
                      >
                        View Token
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
