"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  FileText,
  Trash2,
  Search,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Layers,
  HardDrive,
  FileCheck,
  ShieldAlert,
} from "lucide-react";

type MainTab = "pricing" | "printers" | "centers" | "files" | "danger";

export default function SettingsPage() {
  const [tab, setTab] = useState<MainTab>("pricing");
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";

  const TABS: { value: MainTab; label: string; superOnly?: boolean }[] = [
    { value: "pricing",  label: "Pricing" },
    { value: "printers", label: "Printers" },
    { value: "centers",  label: "Printer Centers", superOnly: true },
    { value: "files",    label: "Uploaded Files",  superOnly: true },
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
      {tab === "files"    && isSuperAdmin && <UploadedFilesTab />}
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
          <button onClick={() => setNewPw(null)} aria-label="Close" className="text-slate-400 hover:text-slate-650 p-1 ml-4 transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {centers.length === 0 ? (
        <div className="glass-card rounded-2xl p-16 text-center border border-slate-200/80 shadow-sm flex flex-col items-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500 mb-3">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24-1.03.447-2.079 1.503-2.079h7.554c1.056 0 1.743 1.049 1.503 2.079l-1.08 4.629c-.18.772-.87 1.32-1.662 1.32H9.462c-.792 0-1.482-.548-1.662-1.32l-1.08-4.629Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 9V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v5" />
            </svg>
          </div>
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
            <div className="text-center py-2 flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center text-green-600 mb-3">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </div>
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

// ─── Uploaded Files Tab ───────────────────────────────────────────────────────

interface UploadedFileItem {
  id: string;
  tokenNumber: string;
  fileName: string;
  totalPages: number;
  copies: number;
  amount: number;
  colorMode: string;
  studentName: string;
  admissionNumber: string;
  status: string;
  createdAt: string | null;
  fileDeleted: boolean;
  fileDeletedAt: string | null;
  fileDeletedByName: string | null;
}

interface UploadStats {
  totalUploads: number;
  activeInStorage: number;
  deletedFiles: number;
}

function UploadedFilesTab() {
  const [files, setFiles] = useState<UploadedFileItem[]>([]);
  const [stats, setStats] = useState<UploadStats>({ totalUploads: 0, activeInStorage: 0, deletedFiles: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "deleted">("all");
  const [confirmModal, setConfirmModal] = useState<{
    action: "delete_job" | "purge_completed" | "purge_all";
    file?: UploadedFileItem;
    title: string;
    description: string;
    dangerPrompt?: string;
  } | null>(null);
  const [dangerConfirmText, setDangerConfirmText] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/files");
      if (!res.ok) {
        throw new Error((await res.json().catch(() => ({}))).error || "Failed to load uploaded files");
      }
      const data = await res.json();
      setFiles(data.files || []);
      setStats(data.stats || { totalUploads: 0, activeInStorage: 0, deletedFiles: 0 });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load files");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const executeAction = async () => {
    if (!confirmModal) return;
    if (confirmModal.dangerPrompt && dangerConfirmText !== confirmModal.dangerPrompt) {
      setToastMessage({ type: "error", text: `Please type "${confirmModal.dangerPrompt}" to confirm.` });
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: confirmModal.action,
          jobId: confirmModal.file?.id,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Action failed");

      setToastMessage({ type: "success", text: data.message || "Operation completed successfully." });
      setConfirmModal(null);
      setDangerConfirmText("");
      await fetchFiles();
    } catch (err: unknown) {
      setToastMessage({ type: "error", text: err instanceof Error ? err.message : "Operation failed" });
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      return new Intl.DateTimeFormat("en-IN", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
      }).format(d);
    } catch {
      return iso;
    }
  };

  const filtered = files.filter((f) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      f.fileName.toLowerCase().includes(q) ||
      f.studentName.toLowerCase().includes(q) ||
      f.admissionNumber.toLowerCase().includes(q) ||
      f.tokenNumber.toLowerCase().includes(q);

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && !f.fileDeleted) ||
      (statusFilter === "deleted" && f.fileDeleted);

    return matchesSearch && matchesStatus;
  });

  if (loading) return <DarkLoader />;

  return (
    <div className="space-y-5">
      {/* Header + Purge Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-800">User Uploaded Files</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage and permanently delete documents uploaded by students across all print centers.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setDangerConfirmText("");
              setConfirmModal({
                action: "purge_completed",
                title: "Purge Finished Job Files",
                description:
                  "Permanently delete files from Cloudinary storage for all jobs marked as Ready, Collected, or Cancelled. Student job records remain preserved.",
              });
            }}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5 text-slate-500" />
            <span>Purge Finished Jobs</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setDangerConfirmText("");
              setConfirmModal({
                action: "purge_all",
                title: "Purge All Files in Storage",
                description:
                  "Permanently delete all active documents from Cloudinary storage across the entire system. Type DELETE below to proceed.",
                dangerPrompt: "DELETE",
              });
            }}
            className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>Purge All Files</span>
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="mt-2">
          <DarkAlert type={toastMessage.type}>{toastMessage.text}</DarkAlert>
        </div>
      )}

      {error && <DarkAlert type="error">{error}</DarkAlert>}

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Uploads</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{stats.totalUploads}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <Cloud className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active in Storage</p>
            <p className="text-xl font-bold text-emerald-600 mt-0.5">{stats.activeInStorage}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Deleted / Purged</p>
            <p className="text-xl font-bold text-rose-600 mt-0.5">{stats.deletedFiles}</p>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by file name, student, or token…"
            className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl pl-9 pr-4 py-2 outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
          {(["all", "active", "deleted"] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg capitalize transition-all ${
                statusFilter === filter
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Uploaded Files Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3 px-4">Token</th>
                <th className="py-3 px-4">File Name</th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Uploaded</th>
                <th className="py-3 px-4">Storage Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                    No files found matching your search.
                  </td>
                </tr>
              ) : (
                filtered.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <Link
                        href={`/admin/queue/${f.tokenNumber}`}
                        className="inline-flex items-center gap-1 font-mono font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                      >
                        <span>{f.tokenNumber}</span>
                        <ExternalLink className="w-3 h-3 opacity-60" />
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="truncate font-semibold text-slate-850" title={f.fileName}>
                          {f.fileName}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {f.totalPages} {f.totalPages === 1 ? "page" : "pages"} • {f.copies} {f.copies === 1 ? "copy" : "copies"} • {f.colorMode}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-850">{f.studentName}</p>
                      <p className="text-[10px] font-mono text-slate-400">{f.admissionNumber}</p>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                      {formatDate(f.createdAt)}
                    </td>
                    <td className="py-3.5 px-4">
                      {f.fileDeleted ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                          <Trash2 className="w-3 h-3" />
                          <span>Deleted</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                          <Cloud className="w-3 h-3 text-emerald-600" />
                          <span>Active in Cloudinary</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {f.fileDeleted ? (
                        <span className="text-[11px] text-slate-400 italic">Purged</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setDangerConfirmText("");
                            setConfirmModal({
                              action: "delete_job",
                              file: f,
                              title: `Delete File for #${f.tokenNumber}?`,
                              description: `Permanently delete "${f.fileName}" from Cloudinary storage. Job metadata and transaction history will remain intact.`,
                            });
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-colors inline-flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3 text-rose-600" />
                          <span>Delete</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModal && (
        <DarkModal title={confirmModal.title} onClose={() => setConfirmModal(null)}>
          <div className="space-y-4">
            <div className="bg-rose-50 border border-rose-100 rounded-xl p-3.5 text-xs text-rose-700 leading-relaxed">
              {confirmModal.description}
            </div>

            {confirmModal.dangerPrompt && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Type <span className="font-mono text-rose-600 underline">{confirmModal.dangerPrompt}</span> to confirm
                </label>
                <input
                  type="text"
                  value={dangerConfirmText}
                  onChange={(e) => setDangerConfirmText(e.target.value)}
                  placeholder={`Type ${confirmModal.dangerPrompt} to confirm`}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 text-slate-800 text-sm rounded-xl px-4 py-2.5 outline-none transition-all font-mono"
                />
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setConfirmModal(null)}
                className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading || (!!confirmModal.dangerPrompt && dangerConfirmText !== confirmModal.dangerPrompt)}
                onClick={executeAction}
                className="flex-1 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs"
              >
                {actionLoading && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                <span>{actionLoading ? "Deleting…" : "Confirm Delete"}</span>
              </button>
            </div>
          </div>
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
      id: "uploadedFiles",
      title: "Purge All Uploaded Files",
      desc: "Permanently deletes all raw PDF and document files uploaded by users from Cloudinary storage while keeping print job records.",
      warning: "Students and admins will no longer be able to preview or download these files.",
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
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-red-600 flex-shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <span>Danger Zone</span>
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
          <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-600 p-1 transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

function DarkAlert({ type, children }: { type: "error" | "success"; children: React.ReactNode }) {
  return (
    <div className={`px-4 py-3 rounded-xl text-xs font-mono border flex items-center gap-2 ${type === "error" ? "bg-red-50 border-red-200 text-red-600" : "bg-green-50 border-green-200 text-green-600"}`}>
      {type === "error" ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-red-600 flex-shrink-0">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4 text-green-600 flex-shrink-0">
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
      )}
      <span>{children}</span>
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