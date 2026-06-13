"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminUser {
  id: string;
  admissionNumber: string; // Used as Admin ID/Employee No
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

interface Location {
  id: string;
  name: string;
}

type Filter = "ALL" | "ACTIVE" | "DISABLED";

interface AddForm {
  name: string;
  admissionNumber: string;
  email: string;
  phone: string;
  password: string;
  locationId: string;
}

const EMPTY_FORM: AddForm = {
  name: "", admissionNumber: "", email: "", phone: "", password: "", locationId: "",
};

function formatDate(ts: AdminUser["createdAt"]): string {
  if (!ts) return "—";
  let date: Date;
  if (typeof ts === "object" && ts !== null && "_seconds" in ts && ts._seconds) {
    date = new Date(ts._seconds * 1000);
  } else if (typeof ts === "string") {
    date = new Date(ts);
  } else return "—";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(date);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

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

  // Security check: only SUPER_ADMIN can view this page
  useEffect(() => {
    if (status === "loading") return;
    if (session?.user?.role !== "SUPER_ADMIN") {
      router.push("/admin/overview");
    }
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
    if (session?.user?.role === "SUPER_ADMIN") {
      fetchAdmins();
    }
  }, [fetchAdmins, session]);

  const displayed = admins.filter((a) => {
    const q = search.toLowerCase();
    const matchSearch = !q || a.name.toLowerCase().includes(q) || a.admissionNumber.toLowerCase().includes(q);
    const matchFilter =
      filter === "ALL" ||
      (filter === "ACTIVE" && a.status === "ACTIVE") ||
      (filter === "DISABLED" && a.status === "DISABLED");
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
      const res = await fetch("/api/admin/admins", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();
      if (!res.ok) { setAddError(data.error ?? "Failed to create admin"); return; }
      setAddedPassword(data.user?.tempPassword ?? addForm.password ?? null);
      await fetchAdmins();
    } catch { setAddError("Network error — please try again"); }
    finally { setAddLoading(false); }
  }

  function closeAdd() {
    setShowAdd(false); setAddForm(EMPTY_FORM);
    setAddError(""); setAddedPassword(null);
  }

  async function toggleStatus(a: AdminUser) {
    setBusyId(a.id);
    try {
      await fetch(`/api/admin/admins/${a.id}/status`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: a.status === "ACTIVE" ? "DISABLED" : "ACTIVE" }),
      });
      await fetchAdmins();
    } finally { setBusyId(null); }
  }

  async function resetPassword(a: AdminUser) {
    setBusyId(a.id);
    try {
      const res = await fetch(`/api/admin/admins/${a.id}/reset-password`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setResetMap((prev) => ({ ...prev, [a.id]: data.tempPassword }));
      }
    } finally { setBusyId(null); }
  }

  const FILTERS: { label: string; value: Filter }[] = [
    { label: "All", value: "ALL" },
    { label: "Active", value: "ACTIVE" },
    { label: "Disabled", value: "DISABLED" },
  ];

  if (status === "loading" || session?.user?.role !== "SUPER_ADMIN") {
    return null;
  }

  return (
    <div className="p-7 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Admin Directory</h1>
          <p className="text-xs text-gray-500 mt-0.5">{admins.length} total administrators</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors">
          + Add Admin
        </button>
      </div>

      {/* Search + Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="text"
          placeholder="Search by name or ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-72 bg-white/[0.05] border border-white/[0.08] focus:border-indigo-500/50 text-white placeholder-gray-600 text-sm rounded-xl px-4 py-2.5 outline-none transition-all"
        />
        <div className="flex gap-1 glass-card rounded-xl p-1">
          {FILTERS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                filter === value ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-gray-200 hover:bg-white/[0.05]"
              }`}
            >
              {label}
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${filter === value ? "bg-indigo-500 text-white" : "bg-white/[0.06] text-gray-500"}`}>
                {counts[value]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="glass-card rounded-2xl p-16 text-center">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 text-xs mt-3">Loading…</p>
        </div>
      ) : displayed.length === 0 ? (
        <div className="glass-card rounded-2xl p-16 text-center">
          <p className="text-3xl mb-3">🛡️</p>
          <p className="text-gray-500 text-sm">No admins found</p>
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="glass-header text-left">
                  {["Admin ID", "Name", "Location", "Printers", "Status", "First Login", "Temp PW", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-[9px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {displayed.map((a) => {
                  const busy = busyId === a.id;
                  return (
                    <tr key={a.id} className="hover:bg-white/[0.04] transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-bold text-indigo-400 whitespace-nowrap">{a.admissionNumber}</td>
                      <td className="px-4 py-3 font-semibold text-white whitespace-nowrap">{a.name}</td>
                      <td className="px-4 py-3 text-gray-300 whitespace-nowrap text-xs">{a.locationName}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {a.printers.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {a.printers.map(p => <span key={p} className="bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-[9px]">{p}</span>)}
                          </div>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${a.status === "ACTIVE" ? "bg-green-400/10 text-green-400" : "bg-red-400/10 text-red-400"}`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {a.firstLogin ? (
                          <span className="text-[9px] font-bold bg-amber-400/10 text-amber-400 px-2 py-0.5 rounded-full">Pending</span>
                        ) : (
                          <span className="text-[9px] text-gray-600">Done</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {resetMap[a.id] ? (
                          <span className="bg-amber-400/10 border border-amber-400/20 text-amber-400 px-2 py-0.5 rounded text-[10px]">
                            {resetMap[a.id]}
                          </span>
                        ) : <span className="text-gray-700">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button disabled={busy} onClick={() => resetPassword(a)}
                            className="text-[10px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 px-2.5 py-1 rounded-lg hover:bg-indigo-500/30 disabled:opacity-40 transition-colors">
                            {busy ? "…" : "Reset PW"}
                          </button>
                          {a.status === "ACTIVE" ? (
                            <button disabled={busy} onClick={() => toggleStatus(a)}
                              className="text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/20 px-2.5 py-1 rounded-lg hover:bg-orange-500/30 disabled:opacity-40 transition-colors">
                              {busy ? "…" : "Disable"}
                            </button>
                          ) : (
                            <button disabled={busy} onClick={() => toggleStatus(a)}
                              className="text-[10px] font-bold bg-green-500/20 text-green-400 border border-green-500/20 px-2.5 py-1 rounded-lg hover:bg-green-500/30 disabled:opacity-40 transition-colors">
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

      {/* ── Add Admin Modal ── */}
      {showAdd && (
        <GlassModal title="Add Admin" onClose={closeAdd}>
          {addedPassword ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-4">✅</div>
              <h4 className="text-base font-bold text-white mb-2">Admin Created</h4>
              <p className="text-xs text-gray-400 mb-5">Share this password. Admin must change it on first login.</p>
              <div className="bg-amber-400/10 border border-amber-400/20 rounded-xl px-6 py-4 mb-6">
                <p className="text-[10px] text-amber-400 mb-1 font-bold uppercase tracking-widest">Temp Password</p>
                <p className="text-2xl font-mono font-bold text-white tracking-widest">{addedPassword}</p>
              </div>
              <button onClick={closeAdd} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl font-bold transition-colors">Done</button>
            </div>
          ) : (
            <form onSubmit={handleAdd} className="space-y-4">
              {addError && <GlassAlert type="error">{addError}</GlassAlert>}
              <GlassField label="Full Name *" required value={addForm.name} onChange={(v) => setAddForm((f) => ({ ...f, name: v }))} placeholder="e.g. Admin Name" />
              <GlassField label="Admin ID / Employee No *" required value={addForm.admissionNumber} onChange={(v) => setAddForm((f) => ({ ...f, admissionNumber: v }))} placeholder="e.g. ADM001" />
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Location *</label>
                <select required value={addForm.locationId} onChange={(e) => setAddForm((f) => ({ ...f, locationId: e.target.value }))}
                  className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-indigo-500/50 text-white text-sm rounded-xl px-3 py-2.5 outline-none">
                  <option value="" disabled className="bg-[#0d0f1c]">Select Location</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id} className="bg-[#0d0f1c]">{loc.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <GlassField label="Email" value={addForm.email} onChange={(v) => setAddForm((f) => ({ ...f, email: v }))} placeholder="Optional" />
                <GlassField label="Phone" value={addForm.phone} onChange={(v) => setAddForm((f) => ({ ...f, phone: v }))} placeholder="Optional" />
              </div>
              <GlassField label="Password" value={addForm.password} onChange={(v) => setAddForm((f) => ({ ...f, password: v }))} placeholder="Leave blank to auto-generate" />
              <p className="text-[10px] text-gray-600">Leave password blank to auto-generate. Admin must change it on first login.</p>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closeAdd} className="flex-1 border border-white/10 text-gray-400 py-2.5 rounded-xl text-sm hover:bg-white/[0.05] transition-colors">Cancel</button>
                <button type="submit" disabled={addLoading} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 transition-colors">
                  {addLoading ? "Creating…" : "Create Admin"}
                </button>
              </div>
            </form>
          )}
        </GlassModal>
      )}
    </div>
  );
}

// ─── Shared glass micro-components ────────────────────────────────────────────

function GlassModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-card rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between sticky top-0 glass-card rounded-t-2xl">
          <h3 className="text-sm font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none transition-colors">✕</button>
        </div>
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

function GlassAlert({ type, children }: { type: "error" | "success"; children: React.ReactNode }) {
  return (
    <div className={`px-4 py-3 rounded-xl text-xs font-mono ${type === "error" ? "bg-red-500/10 border border-red-500/20 text-red-400" : "bg-green-500/10 border border-green-500/20 text-green-400"}`}>
      {type === "error" ? "⚠ " : "✓ "}{children}
    </div>
  );
}

function GlassField({ label, value, onChange, required, placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  required?: boolean; placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</label>
      <input
        type="text" required={required} value={value}
        onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-indigo-500/50 text-white placeholder-gray-600 text-sm rounded-xl px-4 py-2.5 outline-none transition-all"
      />
    </div>
  );
}
