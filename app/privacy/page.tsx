import React from "react";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Notice | Smart Campus Printing",
  description: "Learn how your data is stored, processed, protected, and retained in the Smart Campus Printing system.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Navigation */}
        <div className="mb-8">
          <Link
            href="/student"
            className="inline-flex items-center text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            ← Back to Student Dashboard
          </Link>
        </div>

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold mb-4">
            🔒 Student Privacy Notice
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-3">
            Your Privacy & Data Protection
          </h1>
          <p className="text-base text-slate-600 leading-relaxed">
            We are committed to protecting your personal data and ensuring transparency. This notice explains what information is stored, why it is needed, who can access it, and our strict retention and deletion timelines.
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-6">
          {/* Section 1 */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-bold">1</span>
              What Information Is Stored
            </h2>
            <ul className="space-y-2.5 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <span className="font-semibold text-slate-800 min-w-[140px]">Account Profile:</span>
                <span>Your full name, admission number, department, semester, and optional email or phone.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-slate-800 min-w-[140px]">Uploaded Files:</span>
                <span>The PDF or image document uploaded for printing, along with its exact page count and file size.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-slate-800 min-w-[140px]">Print History:</span>
                <span>Print job settings (color/BW, single/duplex, copies), destination printer location, and token number.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-slate-800 min-w-[140px]">Payment Proof:</span>
                <span>Razorpay transaction reference IDs and amount paid in INR. (No credit card or banking PINs are ever stored).</span>
              </li>
            </ul>
          </div>

          {/* Section 2 */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm font-bold">2</span>
              Why It Is Stored
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-3">
              We operate under the principle of data minimisation. Your information is processed strictly for:
            </p>
            <ul className="list-disc list-inside text-sm text-slate-600 space-y-1.5 pl-2">
              <li>Authenticating your session and verifying your student identity.</li>
              <li>Calculating fair, exact print pricing based on verified page counts and paper usage.</li>
              <li>Routing print jobs securely to the designated hardware at your selected campus location.</li>
              <li>Notifying you via real-time alerts when your document is ready for collection.</li>
            </ul>
          </div>

          {/* Section 3 */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm font-bold">3</span>
              Who Can See Your Data
            </h2>
            <div className="space-y-3 text-sm text-slate-600">
              <p>
                <strong className="text-slate-800">Other Students:</strong> Other students <em>never</em> see your name, admission number, or document title. On public queue boards, jobs appear strictly anonymized with only token number and position.
              </p>
              <p>
                <strong className="text-slate-800">Printer Admins:</strong> Station operators only see jobs sent to their assigned location to print and hand over your document.
              </p>
              <p>
                <strong className="text-slate-800">Super Admins:</strong> Authorized platform administrators for auditing, billing reconciliation, and data erasure requests.
              </p>
            </div>
          </div>

          {/* Section 4 */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-sm font-bold">4</span>
              Retention & Automated Deletion
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-xl font-bold text-slate-900 mb-1">7 Days</div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Print Files</div>
                <p className="text-xs text-slate-600">Document files are purged within 7 days, or immediately after you collect your printout.</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-xl font-bold text-slate-900 mb-1">30 Days</div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Notifications</div>
                <p className="text-xs text-slate-600">Notification messages and alerts are automatically wiped after 30 days.</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-xl font-bold text-slate-900 mb-1">1 Year</div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Job History</div>
                <p className="text-xs text-slate-600">Job logs older than 1 year are permanently anonymized—personal info is completely scrubbed.</p>
              </div>
            </div>
          </div>

          {/* Section 5 */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center text-sm font-bold">5</span>
              Your Rights (Right to be Forgotten)
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-4">
              Under our campus data privacy guidelines, you have the right to request permanent deletion of your account, past print jobs, and uploaded documents.
            </p>
            <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-100 text-sm text-purple-900">
              To request account or data erasure, contact a campus Super Administrator. Upon verification, all records and storage assets will be deleted.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-slate-400">
          Smart Campus Printing Platform &bull; Data Protection & Privacy Notice
        </div>
      </div>
    </main>
  );
}
