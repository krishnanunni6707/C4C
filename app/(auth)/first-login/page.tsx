"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function FirstLoginPage() {
  const router = useRouter();
  const { data: session, status, update } = useSession();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (status === "authenticated" && !session?.user?.firstLogin) {
      if (session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN") {
        router.replace("/admin/dashboard");
      } else {
        router.replace("/student");
      }
    }
  }, [status, session, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to update password. Please try again.");
        return;
      }

      await update({ firstLogin: false });

      if (session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN") {
        router.push("/admin/dashboard");
      } else {
        router.push("/student");
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") return null;

  const EyeIcon = ({ open }: { open: boolean }) =>
    open ? (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
      </svg>
    ) : (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </svg>
    );

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{
        background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 60%, #e2e8f0 100%)",
      }}
    >
      {/* Faint grid */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(#4f46e5 1px, transparent 1px), linear-gradient(to right, #4f46e5 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative z-10 w-full max-w-sm">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-8 shadow-xl shadow-slate-200/50">

          {/* Header */}
          <div className="mb-7">
            <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 text-[10px] font-bold text-amber-700 uppercase tracking-widest font-mono mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
              First Login
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Set your password</h1>
            <p className="text-sm text-slate-500 mt-1">
              Welcome, <span className="text-slate-950 font-semibold">{session?.user?.name}</span>. Set a new password to continue.
            </p>
          </div>

          {/* Notice */}
          <div className="bg-amber-50 border border-amber-200/50 rounded-xl px-4 py-3 mb-5 text-[11px] text-amber-700 font-mono">
            You must change your password before accessing the system.
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-xs font-mono">
                ⚠ {error}
              </div>
            )}

            {/* New password */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  required
                  autoFocus
                  autoComplete="new-password"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/20 text-slate-900 placeholder-slate-400 rounded-xl px-4 py-3 pr-11 text-sm font-mono outline-none transition-all"
                />
                <button type="button" onClick={() => setShowNew((v) => !v)} tabIndex={-1} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  <EyeIcon open={showNew} />
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                  required
                  autoComplete="new-password"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/20 text-slate-900 placeholder-slate-400 rounded-xl px-4 py-3 pr-11 text-sm font-mono outline-none transition-all"
                />
                <button type="button" onClick={() => setShowConfirm((v) => !v)} tabIndex={-1} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  <EyeIcon open={showConfirm} />
                </button>
              </div>
            </div>

            {/* Strength hint */}
            {newPassword.length > 0 && (
              <div className="flex items-center gap-2">
                {[4, 6, 8, 10].map((threshold) => (
                  <div
                    key={threshold}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      newPassword.length >= threshold ? "bg-indigo-500" : "bg-slate-200"
                    }`}
                  />
                ))}
                <span className="text-[10px] font-mono text-gray-500 whitespace-nowrap">
                  {newPassword.length < 6 ? "Weak" : newPassword.length < 8 ? "Fair" : newPassword.length < 10 ? "Good" : "Strong"}
                </span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-sm py-3.5 rounded-xl transition-colors shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  Set Password & Continue
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
