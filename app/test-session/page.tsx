"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function TestSessionPage() {
  const [sessionData, setSessionData] = useState<any>(null);
  const [verificationData, setVerificationData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch NextAuth session
        const sessionRes = await fetch("/api/auth/session");
        const session = await sessionRes.json();
        setSessionData(session);

        // Fetch verification
        const verifyRes = await fetch("/api/auth/verify-session");
        const verify = await verifyRes.json();
        setVerificationData(verify);
      } catch (error) {
        console.error("Error fetching session:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading session data...</p>
        </div>
      </div>
    );
  }

  const hasUserId = !!sessionData?.user?.id;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Session Test Page</h1>
            <Link href="/dashboard" className="text-blue-600 hover:underline">
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Status Card */}
          <div
            className={`rounded-lg p-6 ${
              hasUserId
                ? "bg-green-50 border-2 border-green-500"
                : "bg-red-50 border-2 border-red-500"
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="text-4xl">{hasUserId ? "✅" : "❌"}</div>
              <div>
                <h2 className="text-2xl font-bold">
                  {hasUserId ? "Session is Valid" : "Session Missing User ID"}
                </h2>
                <p className={hasUserId ? "text-green-700" : "text-red-700"}>
                  {hasUserId
                    ? "Your session includes the user ID. Print jobs will work!"
                    : "Your session is missing the user ID. Please log out and log back in."}
                </p>
              </div>
            </div>

            {!hasUserId && (
              <div className="bg-white rounded-lg p-4 mt-4">
                <h3 className="font-semibold mb-2">How to Fix:</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Click "Log Out" in the navigation</li>
                  <li>Go to the login page</li>
                  <li>Log in again with your credentials</li>
                  <li>Return to this page to verify</li>
                </ol>
              </div>
            )}
          </div>

          {/* Verification Result */}
          {verificationData && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold mb-4">Verification Result</h3>
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Authenticated:</span>
                  <span className="font-medium">
                    {verificationData.authenticated ? "Yes" : "No"}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Has User ID:</span>
                  <span className="font-medium">
                    {verificationData.hasUserId ? "Yes ✅" : "No ❌"}
                  </span>
                </div>
                <div className="py-2">
                  <span className="text-gray-600">Message:</span>
                  <p className="font-medium mt-1">{verificationData.message}</p>
                </div>
              </div>
            </div>
          )}

          {/* Session Data */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold mb-4">Session Data</h3>
            {sessionData?.user ? (
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">User ID:</span>
                  <span className={`font-mono text-sm ${hasUserId ? "text-green-600" : "text-red-600"}`}>
                    {sessionData.user.id || "MISSING"}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Name:</span>
                  <span className="font-medium">{sessionData.user.name || "N/A"}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Email:</span>
                  <span className="font-medium">{sessionData.user.email || "N/A"}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Role:</span>
                  <span className="font-medium">{sessionData.user.role || "N/A"}</span>
                </div>
              </div>
            ) : (
              <p className="text-gray-600">Not logged in</p>
            )}
          </div>

          {/* Raw JSON */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold mb-4">Raw Session JSON</h3>
            <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-xs">
              {JSON.stringify(sessionData, null, 2)}
            </pre>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold mb-4">Actions</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
              >
                Refresh Page
              </button>
              {hasUserId ? (
                <Link
                  href="/student/upload"
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 text-center"
                >
                  Test Print Job Flow
                </Link>
              ) : (
                <a
                  href="/api/auth/signout"
                  className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 text-center"
                >
                  Log Out and Fix Session
                </a>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
