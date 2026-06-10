"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import AdminHeader from "@/components/admin/AdminHeader";

// ── Shared types ──────────────────────────────────────────────────────────────

type Tab = "pricing" | "printers" | "staff";

// ── Root page — tab switcher ──────────────────────────────────────────────────

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("pricing");
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";

  const tabs: { value: Tab; label: string; superOnly?: boolean }[] = [
    { value: "pricing", label: "💰 Pricing & Payment" },
    { value: "printers", label: "🖨️ Printer Fleet" },
    { value: "staff", label: "👥 Staff", superOnly: true },
  ];

  return (
    <div className="p-8 max-w-4xl">
      <AdminHeader title="System Settings" />

      {/* Tab bar */}
      <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 mb-8 w-fit">
        {tabs.map((t) => {
          // Staff tab only visible to SUPER_ADMIN
          if (t.superOnly && !isSuperAdmin) {
            return (
              <div
                key={t.value}
                className="px-4 py-1.5 rounded-lg text-sm font-medium text-gray-400 cursor-not-allowed select-none flex items-center gap-1.5"
                title="Super Admin only"
              >
                {t.label}
                <span className="text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full">
                  soon
                </span>
              </div>
            );
          }
          return (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === t.value
                  ? "bg-gray-900 text-white"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "pricing" && <PricingTab />}
      {tab === "printers" && <PrintersTab />}
      {tab === "staff" && isSuperAdmin && <StaffTab />}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// TAB 1 — Pricing & Payment (unchanged from Phase 4A)
// ════════════════════════════════════════════════════════════════════════════════

interface PricingForm {
  bwPricePerSheet: number;
  colorPricePerSheet: number;
  tokenCharge: number;
  upiId: string;
  merchantName: string;
  qrCodeImageUrl: string;
}

const PRICING_DEFAULTS: PricingForm = {
  bwPricePerSheet: 2,
  colorPricePerSheet: 5,
  tokenCharge: 1,
  upiId: "",
  merchantName: "",
  qrCodeImageUrl: "",
};

function PricingTab() {
  const [form, setForm] = useState<PricingForm>(PRICING_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/settings");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const { settings: s = {} } = await res.json();
        setForm({
          bwPricePerSheet: s.bwPricePerSheet ?? PRICING_DEFAULTS.bwPricePerSheet,
          colorPricePerSheet: s.colorPricePerSheet ?? PRICING_DEFAULTS.colorPricePerSheet,
          tokenCharge: s.tokenCharge ?? PRICING_DEFAULTS.tokenCharge,
          upiId: s.upiId ?? "",
          merchantName: s.merchantName ?? "",
          qrCodeImageUrl: s.qrCodeImageUrl ?? "",
        });
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load settings");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const setNum = (key: keyof PricingForm, raw: string) => {
    const n = parseFloat(raw);
    setForm((f) => ({ ...f, [key]: isNaN(n) ? 0 : n }));
  };
  const setStr = (key: keyof PricingForm, val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  if (loading)
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
        <p className="text-gray-400">Loading…</p>
      </div>
    );

  return (
    <form onSubmit={handleSave} className="space-y-8 max-w-2xl">
      {/* Pricing */}
      <Section title="Print Pricing" subtitle="Cost per sheet used for job amount calculation">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <NumField label="B&W (₹/sheet)" value={form.bwPricePerSheet} step={0.5} onChange={(v) => setNum("bwPricePerSheet", v)} hint="Default ₹2" />
          <NumField label="Color (₹/sheet)" value={form.colorPricePerSheet} step={0.5} onChange={(v) => setNum("colorPricePerSheet", v)} hint="Default ₹5" />
          <NumField label="Token Charge (₹)" value={form.tokenCharge} step={0.5} onChange={(v) => setNum("tokenCharge", v)} hint="Token slip charge" />
        </div>
      </Section>

      {/* Payment */}
      <Section title="Payment Settings" subtitle="UPI details shown to students">
        <div className="space-y-5">
          <StrField label="UPI ID" value={form.upiId} onChange={(v) => setStr("upiId", v)} placeholder="printroom@upi" />
          <StrField label="Merchant Name" value={form.merchantName} onChange={(v) => setStr("merchantName", v)} placeholder="Campus Print Room" />
          <StrField label="QR Code Image URL" value={form.qrCodeImageUrl} onChange={(v) => setStr("qrCodeImageUrl", v)} placeholder="https://res.cloudinary.com/…" />
          {form.qrCodeImageUrl && (
            <div>
              <p className="text-xs text-gray-400 mb-2">Preview:</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={form.qrCodeImageUrl} alt="QR" className="w-28 h-28 object-contain border border-gray-200 rounded-lg"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
            </div>
          )}
        </div>
      </Section>

      {error && <Alert type="error">{error}</Alert>}
      {saved && <Alert type="success">✅ Settings saved successfully.</Alert>}

      <div className="flex justify-end">
        <SaveBtn saving={saving} label="Save Settings" />
      </div>
    </form>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// TAB 2 — Printer Fleet
// ════════════════════════════════════════════════════════════════════════════════

interface Printer {
  id: string;
  name: string;
  location: string;
  status: "ONLINE" | "OFFLINE";
  inkPercentage: number;
  paperPercentage: number;
  createdAt: { _seconds?: number } | string | null;
}

interface PrinterForm {
  name: string;
  location: string;
  inkPercentage: string;
  paperPercentage: string;
}

const EMPTY_PRINTER: PrinterForm = {
  name: "",
  location: "",
  inkPercentage: "100",
  paperPercentage: "100",
};

function PrintersTab() {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Add modal
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<PrinterForm>(EMPTY_PRINTER);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  // Edit modal
  const [editPrinter, setEditPrinter] = useState<Printer | null>(null);
  const [editForm, setEditForm] = useState<PrinterForm>(EMPTY_PRINTER);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  const fetchPrinters = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/printers");
      if (res.ok) {
        const data = await res.json();
        setPrinters(data.printers ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrinters();
  }, [fetchPrinters]);

  // ── Add ──────────────────────────────────────────────────────────────────

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");
    setAddLoading(true);
    try {
      const res = await fetch("/api/admin/printers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addForm.name,
          location: addForm.location,
          inkPercentage: Number(addForm.inkPercentage),
          paperPercentage: Number(addForm.paperPercentage),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setAddError(data.error ?? "Failed to add printer");
        return;
      }
      setShowAdd(false);
      setAddForm(EMPTY_PRINTER);
      await fetchPrinters();
    } finally {
      setAddLoading(false);
    }
  }

  // ── Edit ─────────────────────────────────────────────────────────────────

  function openEdit(p: Printer) {
    setEditPrinter(p);
    setEditForm({
      name: p.name,
      location: p.location,
      inkPercentage: String(p.inkPercentage),
      paperPercentage: String(p.paperPercentage),
    });
    setEditError("");
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editPrinter) return;
    setEditError("");
    setEditLoading(true);
    try {
      const res = await fetch(`/api/admin/printers/${editPrinter.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          location: editForm.location,
          inkPercentage: Number(editForm.inkPercentage),
          paperPercentage: Number(editForm.paperPercentage),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setEditError(data.error ?? "Failed to update printer");
        return;
      }
      setEditPrinter(null);
      await fetchPrinters();
    } finally {
      setEditLoading(false);
    }
  }

  // ── Toggle status ─────────────────────────────────────────────────────────

  async function toggleStatus(p: Printer) {
    const newStatus = p.status === "ONLINE" ? "OFFLINE" : "ONLINE";
    setBusyId(p.id);
    try {
      await fetch(`/api/admin/printers/${p.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      await fetchPrinters();
    } finally {
      setBusyId(null);
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete(p: Printer) {
    if (!confirm(`Remove printer "${p.name}"? This cannot be undone.`)) return;
    setBusyId(p.id);
    try {
      await fetch(`/api/admin/printers/${p.id}`, { method: "DELETE" });
      await fetchPrinters();
    } finally {
      setBusyId(null);
    }
  }

  // ── Ink / paper gauge ─────────────────────────────────────────────────────

  function Gauge({ value, color }: { value: number; color: string }) {
    return (
      <div className="flex items-center gap-2 min-w-[80px]">
        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${color}`}
            style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
          />
        </div>
        <span className="text-xs text-gray-500 w-8 text-right">{value}%</span>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Printer Fleet</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {printers.length} printer{printers.length !== 1 ? "s" : ""} registered
          </p>
        </div>
        <button
          onClick={() => { setShowAdd(true); setAddError(""); }}
          className="text-sm bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors font-medium"
        >
          ➕ Add Printer
        </button>
      </div>

      {/* Raspberry Pi notice */}
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 flex items-center justify-between">
        <p className="text-sm text-blue-700">
          🔌 <strong>Raspberry Pi Integration</strong> — Hardware control will be enabled in a future phase.
        </p>
        <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium">
          Soon
        </span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <p className="text-gray-400">Loading printers…</p>
        </div>
      ) : printers.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <span className="text-5xl">🖨️</span>
          <p className="mt-4 text-gray-400 text-sm">No printers registered yet</p>
          <button
            onClick={() => setShowAdd(true)}
            className="mt-4 text-sm text-blue-600 hover:underline"
          >
            Add your first printer →
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-left">
                  {["Name", "Location", "Status", "Ink", "Paper", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {printers.map((p) => {
                  const busy = busyId === p.id;
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      {/* Name */}
                      <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>

                      {/* Location */}
                      <td className="px-4 py-3 text-gray-600">{p.location}</td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          p.status === "ONLINE"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}>
                          {p.status === "ONLINE" ? "● ONLINE" : "○ OFFLINE"}
                        </span>
                      </td>

                      {/* Ink */}
                      <td className="px-4 py-3">
                        <Gauge
                          value={p.inkPercentage}
                          color={p.inkPercentage > 30 ? "bg-blue-500" : "bg-red-500"}
                        />
                      </td>

                      {/* Paper */}
                      <td className="px-4 py-3">
                        <Gauge
                          value={p.paperPercentage}
                          color={p.paperPercentage > 30 ? "bg-amber-500" : "bg-red-500"}
                        />
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 flex-wrap">
                          <button
                            disabled={busy}
                            onClick={() => openEdit(p)}
                            className="text-xs border border-gray-300 text-gray-600 px-2 py-1 rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
                          >
                            Edit
                          </button>
                          <button
                            disabled={busy}
                            onClick={() => toggleStatus(p)}
                            className={`text-xs text-white px-2 py-1 rounded transition-colors disabled:opacity-50 ${
                              p.status === "ONLINE"
                                ? "bg-orange-500 hover:bg-orange-600"
                                : "bg-green-600 hover:bg-green-700"
                            }`}
                          >
                            {busy ? "…" : p.status === "ONLINE" ? "Disable" : "Enable"}
                          </button>
                          <button
                            disabled={busy}
                            onClick={() => handleDelete(p)}
                            className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 transition-colors disabled:opacity-50"
                          >
                            Remove
                          </button>
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

      {/* ── Add Printer Modal ────────────────────────────────────────────── */}
      {showAdd && (
        <Modal title="Add Printer" onClose={() => { setShowAdd(false); setAddForm(EMPTY_PRINTER); }}>
          <form onSubmit={handleAdd} className="space-y-4">
            {addError && <Alert type="error">{addError}</Alert>}
            <StrField label="Printer Name *" value={addForm.name}
              onChange={(v) => setAddForm((f) => ({ ...f, name: v }))} placeholder="e.g. HP LaserJet 1020" />
            <StrField label="Location *" value={addForm.location}
              onChange={(v) => setAddForm((f) => ({ ...f, location: v }))} placeholder="e.g. Library - Room 102" />
            <div className="grid grid-cols-2 gap-4">
              <NumField label="Ink (%)" value={Number(addForm.inkPercentage)} min={0} max={100}
                onChange={(v) => setAddForm((f) => ({ ...f, inkPercentage: v }))} />
              <NumField label="Paper (%)" value={Number(addForm.paperPercentage)} min={0} max={100}
                onChange={(v) => setAddForm((f) => ({ ...f, paperPercentage: v }))} />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => { setShowAdd(false); setAddForm(EMPTY_PRINTER); }}
                className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={addLoading}
                className="flex-1 bg-gray-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50">
                {addLoading ? "Adding…" : "Add Printer"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Edit Printer Modal ───────────────────────────────────────────── */}
      {editPrinter && (
        <Modal title={`Edit — ${editPrinter.name}`} onClose={() => setEditPrinter(null)}>
          <form onSubmit={handleEdit} className="space-y-4">
            {editError && <Alert type="error">{editError}</Alert>}
            <StrField label="Printer Name *" value={editForm.name}
              onChange={(v) => setEditForm((f) => ({ ...f, name: v }))} />
            <StrField label="Location *" value={editForm.location}
              onChange={(v) => setEditForm((f) => ({ ...f, location: v }))} />
            <div className="grid grid-cols-2 gap-4">
              <NumField label="Ink (%)" value={Number(editForm.inkPercentage)} min={0} max={100}
                onChange={(v) => setEditForm((f) => ({ ...f, inkPercentage: v }))} />
              <NumField label="Paper (%)" value={Number(editForm.paperPercentage)} min={0} max={100}
                onChange={(v) => setEditForm((f) => ({ ...f, paperPercentage: v }))} />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setEditPrinter(null)}
                className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={editLoading}
                className="flex-1 bg-gray-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50">
                {editLoading ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// TAB 3 — Staff (SUPER_ADMIN only): Locations + Admin Accounts
// ════════════════════════════════════════════════════════════════════════════════

interface Location {
  id: string;
  name: string;
  isActive: boolean;
  building?: string;
  floor?: string;
}

interface AdminUser {
  id: string;
  name: string;
  admissionNumber: string;
  locationId?: string | null;
  status: "ACTIVE" | "DISABLED";
}

function StaffTab() {
  const [subTab, setSubTab] = useState<"locations" | "admins">("locations");

  return (
    <div>
      {/* Sub-tab bar */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        {(["locations", "admins"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
              subTab === t ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "locations" ? "🏢 Locations" : "👤 Admin Accounts"}
          </button>
        ))}
      </div>

      {subTab === "locations" && <LocationsSection />}
      {subTab === "admins" && <AdminAccountsSection />}
    </div>
  );
}

// ── Locations Section ─────────────────────────────────────────────────────────

function LocationsSection() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", building: "", floor: "" });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const [globalError, setGlobalError] = useState("");

  const fetchLocations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/locations");
      if (res.ok) setLocations((await res.json()).locations ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLocations(); }, [fetchLocations]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");
    setAddLoading(true);
    try {
      const res = await fetch("/api/admin/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setAddError(d.error ?? "Failed to create location");
        return;
      }
      setShowAdd(false);
      setAddForm({ name: "", building: "", floor: "" });
      await fetchLocations();
    } finally {
      setAddLoading(false);
    }
  }

  async function toggleActive(loc: Location) {
    setBusyId(loc.id);
    setGlobalError("");
    try {
      const res = await fetch(`/api/admin/locations/${loc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !loc.isActive }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setGlobalError(d.error ?? "Failed to update location");
      }
      await fetchLocations();
    } finally {
      setBusyId(null);
    }
  }

  async function runMigration() {
    if (!confirm("Run one-time migration? This assigns all orphaned print jobs to the default location.")) return;
    setGlobalError("");
    try {
      const res = await fetch("/api/admin/migrate-locations", { method: "POST" });
      const d = await res.json();
      if (res.ok) {
        alert(`Migration complete. ${d.patchedJobs} jobs assigned to "${d.defaultLocation?.name}".`);
        await fetchLocations();
      } else {
        setGlobalError(d.error ?? "Migration failed");
      }
    } catch {
      setGlobalError("Migration failed");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Print Locations</h2>
          <p className="text-xs text-gray-500 mt-0.5">{locations.length} location{locations.length !== 1 ? "s" : ""} registered</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={runMigration}
            className="text-xs border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
            title="Assign orphaned jobs to the default location"
          >
            🔧 Run Migration
          </button>
          <button
            onClick={() => { setShowAdd(true); setAddError(""); }}
            className="text-sm bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors font-medium"
          >
            ➕ Add Location
          </button>
        </div>
      </div>

      {globalError && <Alert type="error">{globalError}</Alert>}

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center"><p className="text-gray-400">Loading…</p></div>
      ) : locations.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <span className="text-4xl">🏢</span>
          <p className="mt-3 text-gray-400 text-sm">No locations yet. Add one to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-left">
                {["Name", "Building", "Floor", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {locations.map((loc) => {
                const busy = busyId === loc.id;
                return (
                  <tr key={loc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{loc.name}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{loc.building ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{loc.floor ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${loc.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {loc.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        disabled={busy}
                        onClick={() => toggleActive(loc)}
                        className={`text-xs text-white px-2 py-1 rounded transition-colors disabled:opacity-50 ${loc.isActive ? "bg-orange-500 hover:bg-orange-600" : "bg-green-600 hover:bg-green-700"}`}
                      >
                        {busy ? "…" : loc.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <Modal title="Add Location" onClose={() => { setShowAdd(false); setAddForm({ name: "", building: "", floor: "" }); }}>
          <form onSubmit={handleAdd} className="space-y-4">
            {addError && <Alert type="error">{addError}</Alert>}
            <StrField label="Location Name *" value={addForm.name}
              onChange={(v) => setAddForm((f) => ({ ...f, name: v }))} placeholder="e.g. Library Print Room" />
            <StrField label="Building (optional)" value={addForm.building}
              onChange={(v) => setAddForm((f) => ({ ...f, building: v }))} placeholder="e.g. Main Block" />
            <StrField label="Floor (optional)" value={addForm.floor}
              onChange={(v) => setAddForm((f) => ({ ...f, floor: v }))} placeholder="e.g. Ground Floor" />
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setShowAdd(false)}
                className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={addLoading}
                className="flex-1 bg-gray-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors">
                {addLoading ? "Creating…" : "Create Location"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ── Admin Accounts Section ────────────────────────────────────────────────────

function AdminAccountsSection() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "", admissionNumber: "", department: "Admin", semester: "1",
    email: "", password: "", locationId: "",
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const [globalError, setGlobalError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, locsRes] = await Promise.all([
        fetch("/api/admin/students"),
        fetch("/api/admin/locations"),
      ]);
      const usersData = usersRes.ok ? await usersRes.json() : { users: [] };
      const locsData = locsRes.ok ? await locsRes.json() : { locations: [] };
      setAdmins((usersData.users ?? []).filter((u: AdminUser & { role: string }) => u.role === "ADMIN" || u.role === "SUPER_ADMIN"));
      setLocations(locsData.locations ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function locationName(id?: string | null) {
    if (!id) return "—";
    return locations.find((l) => l.id === id)?.name ?? id;
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");
    setAddLoading(true);
    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addForm.name,
          admissionNumber: addForm.admissionNumber,
          department: addForm.department || "Admin",
          semester: Number(addForm.semester) || 1,
          email: addForm.email || undefined,
          password: addForm.password || undefined,
          role: "ADMIN",
          locationId: addForm.locationId,
        }),
      });
      const d = await res.json();
      if (!res.ok) { setAddError(d.error ?? "Failed to create admin"); return; }
      if (d.user?.tempPassword) {
        alert(`Admin created.\nAdmission No: ${addForm.admissionNumber.toUpperCase()}\nTemp Password: ${d.user.tempPassword}\n\nShare this with the admin.`);
      }
      setShowAdd(false);
      setAddForm({ name: "", admissionNumber: "", department: "Admin", semester: "1", email: "", password: "", locationId: "" });
      await fetchData();
    } finally {
      setAddLoading(false);
    }
  }

  async function toggleStatus(admin: AdminUser) {
    const newStatus = admin.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    setBusyId(admin.id);
    setGlobalError("");
    try {
      const res = await fetch(`/api/admin/students/${admin.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setGlobalError(d.error ?? "Failed to update status");
      }
      await fetchData();
    } finally {
      setBusyId(null);
    }
  }

  async function resetPassword(admin: AdminUser) {
    if (!confirm(`Reset password for ${admin.name}?`)) return;
    setBusyId(admin.id);
    setGlobalError("");
    try {
      const res = await fetch(`/api/admin/students/${admin.id}/reset-password`, { method: "POST" });
      const d = await res.json();
      if (res.ok) alert(`Password reset.\nNew temp password: ${d.tempPassword}\n\nShare this with the admin.`);
      else setGlobalError(d.error ?? "Failed to reset password");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Admin Accounts</h2>
          <p className="text-xs text-gray-500 mt-0.5">{admins.length} admin{admins.length !== 1 ? "s" : ""} registered</p>
        </div>
        <button
          onClick={() => { setShowAdd(true); setAddError(""); }}
          className="text-sm bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors font-medium"
        >
          ➕ Add Admin
        </button>
      </div>

      {globalError && <Alert type="error">{globalError}</Alert>}

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center"><p className="text-gray-400">Loading…</p></div>
      ) : admins.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <span className="text-4xl">👤</span>
          <p className="mt-3 text-gray-400 text-sm">No admin accounts yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-left">
                {["Name", "Admission No", "Assigned Location", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {admins.map((admin) => {
                const busy = busyId === admin.id;
                return (
                  <tr key={admin.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{admin.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{admin.admissionNumber}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{locationName(admin.locationId)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${admin.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {admin.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        <button disabled={busy} onClick={() => toggleStatus(admin)}
                          className={`text-xs text-white px-2 py-1 rounded transition-colors disabled:opacity-50 ${admin.status === "ACTIVE" ? "bg-orange-500 hover:bg-orange-600" : "bg-green-600 hover:bg-green-700"}`}>
                          {busy ? "…" : admin.status === "ACTIVE" ? "Disable" : "Enable"}
                        </button>
                        <button disabled={busy} onClick={() => resetPassword(admin)}
                          className="text-xs border border-gray-300 text-gray-600 px-2 py-1 rounded hover:bg-gray-50 transition-colors disabled:opacity-50">
                          Reset Pwd
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <Modal title="Create Admin Account" onClose={() => setShowAdd(false)}>
          <form onSubmit={handleAdd} className="space-y-4">
            {addError && <Alert type="error">{addError}</Alert>}
            <StrField label="Full Name *" value={addForm.name} onChange={(v) => setAddForm((f) => ({ ...f, name: v }))} placeholder="e.g. Ravi Kumar" />
            <StrField label="Admission / Staff No *" value={addForm.admissionNumber} onChange={(v) => setAddForm((f) => ({ ...f, admissionNumber: v }))} placeholder="e.g. ADMIN002" />
            <StrField label="Email (optional)" value={addForm.email} onChange={(v) => setAddForm((f) => ({ ...f, email: v }))} placeholder="admin@campus.edu" />
            <StrField label="Initial Password (optional)" value={addForm.password} onChange={(v) => setAddForm((f) => ({ ...f, password: v }))} placeholder="Leave blank to auto-generate" />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Assigned Location *</label>
              <select
                value={addForm.locationId}
                onChange={(e) => setAddForm((f) => ({ ...f, locationId: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                required
              >
                <option value="">Select a location…</option>
                {locations.filter((l) => l.isActive).map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setShowAdd(false)}
                className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={addLoading}
                className="flex-1 bg-gray-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors">
                {addLoading ? "Creating…" : "Create Admin"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// Shared micro-components
// ════════════════════════════════════════════════════════════════════════════════

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
        <h2 className="font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function Alert({ type, children }: { type: "error" | "success"; children: React.ReactNode }) {
  return (
    <div className={`px-4 py-3 rounded-lg text-sm ${type === "error"
      ? "bg-red-50 border border-red-200 text-red-700"
      : "bg-green-50 border border-green-200 text-green-700"}`}>
      {children}
    </div>
  );
}

function NumField({ label, value, min, max, step, onChange, hint }: {
  label: string; value: number; min?: number; max?: number; step?: number;
  onChange: (v: string) => void; hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <input type="number" min={min ?? 0} max={max} step={step ?? 1} value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function StrField({ label, value, onChange, placeholder, hint }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function SaveBtn({ saving, label }: { saving: boolean; label: string }) {
  return (
    <button type="submit" disabled={saving}
      className="bg-gray-900 text-white px-8 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center gap-2">
      {saving ? (
        <><span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving…</>
      ) : label}
    </button>
  );
}
