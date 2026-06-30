"use client";

import { useEffect, useState, useCallback, useRef } from "react";

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
  name: string; admissionNumber: string; department: string;
  semester: string; email: string; phone: string; password: string;
}

interface BulkResult { created: number; skipped: number; errors: string[]; }

const EMPTY_FORM: AddForm = { name: "", admissionNumber: "", department: "", semester: "1", email: "", phone: "", password: "" };

function formatDate(ts: Student["createdAt"]): string {
  if (!ts) return "—";
  let date: Date;
  if (typeof ts === "object" && ts !== null && "_seconds" in ts && ts._seconds) {
    date = new Date(ts._seconds * 1000);
  } else if (typeof ts === "string") {
    date = new Date(ts);
  } else return "—";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(date);
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<AddForm>(EMPTY_FORM);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const [addedPassword, setAddedPassword] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [resetMap, setResetMap] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const csvRef = useRef<HTMLInputElement>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/students");
      if (res.ok) setStudents((await res.json()).users ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const displayed = students.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.name.toLowerCase().includes(q) || s.admissionNumber.toLowerCase().includes(q);
    const matchFilter = filter === "ALL" || (filter === "ACTIVE" && s.status === "ACTIVE") || (filter === "DISABLED" && s.status === "DISABLED") || (filter === "FIRST_LOGIN" && s.firstLogin);
    return matchSearch && matchFilter;
  });

  const counts: Record<Filter, number> = {
    ALL: students.length,
    ACTIVE: students.filter((s) => s.status === "ACTIVE").length,
    DISABLED: students.filter((s) => s.status === "DISABLED").length,
    FIRST_LOGIN: students.filter((s) => s.firstLogin).length,
  };

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault(); setAddError(""); setAddLoading(true);
    try {
      const res = await fetch("/api/admin/students", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...addForm, semester: parseInt(addForm.semester, 10) }) });
      const data = await res.json();
      if (!res.ok) { setAddError(data.error ?? "Failed to create student"); return; }
      setAddedPassword(data.user?.tempPassword ?? addForm.password ?? null);
      await fetchStudents();
    } catch { setAddError("Network error — please try again"); }
    finally { setAddLoading(false); }
  }

  function closeAdd() { setShowAdd(false); setAddForm(EMPTY_FORM); setAddError(""); setAddedPassword(null); }

  async function toggleStatus(s: Student) {
    setBusyId(s.id);
    try {
      await fetch(`/api/admin/students/${s.id}/status`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: s.status === "ACTIVE" ? "DISABLED" : "ACTIVE" }) });
      await fetchStudents();
    } finally { setBusyId(null); }
  }

  async function resetPassword(s: Student) {
    setBusyId(s.id);
    try {
      const res = await fetch(`/api/admin/students/${s.id}/reset-password`, { method: "POST" });
      if (res.ok) { const data = await res.json(); setResetMap((prev) => ({ ...prev, [s.id]: data.tempPassword })); }
    } finally { setBusyId(null); }
  }

  async function openProfile(id: string) {
    setProfileId(id); setProfileData(null); setProfileLoading(true);
    try {
      const res = await fetch(`/api/admin/students/${id}`);
      if (res.ok) setProfileData(await res.json());
    } finally { setProfileLoading(false); }
  }

  async function handleCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkLoading(true); setBulkResult(null);
    try {
      const text = await file.text();
      const lines = text.trim().split(/\r?\n/);
      const firstLine = lines[0].toLowerCase();
      const dataLines = firstLine.includes("admissionnumber") || firstLine.includes("name") ? lines.slice(1) : lines;
      const rows = dataLines.filter((l) => l.trim()).map((line) => {
        const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        return { admissionNumber: cols[0] ?? "", name: cols[1] ?? "", department: cols[2] ?? "", semester: parseInt(cols[3] ?? "1", 10) || 1 };
      });
      const res = await fetch("/api/admin/students/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(rows) });
      const data = await res.json();
      setBulkResult({ created: data.created ?? 0, skipped: data.skipped ?? 0, errors: data.errors ?? [] });
      await fetchStudents();
    } catch { setBulkResult({ created: 0, skipped: 0, errors: ["Failed to process CSV"] }); }
    finally { setBulkLoading(false); if (csvRef.current) csvRef.current.value = ""; }
  }

  const FILTERS: { label: string; value: Filter }[] = [
    { label: "All", value: "ALL" }, { label: "Active", value: "ACTIVE" },
    { label: "Disabled", value: "DISABLED" }, { label: "First Login Pending", value: "FIRST_LOGIN" },
  ];

  return (
    <div className="p-6 space-y-5 bg-[#F8FAFC] min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Student Directory</h1>
          <p className="text-sm text-gray-500 mt-0.5">{students.length} total students</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowAdd(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm">
            + Add Student
          </button>
          <label className="cursor-pointer">
            <span className={`text-sm font-medium border border-gray-200 bg-white text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors inline-block shadow-sm ${bulkLoading ? "opacity-50 cursor-not-allowed" : ""}`}>
              {bulkLoading ? "Importing…" : "⬆ Import CSV"}
            </span>
            <input ref={csvRef} type="file" accept=".csv" className="hidden" disabled={bulkLoading} onChange={handleCSV} />
          </label>
        </div>
      </div>

      {/* CSV hint */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg px-5 py-3">
        <p className="text-xs text-blue-700">
          <span className="font-medium">CSV format:</span>{" "}
          <code className="bg-blue-100 px-1.5 py-0.5 rounded text-blue-800 font-mono text-[11px]">admissionNumber,name,department,semester</code>
          {" "} header row optional, duplicates skipped.
        </p>
      </div>

      {/* Bulk result */}
      {bulkResult && (
        <div className={`rounded-lg px-5 py-4 border ${bulkResult.errors.length > 0 ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-green-50 border-green-200 text-green-700"}`}>
          <p className="text-sm font-medium">Import complete — {bulkResult.created} created, {bulkResult.skipped} skipped</p>
          {bulkResult.errors.slice(0, 5).map((e, i) => <p key={i} className="text-xs mt-1 opacity-80">{e}</p>)}
          <button onClick={() => setBulkResult(null)} className="mt-2 text-xs underline opacity-60 hover:opacity-100">Dismiss</button>
        </div>
      )}

      {/* Search + Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <input type="text" placeholder="Search by name or admission number…" value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-72 bg-white border border-gray-200 text-gray-800 placeholder-gray-400 text-sm rounded-lg px-4 py-2.5 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all shadow-sm" />
        <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
          {FILTERS.map(({ label, value }) => (
            <button key={value} onClick={() => setFilter(value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${filter === value ? "bg-indigo-600 text-white" : "text-gray-500 hover:bg-gray-100"}`}>
              {label}
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${filter === value ? "bg-indigo-500 text-white" : "bg-gray-100 text-gray-500"}`}>{counts[value]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center shadow-sm">
          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-400 text-xs mt-3">Loading…</p>
        </div>
      ) : displayed.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center shadow-sm">
          <p className="text-3xl mb-3">👥</p>
          <p className="text-gray-500 text-sm">No students found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-left">
                  {["Admission No", "Name", "Department", "Sem", "Status", "First Login", "Jobs", "Spent", "Temp PW", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-xs font-medium text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayed.map((s) => {
                  const busy = busyId === s.id;
                  return (
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-indigo-600 whitespace-nowrap">{s.admissionNumber}</td>
                      <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{s.name}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{s.department}</td>
                      <td className="px-4 py-3 text-gray-500 text-center text-xs">{s.semester}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${s.status === "ACTIVE" ? "badge-active" : "badge-disabled"}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {s.firstLogin
                          ? <span className="text-[10px] font-medium badge-pending px-2 py-0.5 rounded-full">Pending</span>
                          : <span className="text-[10px] text-gray-400">Done</span>}
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-gray-900 text-xs">{s.totalJobs}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900 text-xs whitespace-nowrap">
                        {s.totalAmountSpent > 0 ? `₹${s.totalAmountSpent}` : "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {resetMap[s.id]
                          ? <span className="badge-pending px-2 py-0.5 rounded text-[10px]">{resetMap[s.id]}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button disabled={busy} onClick={() => openProfile(s.id)}
                            className="text-[10px] font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 px-2.5 py-1 rounded-lg disabled:opacity-40 transition-colors">
                            View
                          </button>
                          <button disabled={busy} onClick={() => resetPassword(s)}
                            className="text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-lg hover:bg-indigo-100 disabled:opacity-40 transition-colors">
                            {busy ? "…" : "Reset PW"}
                          </button>
                          {s.status === "ACTIVE"
                            ? <button disabled={busy} onClick={() => toggleStatus(s)}
                                className="text-[10px] font-medium bg-orange-50 text-orange-700 border border-orange-100 px-2.5 py-1 rounded-lg hover:bg-orange-100 disabled:opacity-40 transition-colors">
                                {busy ? "…" : "Disable"}
                              </button>
                            : <button disabled={busy} onClick={() => toggleStatus(s)}
                                className="text-[10px] font-medium bg-green-50 text-green-700 border border-green-100 px-2.5 py-1 rounded-lg hover:bg-green-100 disabled:opacity-40 transition-colors">
                                {busy ? "…" : "Enable"}
                              </button>}
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

      {/* Add Student Modal */}
      {showAdd && (
        <LightModal title="Add Student" onClose={closeAdd}>
          {addedPassword ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-4">✅</div>
              <h4 className="text-base font-semibold text-gray-900 mb-2">Student Created</h4>
              <p className="text-sm text-gray-500 mb-5">Share this password. Student must change it on first login.</p>
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-6 py-4 mb-6">
                <p className="text-[10px] text-amber-600 mb-1 font-medium uppercase tracking-wider">Temp Password</p>
                <p className="text-2xl font-mono font-semibold text-gray-900 tracking-widest">{addedPassword}</p>
              </div>
              <button onClick={closeAdd} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-medium transition-colors">Done</button>
            </div>
          ) : (
            <form onSubmit={handleAdd} className="space-y-4">
              {addError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-xs">⚠ {addError}</div>}
              <LightField label="Full Name *" required value={addForm.name} onChange={(v) => setAddForm((f) => ({ ...f, name: v }))} placeholder="e.g. Gayathri M Nair" />
              <LightField label="Admission Number *" required value={addForm.admissionNumber} onChange={(v) => setAddForm((f) => ({ ...f, admissionNumber: v }))} placeholder="e.g. S2024CS001" />
              <LightField label="Department *" required value={addForm.department} onChange={(v) => setAddForm((f) => ({ ...f, department: v }))} placeholder="e.g. Computer Science" />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-700">Semester *</label>
                  <select required value={addForm.semester} onChange={(e) => setAddForm((f) => ({ ...f, semester: e.target.value }))}
                    className="w-full bg-white border border-gray-200 text-gray-800 text-sm rounded-lg px-3 py-2.5 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100">
                    {[1,2,3,4,5,6,7,8].map((n) => <option key={n} value={n}>Sem {n}</option>)}
                  </select>
                </div>
                <LightField label="Phone" value={addForm.phone} onChange={(v) => setAddForm((f) => ({ ...f, phone: v }))} placeholder="Optional" />
              </div>
              <LightField label="Email" value={addForm.email} onChange={(v) => setAddForm((f) => ({ ...f, email: v }))} placeholder="Optional" />
              <LightField label="Password" value={addForm.password} onChange={(v) => setAddForm((f) => ({ ...f, password: v }))} placeholder="Leave blank to auto-generate" />
              <p className="text-xs text-gray-400">Leave password blank to auto-generate. Student must change it on first login.</p>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closeAdd} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" disabled={addLoading} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-40 transition-colors">
                  {addLoading ? "Creating…" : "Create Student"}
                </button>
              </div>
            </form>
          )}
        </LightModal>
      )}

      {/* Profile Modal */}
      {profileId && (
        <LightModal title="Student Profile" onClose={() => { setProfileId(null); setProfileData(null); }}>
          {profileLoading ? (
            <div className="py-12 text-center"><div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>
          ) : profileData ? (
            <>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xl font-semibold flex-shrink-0">
                  {profileData.user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-base font-semibold text-gray-900">{profileData.user.name}</h4>
                  <p className="text-xs font-mono text-gray-500">{profileData.user.admissionNumber}</p>
                </div>
              </div>
              <div className="space-y-2 mb-6">
                {[
                  { label: "Department", value: profileData.user.department },
                  { label: "Semester", value: `Semester ${profileData.user.semester}` },
                  { label: "Email", value: profileData.user.email ?? "—" },
                  { label: "Phone", value: profileData.user.phone ?? "—" },
                  { label: "Status", value: profileData.user.status },
                  { label: "First Login", value: profileData.user.firstLogin ? "Pending" : "Completed" },
                  { label: "Created", value: formatDate(profileData.user.createdAt) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-xs text-gray-500">{label}</span>
                    <span className="text-xs font-medium text-gray-900">{value}</span>
                  </div>
                ))}
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-semibold text-gray-900">{profileData.stats.totalJobs}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Total Jobs</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-semibold text-gray-900">₹{profileData.stats.totalAmountSpent}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Amount Spent</p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-center text-red-500 text-sm py-8">Failed to load profile</p>
          )}
        </LightModal>
      )}
    </div>
  );
}

function LightModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-md max-h-[90vh] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-xl">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-lg leading-none transition-colors">✕</button>
        </div>
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

function LightField({ label, value, onChange, required, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; required?: boolean; placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-gray-700">{label}</label>
      <input type="text" required={required} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-white border border-gray-200 text-gray-800 placeholder-gray-400 text-sm rounded-lg px-4 py-2.5 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all" />
    </div>
  );
}
