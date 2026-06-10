"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  const router = useRouter();
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [password, setPassword] = useState("");
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
          setError("Your account has been disabled. Please contact the admin.");
        } else {
          setError("Invalid admission number or password.");
        }
        return;
      }

      // Fetch session to check firstLogin and role
      const sessionRes = await fetch("/api/auth/session");
      const session = await sessionRes.json();

      if (session?.user?.firstLogin) {
        router.push("/first-login");
        return;
      }

      if (session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN") {
        router.push("/admin/dashboard");
      } else {
        router.push("/dashboard");
      }

      router.refresh();
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🖨️</div>
          <h1 className="text-3xl font-bold text-gray-900">Smart Campus Printing</h1>
          <p className="text-gray-500 mt-2 text-sm">Sign in with your admission number</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <Input
            label="Admission Number"
            type="text"
            value={admissionNumber}
            onChange={(e) => setAdmissionNumber(e.target.value)}
            placeholder="e.g. S1001 or ADMIN001"
            required
            autoFocus
            autoComplete="username"
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
            autoComplete="current-password"
          />

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-400">
          Contact the admin if you don&apos;t have an account.
        </p>
      </div>
    </div>
  );
}
