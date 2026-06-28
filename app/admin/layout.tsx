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
    <div className="min-h-screen bg-[#F8FAFC] text-gray-900">
      <AdminNavbar adminName={session.user.name} locationName={locationName} />
      <main className="pt-14 min-h-screen">
        {children}
      </main>
    </div>
  );
}
