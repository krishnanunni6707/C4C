import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import StatCard from "@/components/admin/StatCard";
import AdminHeader from "@/components/admin/AdminHeader";
import { getLocationById } from "@/lib/firestore/locations";

export const dynamic = "force-dynamic";

async function safeCount(
  collection: string,
  filters?: Array<[string, FirebaseFirestore.WhereFilterOp, unknown]>
): Promise<number> {
  try {
    let ref: FirebaseFirestore.Query = adminDb.collection(collection);
    if (filters) {
      for (const [field, op, val] of filters) {
        ref = ref.where(field, op, val);
      }
    }
    const snap = await ref.count().get();
    return snap.data().count;
  } catch {
    return 0;
  }
}

async function safeRevenue(locationId?: string | null): Promise<number> {
  try {
    let ref: FirebaseFirestore.Query = adminDb
      .collection(COLLECTIONS.PRINT_JOBS)
      .where("paymentStatus", "==", "PAID");
    if (locationId) ref = ref.where("locationId", "==", locationId);
    const snap = await ref.get();
    return snap.docs.reduce((sum, d) => sum + (d.data().amount ?? 0), 0);
  } catch {
    return 0;
  }
}

export default async function AdminOverviewPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const isSuperAdmin = session.user.role === "SUPER_ADMIN";
  const locationId = session.user.role === "ADMIN" ? session.user.locationId : null;

  // Fetch location name for ADMIN subtitle
  let locationName: string | null = null;
  if (locationId) {
    const loc = await getLocationById(locationId);
    locationName = loc?.name ?? null;
  }

  // Build filters — scope to location for ADMIN, global for SUPER_ADMIN
  const locFilter: Array<[string, FirebaseFirestore.WhereFilterOp, unknown]> = locationId
    ? [["locationId", "==", locationId]]
    : [];

  const [totalJobs, pendingJobs, completedJobs, revenue] = await Promise.all([
    safeCount(COLLECTIONS.PRINT_JOBS, locFilter.length ? locFilter : undefined),
    safeCount(COLLECTIONS.PRINT_JOBS, [
      ...locFilter,
      ["status", "in", ["WAITING", "PRINTING", "READY"]],
    ]),
    safeCount(COLLECTIONS.PRINT_JOBS, [
      ...locFilter,
      ["status", "==", "COLLECTED"],
    ]),
    safeRevenue(locationId),
  ]);

  const stats = [
    { title: "Total Jobs", value: totalJobs, icon: "📋", color: "bg-blue-100", textColor: "text-blue-700" },
    { title: "Pending Jobs", value: pendingJobs, icon: "⏳", color: "bg-amber-100", textColor: "text-amber-700" },
    { title: "Completed Jobs", value: completedJobs, icon: "✅", color: "bg-green-100", textColor: "text-green-700" },
    { title: "Total Revenue", value: `₹${revenue}`, icon: "💰", color: "bg-purple-100", textColor: "text-purple-700" },
  ];

  const subtitle = isSuperAdmin
    ? "All locations · System summary at a glance"
    : locationName
    ? `${locationName} · Summary at a glance`
    : "System summary at a glance";

  return (
    <div className="p-8">
      <AdminHeader title="Overview" subtitle={subtitle} />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
        {stats.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
        <p className="text-gray-400 text-sm">
          Queue management, student directory, and settings are available in the sidebar.
        </p>
      </div>
    </div>
  );
}
