"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface AdminUser {
  id: string;
  admissionNumber: string;
  name: string;
  email?: string;
  phone?: string;
  status: "ACTIVE" | "DISABLED";
  firstLogin: boolean;
  locationId?: string | null;
  locationName: string;
  printers: string[];
  createdAt: { _seconds?: number } | string | null;
}

interface Location { id: string; name: string; }
type Filter = "ALL" | "ACTIVE" | "DISABLED";

interface AddForm {
  name: string; admissionNumber: string; email: string;
  phone: string; password: string; locationId: string;
}

const EMPTY_FORM: AddForm = { name: "", admissionNumber: "", email: "", phone: "", password: "", locationId: "" };

export default function AdminsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<AddForm>(EMPTY_FORM);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const [addedPassword, setAddedPassword] = useState<string | null>(null);
  const [resetMap, setResetMap] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (session?.user?.role !== "SUPER_ADMIN") router.push("/admin/overview");
  }, [session, status, router]);

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/admins");
      if (res.ok) setAdmins((await res.json()).users ?? []);
      const locRes = await fetch("/api/admin/locations");
      if (locRes.ok) setLocations((await locRes.json()).locations ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (session?.user?.role === "SUPER_ADMIN") fetchAdmins();
  }, [fetchAdmins, session]);

  const displayed = admins.filter((a) => {
    const q = search.toLowerCase();
    const matchSearch = !q || a.name.toLowerCase().includes(q) || a.admissionNumber.toLowerCase().includes(q);
    const matchFilter = filter === "ALL" || (filter === "ACTIVE" && a.status === "ACTIVE") || (filter === "DISABLED" && a.status === "DISABLED");
    return matchSearch && matchFilter;
  });

  const counts: Record<Filter, number> = {
    ALL: admins.length,
    ACTIVE: admins.filter((a) => a.status === "ACTIVE").length,
    DISABLED: admins.filter((a) => a.status === "DISABLED").length,
  };

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault(); setAddError(""); setAddLoading(true);
    try {
      const res = await fetch("/api/admin/admins", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(addForm) });
      const data = await res.json();
      if (!res.ok) { setAddError(data.error ?? "Failed to create admin"); return; }
      setAddedPassword(data.user?.tempPassword ?? addForm.password ?? null);
      await fetchAdmins();
    } catch { setAddError("Network error — please try again"); }
    finally { setAddLoading(false); }
  }

  function closeAdd() { setShowAdd(false); setAddForm(EMPTY_FORM); setAddError(""); setAddedPassword(null); }

  async function toggleStatus(a: AdminUser) {
    setBusyId(a.id);
    try {
      await fetch(`/api/admin/admins/${a.id}/status`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: a.status === "ACTIVE" ? "DISABLED" : "ACTIVE" }) });
      await fetchAdmins();
    } finally { setBusyId(null); }
  }

  async function resetPassword(a: AdminUser) {
    setBusyId(a.id);
    try {
      const res = await fetch(`/api/admin/admins/${a.id}/reset-password`, { method: "POST" });
      if (res.ok) { const data = await res.json(); setResetMap((prev) => ({ ...prev, [a.id]: data.tempPassword })); }
    } finally { setBusyId(null); }
  }

  const FILTERS: { label: string; value: Filter }[] = [
    { label: "All", value: "ALL" }, { label: "Active", value: "ACTIVE" }, { label: "Disabled", value: "DISABLED" },
  ];

  if (status === "loading" || session?.user?.role !== "SUPER_ADMIN") return null;

  return (
    <div className="p-6 space-y-5 bg-[#F8FAFC] min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Admin Directory</h1>
          <p className="text-sm text-gray-500 mt-0.5">{admins.length} administrators</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm">
          + Add Admin
        </button>
      </div>

      {/* Search + Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <input type="text" placeholder="Search by name or ID…" value={search} onChange={(e) => setSearch(e.target.value)}
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
          <p className="text-3xl mb-3">🛡️</p>
          <p className="text-gray-500 text-sm">No admins found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-left">
                  {["Admin ID", "Name", "Location", "Status", "First Login", "Temp PW", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-xs font-medium text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayed.map((a) => {
                  const busy = busyId === a.id;
                  return (
                    <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-indigo-600 whitespace-nowrap">{a.admissionNumber}</td>
                      <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{a.name}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">{a.locationName}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${a.status === "ACTIVE" ? "badge-active" : "badge-disabled"}`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {a.firstLogin
                          ? <span className="text-[10px] font-medium badge-pending px-2 py-0.5 rounded-full">Pending</span>
                          : <span className="text-[10px] text-gray-400">Done</span>}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {resetMap[a.id]
                          ? <span className="badge-pending px-2 py-0.5 rounded text-[10px]">{resetMap[a.id]}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button disabled={busy} onClick={() => resetPassword(a)}
                            className="text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-lg hover:bg-indigo-100 disabled:opacity-40 transition-colors">
                            {busy ? "…" : "Reset PW"}
                          </button>
                          {a.status === "ACTIVE"
                            ? <button disabled={busy} onClick={() => toggleStatus(a)}
                                className="text-[10px] font-medium bg-orange-50 text-orange-700 border border-orange-100 px-2.5 py-1 rounded-lg hover:bg-orange-100 disabled:opacity-40 transition-colors">
                                {busy ? "…" : "Disable"}
                              </button>
                            : <button disabled={busy} onClick={() => toggleStatus(a)}
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

      {/* Add Admin Modal */}
      {showAdd && (
        <LightModal title="Add Admin" onClose={closeAdd}>
          {addedPassword ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-4">✅</div>
              <h4 className="text-base font-semibold text-gray-900 mb-2">Admin Created</h4>
              <p className="text-sm text-gray-500 mb-5">Share this password. Admin must change it on first login.</p>
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-6 py-4 mb-6">
                <p className="text-[10px] text-amber-600 mb-1 font-medium uppercase tracking-wider">Temp Password</p>
                <p className="text-2xl font-mono font-semibold text-gray-900 tracking-widest">{addedPassword}</p>
              </div>
              <button onClick={closeAdd} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-medium transition-colors">Done</button>
            </div>
          ) : (
            <form onSubmit={handleAdd} className="space-y-4">
              {addError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-xs">⚠ {addError}</div>}
              <LightField label="Full Name *" required value={addForm.name} onChange={(v) => setAddForm((f) => ({ ...f, name: v }))} placeholder="e.g. Admin Name" />
              <LightField label="Admin ID / Employee No *" required value={addForm.admissionNumber} onChange={(v) => setAddForm((f) => ({ ...f, admissionNumber: v }))} placeholder="e.g. ADM001" />
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-700">Location *</label>
                <select required value={addForm.locationId} onChange={(e) => setAddForm((f) => ({ ...f, locationId: e.target.value }))}
                  className="w-full bg-white border border-gray-200 text-gray-800 text-sm rounded-lg px-3 py-2.5 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100">
                  <option value="" disabled>Select Location</option>
                  {locations.map((loc) => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <LightField label="Email" value={addForm.email} onChange={(v) => setAddForm((f) => ({ ...f, email: v }))} placeholder="Optional" />
                <LightField label="Phone" value={addForm.phone} onChange={(v) => setAddForm((f) => ({ ...f, phone: v }))} placeholder="Optional" />
              </div>
              <LightField label="Password" value={addForm.password} onChange={(v) => setAddForm((f) => ({ ...f, password: v }))} placeholder="Leave blank to auto-generate" />
              <p className="text-xs text-gray-400">Leave password blank to auto-generate.</p>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closeAdd} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" disabled={addLoading} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-40 transition-colors">
                  {addLoading ? "Creating…" : "Create Admin"}
                </button>
              </div>
            </form>
          )}
        </LightModal>
      )}
    </div>
  );
}

function LightModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-md max-h-[90vh] overflow-y-auto">
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
