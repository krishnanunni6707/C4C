import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import AdminShell from "@/components/admin/overview/AdminShell";
import { getLocationById, getAllLocations } from "@/lib/firestore/locations";

export const metadata = {
  title: "QDoc Admin",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
    redirect("/student");
  }

  const isSuperAdmin = session.user.role === "SUPER_ADMIN";
  const allLocations = await getAllLocations();

  let currentLocationName: string | null = null;
  let locationBuilding: string | null = null;

  if (!isSuperAdmin && session.user.locationId) {
    const loc = await getLocationById(session.user.locationId);
    currentLocationName = loc?.name ?? null;
    locationBuilding = loc?.building ?? null;
  } else if (allLocations.length > 0) {
    currentLocationName = allLocations[0].name;
    locationBuilding = allLocations[0].building ?? "Central Library\nBlock A";
  }

  return (
    <AdminShell
      adminName={session.user.name ?? "Admin"}
      adminRole={session.user.role}
      adminEmail={session.user.email}
      locations={allLocations.map((l) => ({
        id: l.id,
        name: l.name,
        building: l.building ?? "",
        floor: l.floor ?? "",
        isActive: l.isActive,
      }))}
      currentLocationId={session.user.locationId ?? null}
      currentLocationName={currentLocationName}
      locationBuilding={locationBuilding}
      isSuperAdmin={isSuperAdmin}
    >
      {children}
    </AdminShell>
  );
}
