import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import AdminNavbar from "@/components/admin/AdminNavbar";
import { getLocationById } from "@/lib/firestore/locations";

export const metadata = {
  title: "Admin — QDoc Campus Printing",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") redirect("/student");

  let locationName: string | null = null;
  if (session.user.role === "ADMIN" && session.user.locationId) {
    const loc = await getLocationById(session.user.locationId);
    locationName = loc?.name ?? null;
  }

  return (
    <div
      className="min-h-screen text-slate-800"
      style={{
        background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
      }}
    >
      {/* Ambient orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-indigo-500/[0.04] blur-[120px]" />
        <div className="absolute -bottom-40 -right-20 w-[500px] h-[500px] rounded-full bg-purple-500/[0.03] blur-[120px]" />
      </div>

      {/* Top navbar */}
      <AdminNavbar adminName={session.user.name} locationName={locationName} />

      {/* Page content — offset by navbar height */}
      <main className="relative z-10 pt-14 min-h-screen">
        {children}
      </main>
    </div>
  );
}
