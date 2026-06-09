"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import AdminHeader from "@/components/admin/AdminHeader";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Student {
  id: string;
  admissionNumber: string;
  name: string;
  department: string;
  semester: number;
  email?: string;
  phone?: string;
  role: "STUDENT" | "ADMIN";
  status: "ACTIVE" | "DISABLED";
  firstLogin: boolean;
  totalJobs: number;
  totalAmountSpent: number;
  createdAt: { _seconds?: number } | string | null;
}

interface ProfileData {
  user: Student;
  stats: { totalJobs: number; totalAmountSpent: number };
}

type Filter = "ALL" | "ACTIVE" | "DISABLED" | "FIRST_LOGIN";

interface AddForm {
  name: string;
  admissionNumber: string;
  department: string;
  semester: string;
  email: string;
  phone: string;
  password: string;
}

interface BulkResult {
  created: number;
  skipped: number;
  errors: string[];
}

const EMPTY_FORM: AddForm = {
  name: "",
  admissionNumber: "",
  department: "",
  semester: "1",
  email: "",
  phone: "",
  password: "",
};

// ── Date helper ───────────────────────────────────────────────────────────────

function formatDate(ts: Student["createdAt"]): string {
  if (!ts) return "—";
  let date: Date;
  if (typeof ts === "object" && ts !== null && "_seconds" in ts && ts._seconds) {
    date = new Date(ts._seconds * 1000);
  } else if (typeof ts === "string") {
    date = new Date(ts);
  } else {
    return "—";
  }
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(date);
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");

  // Add modal
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<AddForm>(EMPTY_FORM);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const [addedPassword, setAddedPassword] = useState<string | null>(null);

  // Profile modal
  const [profileId, setProfileId] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Reset password display
  const [resetMap, setResetMap] = useState<Record<string, string>>({});

  // Row busy
  const [busyId, setBusyId] = useState<string | null>(null);

  // Bulk import
  const csvRef = useRef<HTMLInputElement>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/students");
      if (res.ok) {
        const data = await res.json();
        setStudents(data.users ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  // ── Filter ────────────────────────────────────────────────────────────────

  const displayed = students.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.admissionNumber.toLowerCase().includes(q);
    const matchFilter =
      filter === "ALL" ||
      (filter === "ACTIVE" && s.status === "ACTIVE") ||
      (filter === "DISABLED" && s.status === "DISABLED") ||
      (filter === "FIRST_LOGIN" && s.firstLogin);
    return matchSearch && matchFilter;
  });

  const counts: Record<Filter, number> = {
    ALL: students.length,
    ACTIVE: students.filter((s) => s.status === "ACTIVE").length,
    DISABLED: students.filter((s) => s.status === "DISABLED").length,
    FIRST_LOGIN: students.filter((s) => s.firstLogin).length,
  };

  // ── Add student ───────────────────────────────────────────────────────────

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");
    setAddLoading(true);
    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...addForm,
          semester: parseInt(addForm.semester, 10),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error ?? "Failed to create student");
        return;
      }
      setAddedPassword(data.user?.tempPassword ?? addForm.password ?? null);
      await fetchStudents();
    } catch {
      setAddError("Network error — please try again");
    } finally {
      setAddLoading(false);
    }
  }

  function closeAdd() {
    setShowAdd(false);
    setAddForm(EMPTY_FORM);
    setAddError("");
    setAddedPassword(null);
  }

  // ── Status toggle ─────────────────────────────────────────────────────────

  async function toggleStatus(s: Student) {
    const newStatus = s.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    setBusyId(s.id);
    try {
      await fetch(`/api/admin/students/${s.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      await fetchStudents();
    } finally {
      setBusyId(null);
    }
  }

  // ── Reset password ────────────────────────────────────────────────────────

  async function resetPassword(s: Student) {
    setBusyId(s.id);
    try {
      const res = await fetch(`/api/admin/students/${s.id}/reset-password`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setResetMap((prev) => ({ ...prev, [s.id]: data.tempPassword }));
      }
    } finally {
      setBusyId(null);
    }
  }

  // ── Profile ───────────────────────────────────────────────────────────────

  async function openProfile(id: string) {
    setProfileId(id);
    setProfileData(null);
    setProfileLoading(true);
    try {
      const res = await fetch(`/api/admin/students/${id}`);
      if (res.ok) setProfileData(await res.json());
    } finally {
      setProfileLoading(false);
    }
  }

  // ── CSV Bulk Import ───────────────────────────────────────────────────────

  async function handleCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkLoading(true);
    setBulkResult(null);

    try {
      const text = await file.text();
      const lines = text.trim().split(/\r?\n/);

      // Skip header row if first line contains "admissionNumber" or "name"
      const firstLine = lines[0].toLowerCase();
      const dataLines =
        firstLine.includes("admissionnumber") || firstLine.includes("name")
          ? lines.slice(1)
          : lines;

      const rows = dataLines
        .filter((l) => l.trim())
        .map((line) => {
          const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
          return {
            admissionNumber: cols[0] ?? "",
            name: cols[1] ?? "",
            department: cols[2] ?? "",
            semester: parseInt(cols[3] ?? "1", 10) || 1,
          };
        });

      const res = await fetch("/api/admin/students/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rows),
      });

      const data = await res.json();
      setBulkResult({
        created: data.created ?? 0,
        skipped: data.skipped ?? 0,
        errors: data.errors ?? [],
      });
      await fetchStudents();
    } catch {
      setBulkResult({ created: 0, skipped: 0, errors: ["Failed to process CSV"] });
    } finally {
      setBulkLoading(false);
      if (csvRef.current) csvRef.current.value = "";
    }
  }

  // ── Filters config ────────────────────────────────────────────────────────

  const FILTERS: { label: string; value: Filter }[] = [
    { label: "All", value: "ALL" },
    { label: "Active", value: "ACTIVE" },
    { label: "Disabled", value: "DISABLED" },
    { label: "First Login Pending", value: "FIRST_LOGIN" },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-8">
      <AdminHeader title="Student Directory" subtitle={`${students.length} total`}>
        <button
          onClick={() => setShowAdd(true)}
          className="text-sm bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors font-medium"
        >
          ➕ Add Student
        </button>
        <label className="cursor-pointer">
          <span className={`text-sm border border-gray-300 bg-white text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors inline-block ${bulkLoading ? "opacity-50 cursor-not-allowed" : ""}`}>
            {bulkLoading ? "Importing…" : "📂 Bulk Import CSV"}
          </span>
          <input
            ref={csvRef}
            type="file"
            accept=".csv"
            className="hidden"
            disabled={bulkLoading}
            onChange={handleCSV}
          />
        </label>
      </AdminHeader>

      {/* CSV format hint */}
      <div className="mb-4 bg-gray-50 border border-gray-200 rounded-xl px-5 py-3">
        <p className="text-xs text-gray-500">
          <strong>CSV format:</strong>{" "}
          <code className="bg-white px-1 rounded">admissionNumber,name,department,semester</code>
          {" "}— header row optional, duplicates are skipped automatically.
        </p>
      </div>

      {/* Bulk import result */}
      {bulkResult && (
        <div className={`mb-4 rounded-xl px-5 py-4 border ${bulkResult.errors.length > 0 ? "bg-amber-50 border-amber-200" : "bg-green-50 border-green-200"}`}>
          <p className={`text-sm font-medium ${bulkResult.errors.length > 0 ? "text-amber-800" : "text-green-800"}`}>
            Import complete — {bulkResult.created} created, {bulkResult.skipped} skipped
          </p>
          {bulkResult.errors.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {bulkResult.errors.slice(0, 5).map((e, i) => (
                <li key={i} className="text-xs text-amber-700">{e}</li>
              ))}
              {bulkResult.errors.length > 5 && (
                <li className="text-xs text-amber-600">…and {bulkResult.errors.length - 5} more</li>
              )}
            </ul>
          )}
          <button onClick={() => setBulkResult(null)} className="mt-2 text-xs text-gray-400 hover:text-gray-600 underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name or admission number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white shadow-sm"
        />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 mb-6 w-fit flex-wrap">
        {FILTERS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              filter === value ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${filter === value ? "bg-gray-700 text-gray-200" : "bg-gray-100 text-gray-500"}`}>
              {counts[value]}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-16 text-center">
          <p className="text-gray-400">Loading…</p>
        </div>
      ) : displayed.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-16 text-center">
          <span className="text-5xl">👥</span>
          <p className="mt-4 text-gray-400 text-sm">No students found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-left">
                  {["Admission No", "Name", "Department", "Sem", "Status", "First Login", "Jobs", "Spent", "Temp PW", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {displayed.map((s) => {
                  const busy = busyId === s.id;
                  return (
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-bold text-gray-900 whitespace-nowrap">
                        {s.admissionNumber}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                        {s.name}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">
                        {s.department}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-center">
                        {s.semester}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {s.firstLogin ? (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Pending</span>
                        ) : (
                          <span className="text-xs text-gray-400">Done</span>
                        )}
                      </td>
                      {/* Total jobs */}
                      <td className="px-4 py-3 text-center font-semibold text-gray-900">
                        {s.totalJobs}
                      </td>
                      {/* Total amount spent */}
                      <td className="px-4 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">
                        {s.totalAmountSpent > 0 ? `₹${s.totalAmountSpent}` : "—"}
                      </td>
                      {/* Temp PW */}
                      <td className="px-4 py-3 font-mono text-xs">
                        {resetMap[s.id] ? (
                          <span className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-2 py-0.5 rounded">
                            {resetMap[s.id]}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 flex-wrap min-w-[180px]">
                          <button disabled={busy} onClick={() => openProfile(s.id)}
                            className="text-xs border border-gray-300 text-gray-600 px-2 py-1 rounded hover:bg-gray-50 disabled:opacity-50">
                            View
                          </button>
                          <button disabled={busy} onClick={() => resetPassword(s)}
                            className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:opacity-50">
                            {busy ? "…" : "Reset PW"}
                          </button>
                          {s.status === "ACTIVE" ? (
                            <button disabled={busy} onClick={() => toggleStatus(s)}
                              className="text-xs bg-orange-500 text-white px-2 py-1 rounded hover:bg-orange-600 disabled:opacity-50">
                              {busy ? "…" : "Disable"}
                            </button>
                          ) : (
                            <button disabled={busy} onClick={() => toggleStatus(s)}
                              className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 disabled:opacity-50">
                              {busy ? "…" : "Enable"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Add Student Modal ──────────────────────────────────────────────── */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="text-lg font-semibold text-gray-900">Add Student</h3>
              <button onClick={closeAdd} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            {addedPassword ? (
              <div className="px-6 py-8 text-center">
                <div className="text-4xl mb-4">✅</div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Student Created</h4>
                <p className="text-sm text-gray-500 mb-5">
                  Share this password with the student. They must change it on first login.
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-6 py-4 mb-6">
                  <p className="text-xs text-amber-600 mb-1 font-medium uppercase tracking-wide">Password</p>
                  <p className="text-2xl font-mono font-bold text-amber-900 tracking-widest">{addedPassword}</p>
                </div>
                <button onClick={closeAdd}
                  className="w-full bg-gray-900 text-white py-2.5 rounded-lg font-medium hover:bg-gray-700 transition-colors">
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleAdd} className="px-6 py-5 space-y-4">
                {addError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{addError}</div>
                )}
                <FormField label="Full Name *" required value={addForm.name}
                  onChange={(v) => setAddForm((f) => ({ ...f, name: v }))} placeholder="e.g. Gayathri M Nair" />
                <FormField label="Admission Number *" required value={addForm.admissionNumber}
                  onChange={(v) => setAddForm((f) => ({ ...f, admissionNumber: v }))} placeholder="e.g. S2024CS001" />
                <FormField label="Department *" required value={addForm.department}
                  onChange={(v) => setAddForm((f) => ({ ...f, department: v }))} placeholder="e.g. Computer Science" />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Semester *</label>
                    <select required value={addForm.semester}
                      onChange={(e) => setAddForm((f) => ({ ...f, semester: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                        <option key={n} value={n}>Sem {n}</option>
                      ))}
                    </select>
                  </div>
                  <FormField label="Phone" type="tel" value={addForm.phone}
                    onChange={(v) => setAddForm((f) => ({ ...f, phone: v }))} placeholder="Optional" />
                </div>
                <FormField label="Email" type="email" value={addForm.email}
                  onChange={(v) => setAddForm((f) => ({ ...f, email: v }))} placeholder="Optional" />
                <FormField label="Password" type="password" value={addForm.password}
                  onChange={(v) => setAddForm((f) => ({ ...f, password: v }))}
                  placeholder="Leave blank to auto-generate" />
                <p className="text-xs text-gray-400">
                  Leave password blank to auto-generate a temporary password.
                  Student must change it on first login.
                </p>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={closeAdd}
                    className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={addLoading}
                    className="flex-1 bg-gray-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50">
                    {addLoading ? "Creating…" : "Create Student"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── Profile Modal ──────────────────────────────────────────────────── */}
      {profileId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) { setProfileId(null); setProfileData(null); } }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Student Profile</h3>
              <button onClick={() => { setProfileId(null); setProfileData(null); }}
                className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="px-6 py-5">
              {profileLoading ? (
                <p className="text-center text-gray-400 py-8">Loading…</p>
              ) : profileData ? (
                <>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                      {profileData.user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-900">{profileData.user.name}</h4>
                      <p className="text-sm font-mono text-gray-500">{profileData.user.admissionNumber}</p>
                    </div>
                  </div>
                  <div className="space-y-3 mb-6">
                    <PRow label="Department" value={profileData.user.department} />
                    <PRow label="Semester" value={`Semester ${profileData.user.semester}`} />
                    <PRow label="Email" value={profileData.user.email ?? "—"} />
                    <PRow label="Phone" value={profileData.user.phone ?? "—"} />
                    <PRow label="Status" value={profileData.user.status} />
                    <PRow label="First Login" value={profileData.user.firstLogin ? "Pending" : "Completed"} />
                    <PRow label="Created" value={formatDate(profileData.user.createdAt)} />
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{profileData.stats.totalJobs}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Total Jobs</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">₹{profileData.stats.totalAmountSpent}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Amount Spent</p>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-center text-red-500 py-8">Failed to load profile</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Reusable form field ────────────────────────────────────────────────────────

function FormField({ label, value, onChange, required, type = "text", placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  required?: boolean; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <input type={type} required={required} value={value}
        onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
    </div>
  );
}

// ── Profile row ────────────────────────────────────────────────────────────────

function PRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center border-b border-gray-100 pb-2 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}
