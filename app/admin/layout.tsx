import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { getLocationById } from "@/lib/firestore/locations";

export const metadata = {
  title: "Admin Dashboard — Smart Campus Printing",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") redirect("/dashboard");

  // Fetch location name for sidebar display (ADMIN only)
  let locationName: string | null = null;
  if (session.user.role === "ADMIN" && session.user.locationId) {
    const loc = await getLocationById(session.user.locationId);
    locationName = loc?.name ?? null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Fixed sidebar */}
      <AdminSidebar adminName={session.user.name} locationName={locationName} />

      {/* Scrollable main content — offset by sidebar width */}
      <main className="flex-1 overflow-y-auto ml-64 bg-gray-50">
        {children}
      </main>
    </div>
  );
}
