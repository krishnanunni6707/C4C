"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import {
  ArrowLeft,
  ArrowRight,
  User,
  Lock,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

export default function LoginForm() {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();

  const [admissionNumber, setAdmissionNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        admissionNumber: admissionNumber.trim().toUpperCase(),
        password,
        redirect: false,
      });

      if (result?.error) {
        if (result.error.includes("ACCOUNT_DISABLED")) {
          setError(
            "Your account is disabled. Please contact your college admin."
          );
        } else {
          setError("Invalid admission number or password.");
        }
        return;
      }

      const sessionRes = await fetch("/api/auth/session");
      const session = await sessionRes.json();

      if (session?.user?.firstLogin) {
        router.push("/first-login");
        return;
      }

      if (
        session?.user?.role === "ADMIN" ||
        session?.user?.role === "SUPER_ADMIN"
      ) {
        router.push("/admin/dashboard");
      } else {
        router.push("/student");
      }

      router.refresh();
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[480px] mx-auto flex flex-col justify-center">
      {/* Top Navigation: Back to Home */}
      <div className="mb-4 sm:mb-5">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-md py-0.5"
          aria-label="Back to home page"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to home</span>
        </Link>
      </div>

      {/* Main Form Card */}
      <motion.div
        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="bg-white border border-slate-200/60 rounded-2xl p-6 sm:p-9 md:p-10 shadow-[0_20px_50px_-15px_rgba(15,23,42,0.06),0_2px_8px_-2px_rgba(15,23,42,0.03)]"
      >
        {/* Error Banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={
                shouldReduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, height: 0, marginBottom: 0 }
              }
              animate={{ opacity: 1, height: "auto", marginBottom: 20 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.25 }}
              role="alert"
              aria-live="polite"
              className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-lg text-xs sm:text-[13px] font-medium flex items-center gap-2.5 overflow-hidden"
            >
              {/* Solid red circle with white exclamation icon */}
              <svg
                className="w-5 h-5 min-w-[20px] text-rose-500 flex-shrink-0"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Card Heading */}
        <div className="mb-6 sm:mb-7">
          <h1 className="text-3xl sm:text-[38px] font-extrabold text-[#0F172A] tracking-tight leading-tight">
            Welcome back
          </h1>
          <p className="text-sm sm:text-[17px] text-slate-500 mt-1 font-normal">
            Sign in to your student account
          </p>
        </div>

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5" noValidate>
          {/* Admission Number */}
          <div>
            <label
              htmlFor="admissionNumber"
              className="text-xs sm:text-sm font-semibold text-slate-700 block mb-2"
            >
              Admission Number
            </label>
            <div className="relative flex items-center">
              <User
                className="w-5 h-5 text-slate-400 absolute left-4 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="admissionNumber"
                name="admissionNumber"
                type="text"
                value={admissionNumber}
                onChange={(e) =>
                  setAdmissionNumber(e.target.value.toUpperCase())
                }
                placeholder="CS21B042"
                required
                autoFocus
                autoComplete="username"
                className={`w-full h-14 bg-white border ${
                  error ? "border-rose-300" : "border-slate-200"
                } rounded-[10px] pl-12 pr-4 text-sm sm:text-base font-medium text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20`}
                aria-describedby={error ? "auth-error" : undefined}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="text-xs sm:text-sm font-semibold text-slate-700 block mb-2 mt-4"
            >
              Password
            </label>
            <div className="relative flex items-center">
              <Lock
                className="w-5 h-5 text-slate-400 absolute left-4 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className={`w-full h-14 bg-white border ${
                  error ? "border-rose-300" : "border-slate-200"
                } rounded-[10px] pl-12 pr-12 text-sm sm:text-base font-medium text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20`}
                aria-describedby={error ? "auth-error" : undefined}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3.5 p-1 text-slate-400 hover:text-slate-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-md"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2 sm:pt-3">
            <motion.button
              type="submit"
              disabled={loading}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
              className="w-full h-14 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 disabled:opacity-50 text-white font-semibold text-base rounded-[10px] transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Signing in…</span>
                </>
              ) : (
                <>
                  <span>Sign in</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </motion.button>
          </div>
        </form>

        {/* Helper text under button */}
        <p className="mt-5 sm:mt-6 text-center text-xs sm:text-[13px] text-slate-400 font-normal">
          No account? Your college admin creates it for you.
        </p>
      </motion.div>
    </div>
  );
}
