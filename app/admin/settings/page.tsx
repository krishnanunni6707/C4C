"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";

type MainTab = "pricing" | "printers" | "centers" | "danger";

export default function SettingsPage() {
  const [tab, setTab] = useState<MainTab>("pricing");
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";

  const TABS: { value: MainTab; label: string; superOnly?: boolean }[] = [
    { value: "pricing",  label: "Pricing" },
    { value: "printers", label: "Printers" },
    { value: "centers",  label: "Printer Centers", superOnly: true },
    { value: "danger",   label: "Database", superOnly: true },
  ];

  return (
    <div className="p-7 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Settings</h1>
        <div className="flex gap-1 bg-slate-100 border border-slate-200 rounded-xl p-1 shadow-sm">
          {TABS.map((t) => {
            if (t.superOnly && !isSuperAdmin) return null;
            return (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  tab === t.value ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {tab === "pricing"  && <PricingTab />}
      {tab === "printers" && <PrintersTab />}
      {tab === "centers"  && isSuperAdmin && <PrinterCentersTab />}
      {tab === "danger"   && isSuperAdmin && <DatabaseTab />}
    </div>
  );
}

// ─── Pricing Tab ──────────────────────────────────────────────────────────────

interface PricingForm {
  bwSingleSidedPrice: number;
  bwDoubleSidedPrice: number;
  colorSingleSidedPrice: number;
  colorDoubleSidedPrice: number;
  tokenCharge: number;
}

const PRICING_DEFAULTS: PricingForm = {
  bwSingleSidedPrice: 2,
  bwDoubleSidedPrice: 3,
  colorSingleSidedPrice: 5,
  colorDoubleSidedPrice: 8,
  tokenCharge: 1,
};

function PricingTab() {
  const [form, setForm] = useState<PricingForm>(PRICING_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/settings");
        if (!res.ok) throw new Error();
        const { settings: s = {} } = await res.json();
        setForm({
          bwSingleSidedPrice:    s.bwSingleSidedPrice    ?? s.bwPricePerSheet    ?? 2,
          bwDoubleSidedPrice:    s.bwDoubleSidedPrice    ?? s.bwPricePerSheet    ?? 3,
          colorSingleSidedPrice: s.colorSingleSidedPrice ?? s.colorPricePerSheet ?? 5,
          colorDoubleSidedPrice: s.colorDoubleSidedPrice ?? s.colorPricePerSheet ?? 8,
          tokenCharge:           s.tokenCharge           ?? 1,
        });
      } catch { setError("Failed to load settings"); }
      finally { setLoading(false); }
    })();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault(); setError(""); setSaved(false); setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Save failed");
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  }

  if (loading) return <DarkLoader />;

  return (
    <form onSubmit={save} className="max-w-3xl space-y-5">
      <div className="grid grid-cols-[1fr_260px] gap-5 items-start">

        {/* Left — pricing fields */}
        <div className="glass-card rounded-2xl overflow-hidden border border-slate-200/80 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-850">Print Pricing</h3>
            <p className="text-xs text-slate-400 mt-0.5">Cost per sheet used for job amount calculation</p>
          </div>
          <div className="px-5 py-5 space-y-6">

            {/* B&W */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
                Black &amp; White
              </p>
              <div className="grid grid-cols-2 gap-4">
                <DarkNumField
                  label="Single Sided (₹/sheet) *"
                  value={form.bwSingleSidedPrice}
                  onChange={(v) => setForm((f) => ({ ...f, bwSingleSidedPrice: v }))}
                  hint="e.g. ₹2 per page"
                />
                <DarkNumField
                  label="Double Sided (₹/sheet) *"
                  value={form.bwDoubleSidedPrice}
                  onChange={(v) => setForm((f) => ({ ...f, bwDoubleSidedPrice: v }))}
                  hint="e.g. ₹3 per sheet"
                />
              </div>
            </div>

            {/* Color */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
                Color
              </p>
              <div className="grid grid-cols-2 gap-4">
                <DarkNumField
                  label="Single Sided (₹/sheet) *"
                  value={form.colorSingleSidedPrice}
                  onChange={(v) => setForm((f) => ({ ...f, colorSingleSidedPrice: v }))}
                  hint="e.g. ₹5 per page"
                />
                <DarkNumField
                  label="Double Sided (₹/sheet) *"
                  value={form.colorDoubleSidedPrice}
                  onChange={(v) => setForm((f) => ({ ...f, colorDoubleSidedPrice: v }))}
                  hint="e.g. ₹8 per sheet"
                />
              </div>
            </div>

            {/* Token charge */}
            <div className="pt-4 border-t border-slate-100">
              <div className="max-w-[200px]">
                <DarkNumField
                  label="Token Charge (₹) *"
                  value={form.tokenCharge}
                  onChange={(v) => setForm((f) => ({ ...f, tokenCharge: v }))}
                  hint="Per job token slip charge"
                />
              </div>
            </div>

          </div>
        </div>

        {/* Right — live preview */}
        <div className="glass-card rounded-2xl p-5 space-y-2 sticky top-20 border border-slate-200/85 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Price Preview</p>
          {[
            { label: "B&W · Single · 10 pages",   cost: (form.bwSingleSidedPrice    || 0) * 10 },
            { label: "B&W · Double · 10 sheets",  cost: (form.bwDoubleSidedPrice    || 0) * 10 },
            { label: "Color · Single · 10 pages", cost: (form.colorSingleSidedPrice || 0) * 10 },
            { label: "Color · Double · 10 sheets",cost: (form.colorDoubleSidedPrice || 0) * 10 },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between text-xs py-2 border-b border-slate-100 last:border-0">
              <span className="text-slate-500 leading-snug">{row.label}</span>
              <span className="font-bold text-slate-800 font-mono ml-3 flex-shrink-0">₹{row.cost.toFixed(2)}</span>
            </div>
          ))}
        </div>

      </div>

      {error && <DarkAlert type="error">{error}</DarkAlert>}
      {saved && <DarkAlert type="success">Pricing saved successfully.</DarkAlert>}

      <div className="flex justify-end">
        <button type="submit" disabled={saving}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold px-6 py-2.5 rounded-xl disabled:opacity-40 transition-colors flex items-center gap-2">
          {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          {saving ? "Saving…" : "Save Pricing"}
        </button>
      </div>
    </form>
  );
}

// ─── Printers Tab ─────────────────────────────────────────────────────────────

interface Printer { id: string; name: string; location: string; status: "ONLINE" | "OFFLINE"; inkPercentage: number; paperPercentage: number; }

function PrintersTab() {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", location: "", inkPercentage: "100", paperPercentage: "100" });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/printers");
      if (r.ok) setPrinters((await r.json()).printers ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  async function addPrinter(e: React.FormEvent) {
    e.preventDefault(); setAddError(""); setAddLoading(true);
    try {
      const r = await fetch("/api/admin/printers", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...addForm, inkPercentage: Number(addForm.inkPercentage), paperPercentage: Number(addForm.paperPercentage) }),
      });
      if (!r.ok) { setAddError((await r.json().catch(() => ({}))).error ?? "Failed"); return; }
      setShowAdd(false); setAddForm({ name: "", location: "", inkPercentage: "100", paperPercentage: "100" });
      await fetch_();
    } finally { setAddLoading(false); }
  }

  async function toggleStatus(p: Printer) {
    setBusyId(p.id);
    try {
      await fetch(`/api/admin/printers/${p.id}/status`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: p.status === "ONLINE" ? "OFFLINE" : "ONLINE" }),
      });
      await fetch_();
    } finally { setBusyId(null); }
  }

  async function deletePrinter(p: Printer) {
    if (!confirm(`Remove "${p.name}"?`)) return;
    setBusyId(p.id);
    try { await fetch(`/api/admin/printers/${p.id}`, { method: "DELETE" }); await fetch_(); }
    finally { setBusyId(null); }
  }

  if (loading) return <DarkLoader />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 font-medium">{printers.length} printer{printers.length !== 1 ? "s" : ""} registered</p>
        <button onClick={() => setShowAdd(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors shadow-sm">
          + Add Printer
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {printers.map((p) => {
          const busy = busyId === p.id;
          return (
            <div key={p.id} className={`bg-white rounded-2xl border p-5 shadow-sm ${p.status === "ONLINE" ? "border-slate-200" : "border-red-200 bg-red-50/10"}`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${p.status === "ONLINE" ? "text-emerald-600" : "text-red-600"}`}>
                    {p.status}
                  </span>
                  <h3 className="text-sm font-bold text-slate-800 mt-0.5">{p.name}</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">{p.location}</p>
                </div>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${p.status === "ONLINE" ? "bg-emerald-50 border border-emerald-100 text-emerald-600" : "bg-red-50 border border-red-100 text-red-600"}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659" />
                  </svg>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>TONER LEVEL</span>
                  <span className="text-emerald-600 font-bold">{p.inkPercentage}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${p.inkPercentage}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>PAPER (A4)</span>
                  <span className="text-slate-700 font-bold">{p.paperPercentage}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${p.paperPercentage}%` }} />
                </div>
              </div>
              <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
                <button disabled={busy} onClick={() => toggleStatus(p)}
                  className={`flex-1 text-[10px] font-bold py-1.5 rounded-lg transition-all disabled:opacity-40 ${p.status === "ONLINE" ? "bg-orange-50 text-orange-600 border border-orange-200" : "bg-green-50 text-green-600 border border-green-200"}`}>
                  {busy ? "…" : p.status === "ONLINE" ? "Disable" : "Enable"}
                </button>
                <button disabled={busy} onClick={() => deletePrinter(p)}
                  className="flex-1 text-[10px] font-bold py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-40">
                  Remove
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {showAdd && (
        <DarkModal title="Add Printer" onClose={() => setShowAdd(false)}>
          <form onSubmit={addPrinter} className="space-y-4">
            {addError && <DarkAlert type="error">{addError}</DarkAlert>}
            <DarkStrField label="Printer Name *" value={addForm.name}
              onChange={(v) => setAddForm((f) => ({ ...f, name: v }))} placeholder="HP LaserJet 1020" />
            <DarkStrField label="Location *" value={addForm.location}
              onChange={(v) => setAddForm((f) => ({ ...f, location: v }))} placeholder="Library - Room 102" />
            <div className="grid grid-cols-2 gap-4">
              <DarkNumField label="Ink %" value={Number(addForm.inkPercentage)}
                onChange={(v) => setAddForm((f) => ({ ...f, inkPercentage: String(v) }))} max={100} />
              <DarkNumField label="Paper %" value={Number(addForm.paperPercentage)}
                onChange={(v) => setAddForm((f) => ({ ...f, paperPercentage: String(v) }))} max={100} />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setShowAdd(false)}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors">Cancel</button>
              <button type="submit" disabled={addLoading}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-40 transition-colors">
                {addLoading ? "Adding…" : "Add Printer"}
              </button>
            </div>
          </form>
        </DarkModal>
      )}
    </div>
  );
}

// ─── Printer Centers Tab ──────────────────────────────────────────────────────

interface Center {
  location: {
    id: string; name: string; building?: string; floor?: string; isActive: boolean;
  };
  admin: {
    id: string; name: string; admissionNumber: string;
    status: "ACTIVE" | "DISABLED"; locationId?: string | null;
  } | null;
}

function PrinterCentersTab() {
  const [centers, setCenters] = useState<Center[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addError, setAddError] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [newPw, setNewPw] = useState<{ name: string; pw: string } | null>(null);

  const [addForm, setAddForm] = useState({
    locationName: "", building: "", floor: "",
    adminName: "", admissionNumber: "", email: "", password: "",
  });

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const [locRes, usersRes] = await Promise.all([
        fetch("/api/admin/locations"),
        fetch("/api/admin/students"),
      ]);
      const locs: Array<{ id: string; name: string; building?: string; floor?: string; isActive: boolean }> =
        locRes.ok ? (await locRes.json()).locations ?? [] : [];
      const allUsers: Array<{ id: string; name: string; admissionNumber: string; role: string; status: "ACTIVE" | "DISABLED"; locationId?: string | null }> =
        usersRes.ok ? (await usersRes.json()).users ?? [] : [];

      const admins = allUsers.filter((u) => u.role === "ADMIN");

      const built: Center[] = locs.map((loc) => ({
        location: loc,
        admin: admins.find((a) => a.locationId === loc.id) ?? null,
      }));
      setCenters(built);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault(); setAddError(""); setAddLoading(true);
    try {
      const locRes = await fetch("/api/admin/locations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: addForm.locationName, building: addForm.building, floor: addForm.floor }),
      });
      if (!locRes.ok) { setAddError((await locRes.json().catch(() => ({}))).error ?? "Failed to create location"); return; }
      const { location } = await locRes.json();

      const adminRes = await fetch("/api/admin/students", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addForm.adminName, admissionNumber: addForm.admissionNumber,
          email: addForm.email || undefined, password: addForm.password || undefined,
          department: "Admin", semester: 1, role: "ADMIN", locationId: location.id,
        }),
      });
      const adminData = await adminRes.json();
      if (!adminRes.ok) { setAddError(adminData.error ?? "Location created but failed to create admin"); return; }

      const tempPw = adminData.user?.tempPassword ?? addForm.password;
      setNewPw({ name: addForm.adminName, pw: tempPw });
      setAddForm({ locationName: "", building: "", floor: "", adminName: "", admissionNumber: "", email: "", password: "" });
      await fetch_();
    } finally { setAddLoading(false); }
  }

  async function toggleLocation(loc: Center["location"]) {
    setBusyId("loc-" + loc.id);
    try {
      await fetch(`/api/admin/locations/${loc.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !loc.isActive }),
      });
      await fetch_();
    } finally { setBusyId(null); }
  }

  async function toggleAdmin(admin: NonNullable<Center["admin"]>) {
    setBusyId("adm-" + admin.id);
    try {
      await fetch(`/api/admin/students/${admin.id}/status`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: admin.status === "ACTIVE" ? "DISABLED" : "ACTIVE" }),
      });
      await fetch_();
    } finally { setBusyId(null); }
  }

  async function resetAdminPw(admin: NonNullable<Center["admin"]>) {
    setBusyId("pw-" + admin.id);
    try {
      const r = await fetch(`/api/admin/students/${admin.id}/reset-password`, { method: "POST" });
      const d = await r.json();
      if (r.ok) setNewPw({ name: admin.name, pw: d.tempPassword });
    } finally { setBusyId(null); }
  }

  if (loading) return <DarkLoader />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-slate-800">Printer Centers</p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Each center is a physical printing location with an assigned admin account.
          </p>
        </div>
        <button onClick={() => { setShowAdd(true); setAddError(""); setNewPw(null); }}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors shadow-sm flex items-center gap-1.5">
          + Add Center
        </button>
      </div>

      {newPw && (
        <div className="glass-card rounded-2xl p-4 flex items-center justify-between border border-green-200 bg-green-50/50">
          <div>
            <p className="text-[10px] text-green-600 font-bold uppercase tracking-widest">Admin Created — Save this password</p>
            <p className="text-sm text-slate-850 font-semibold mt-0.5">{newPw.name}</p>
            <p className="text-base font-mono font-bold text-indigo-600 mt-1">{newPw.pw}</p>
          </div>
          <button onClick={() => setNewPw(null)} className="text-slate-400 hover:text-slate-650 text-lg ml-4">✕</button>
        </div>
      )}

      {centers.length === 0 ? (
        <div className="glass-card rounded-2xl p-16 text-center border border-slate-200/80 shadow-sm">
          <p className="text-3xl mb-3">🖨️</p>
          <p className="text-slate-400 text-sm">No printing centers yet.</p>
          <button onClick={() => setShowAdd(true)}
            className="mt-4 text-xs text-indigo-600 hover:text-indigo-750 underline underline-offset-2">
            Add your first center →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {centers.map(({ location: loc, admin }) => (
            <div key={loc.id} className={`glass-card rounded-2xl overflow-hidden border shadow-sm ${loc.isActive ? "border-slate-200/80 bg-white" : "border-slate-200 bg-slate-50/40 opacity-60"}`}>

              <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${loc.isActive ? "bg-indigo-50 border border-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-400"}`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-800 truncate">{loc.name}</p>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase flex-shrink-0 ${loc.isActive ? "bg-green-50 border border-green-100 text-green-700" : "bg-slate-100 text-slate-400"}`}>
                        {loc.isActive ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </div>
                    {(loc.building || loc.floor) && (
                      <p className="text-[10px] text-slate-400 mt-0.5">{[loc.building, loc.floor].filter(Boolean).join(" • ")}</p>
                    )}
                  </div>
                </div>
                <button
                  disabled={busyId === "loc-" + loc.id}
                  onClick={() => toggleLocation(loc)}
                  className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg flex-shrink-0 disabled:opacity-40 transition-colors ${loc.isActive ? "bg-orange-50 text-orange-600 border border-orange-200" : "bg-green-50 text-green-600 border border-green-200"}`}
                >
                  {busyId === "loc-" + loc.id ? "…" : loc.isActive ? "Deactivate" : "Activate"}
                </button>
              </div>

              <div className="px-5 py-4 bg-slate-50/50">
                {!admin ? (
                  <p className="text-xs text-slate-400 italic">No admin assigned to this center.</p>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 text-[10px] font-bold flex-shrink-0 shadow-sm">
                        {admin.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">{admin.name}</p>
                        <p className="text-[10px] font-mono text-slate-400">{admin.admissionNumber}</p>
                      </div>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase flex-shrink-0 ${admin.status === "ACTIVE" ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-700 border-red-100"}`}>
                        {admin.status}
                      </span>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button
                        disabled={!!busyId}
                        onClick={() => resetAdminPw(admin)}
                        className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-indigo-50 border border-indigo-150 text-indigo-600 disabled:opacity-40 transition-colors shadow-sm"
                      >
                        {busyId === "pw-" + admin.id ? "…" : "Reset PW"}
                      </button>
                      <button
                        disabled={!!busyId}
                        onClick={() => toggleAdmin(admin)}
                        className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg disabled:opacity-40 transition-colors ${admin.status === "ACTIVE" ? "bg-orange-50 text-orange-600 border border-orange-200" : "bg-green-50 text-green-600 border border-green-200"}`}
                      >
                        {busyId === "adm-" + admin.id ? "…" : admin.status === "ACTIVE" ? "Disable" : "Enable"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <DarkModal title="Add Printer Center" onClose={() => { setShowAdd(false); setNewPw(null); setAddError(""); }}>
          {newPw ? (
            <div className="text-center py-2">
              <div className="text-3xl mb-3">✅</div>
              <p className="text-sm font-semibold text-gray-900">Center Created!</p>
              <p className="text-xs text-gray-500 mt-1 mb-4">Save this admin password — it won&apos;t be shown again.</p>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
                <p className="text-[10px] text-amber-600 font-medium uppercase tracking-wider mb-1">Admin Password</p>
                <p className="text-xl font-mono font-semibold text-gray-900 tracking-wider">{newPw.pw}</p>
              </div>
              <button onClick={() => { setShowAdd(false); setNewPw(null); }}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">Done</button>
            </div>
          ) : (
            <form onSubmit={handleAdd} className="space-y-5">
              {addError && <DarkAlert type="error">{addError}</DarkAlert>}

              <div className="space-y-3">
                <p className="text-xs font-medium text-gray-500 border-b border-gray-100 pb-2">Location Details</p>
                <DarkStrField label="Center Name *" value={addForm.locationName}
                  onChange={(v) => setAddForm((f) => ({ ...f, locationName: v }))} placeholder="e.g. Library Print Room" />
                <div className="grid grid-cols-2 gap-3">
                  <DarkStrField label="Building" value={addForm.building}
                    onChange={(v) => setAddForm((f) => ({ ...f, building: v }))} placeholder="Main Block" />
                  <DarkStrField label="Floor" value={addForm.floor}
                    onChange={(v) => setAddForm((f) => ({ ...f, floor: v }))} placeholder="Ground Floor" />
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-medium text-gray-500 border-b border-gray-100 pb-2">Admin Account</p>
                <DarkStrField label="Admin Name *" value={addForm.adminName}
                  onChange={(v) => setAddForm((f) => ({ ...f, adminName: v }))} placeholder="e.g. Ravi Kumar" />
                <DarkStrField label="Staff / Admission No *" value={addForm.admissionNumber}
                  onChange={(v) => setAddForm((f) => ({ ...f, admissionNumber: v }))} placeholder="e.g. ADMIN002" />
                <DarkStrField label="Email (optional)" value={addForm.email}
                  onChange={(v) => setAddForm((f) => ({ ...f, email: v }))} placeholder="admin@campus.edu" />
                <DarkStrField label="Password (optional)" value={addForm.password}
                  onChange={(v) => setAddForm((f) => ({ ...f, password: v }))} placeholder="Leave blank to auto-generate" />
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setShowAdd(false); setAddError(""); }}
                  className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" disabled={addLoading}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-40 transition-colors">
                  {addLoading ? "Creating…" : "Create Center"}
                </button>
              </div>
            </form>
          )}
        </DarkModal>
      )}
    </div>
  );
}

// ─── Database Tab ─────────────────────────────────────────────────────────────

function DatabaseTab() {
  const [clearing, setClearing] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<string | null>(null);
  const [confirmInput, setConfirmInput] = useState("");
  const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const targets = [
    {
      id: "printJobs",
      title: "Clear Print Jobs & Transactions",
      desc: "Deletes all print jobs and their associated transaction logs from the database.",
      warning: "This action cannot be undone. Active queues and history will be cleared.",
    },
    {
      id: "notifications",
      title: "Clear Notifications",
      desc: "Deletes all real-time and broadcast notification records from the database.",
      warning: "This will remove the notifications history for all students and admins.",
    },
    {
      id: "students",
      title: "Clear Student Accounts",
      desc: "Deletes all student user profiles from the database.",
      warning: "Admins and Super Admins will NOT be deleted. Students will have to re-register.",
    },
    {
      id: "all",
      title: "Full Database Reset",
      desc: "Wipes all print jobs, transactions, notifications, and student accounts.",
      warning: "Crucial system settings, locations, and admin users will be preserved.",
    },
  ];

  async function handleClear() {
    if (!confirmTarget) return;
    if (confirmInput !== "DELETE") {
      setStatus({ type: "error", msg: "Verification text does not match." });
      return;
    }

    const target = confirmTarget;
    setConfirmTarget(null);
    setConfirmInput("");
    setClearing(target);
    setStatus(null);

    try {
      const res = await fetch("/api/admin/db/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to clear database");
      setStatus({ type: "success", msg: data.message || "Database updated successfully." });
    } catch (err: unknown) {
      setStatus({ type: "error", msg: err instanceof Error ? err.message : "An error occurred." });
    } finally {
      setClearing(null);
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="glass-card rounded-2xl p-5 border border-red-200 bg-red-50 text-red-700 shadow-sm">
        <h3 className="text-sm font-bold flex items-center gap-2">
          ⚠️ Danger Zone
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Perform administrative database clearing operations. Actions in this section are destructive and irreversible.
        </p>
      </div>

      {status && (
        <div className="mt-2">
          <DarkAlert type={status.type}>{status.msg}</DarkAlert>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {targets.map((t) => {
          const isBusy = clearing === t.id;
          return (
            <div key={t.id} className="glass-card rounded-2xl p-5 flex flex-col justify-between border border-slate-200 shadow-sm hover:border-red-300 transition-all bg-white">
              <div>
                <h4 className="text-sm font-bold text-slate-800">{t.title}</h4>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{t.desc}</p>
                <p className="text-[10px] text-red-700 mt-2 bg-red-50 px-2.5 py-1.5 rounded-lg border border-red-100">
                  {t.warning}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100">
                <button
                  disabled={!!clearing}
                  onClick={() => {
                    setConfirmTarget(t.id);
                    setConfirmInput("");
                    setStatus(null);
                  }}
                  className="w-full text-xs font-bold py-2 px-4 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-all flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  {isBusy && <span className="w-3.5 h-3.5 border-2 border-red-600/30 border-t-red-600 rounded-full animate-spin" />}
                  {isBusy ? "Clearing..." : "Delete Data"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirmation Modal */}
      {confirmTarget && (
        <DarkModal
          title="Confirm Destructive Action"
          onClose={() => setConfirmTarget(null)}
        >
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-100 rounded-xl p-3.5 text-xs text-red-600">
              This action will permanently delete documents from the database. Type <span className="font-mono font-bold underline">DELETE</span> below to confirm.
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Verification Text</label>
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="w-full bg-slate-50 border border-slate-200 focus:border-red-500/50 text-slate-800 placeholder-slate-400 text-sm rounded-xl px-4 py-2.5 outline-none transition-all"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmTarget(null)}
                className="flex-1 border border-slate-205 text-slate-500 py-2.5 rounded-xl text-sm hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={confirmInput !== "DELETE"}
                onClick={handleClear}
                className="flex-1 bg-red-600 hover:bg-red-500 disabled:bg-red-200 disabled:text-red-400 text-white py-2.5 rounded-xl text-sm font-bold transition-all"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </DarkModal>
      )}
    </div>
  );
}

// ─── Shared dark micro-components ─────────────────────────────────────────────

function DarkLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function DarkSection({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="glass-card rounded-2xl overflow-hidden border border-slate-200/80 shadow-sm bg-white">
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="px-5 py-5">{children}</div>
    </div>
  );
}

function DarkModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-card rounded-2xl shadow-2xl w-full max-w-md bg-white border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg leading-none transition-colors">✕</button>
        </div>
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

function DarkAlert({ type, children }: { type: "error" | "success"; children: React.ReactNode }) {
  return (
    <div className={`px-4 py-3 rounded-xl text-xs font-mono border ${type === "error" ? "bg-red-50 border-red-200 text-red-600" : "bg-green-50 border-green-200 text-green-600"}`}>
      {type === "error" ? "⚠ " : "✓ "}{children}
    </div>
  );
}

function DarkNumField({ label, value, min = 0, max, onChange, hint }: { label: string; value: number; min?: number; max?: number; onChange: (v: number) => void; hint?: string; }) {
  const [raw, setRaw] = useState(String(value));

  // Keep raw in sync when parent value changes externally (e.g. on load)
  useEffect(() => { setRaw(String(value)); }, [value]);

  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</label>
      <input
        type="text"
        inputMode="decimal"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onBlur={() => {
          const parsed = parseFloat(raw);
          const clamped = isNaN(parsed) ? 0 : Math.max(min ?? 0, max !== undefined ? Math.min(max, parsed) : parsed);
          onChange(clamped);
          setRaw(String(clamped));
        }}
        className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500/50 text-slate-800 placeholder-slate-400 text-sm rounded-xl px-4 py-2.5 outline-none transition-all"
      />
      {hint && <p className="text-[10px] text-slate-400">{hint}</p>}
    </div>
  );
}

function DarkStrField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-gray-700">{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-white border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 text-gray-800 placeholder-gray-400 text-sm rounded-lg px-4 py-2.5 outline-none transition-all" />
    </div>
  );
}