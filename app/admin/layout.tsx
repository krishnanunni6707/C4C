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
      className="min-h-screen"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 20% 0%, rgba(99,102,241,0.18) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 100%, rgba(168,85,247,0.12) 0%, transparent 60%), #0a0b14",
      }}
    >
      {/* Ambient orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-indigo-600/10 blur-[120px]" />
        <div className="absolute -bottom-40 -right-20 w-[500px] h-[500px] rounded-full bg-purple-600/10 blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-indigo-500/5 blur-[100px]" />
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
