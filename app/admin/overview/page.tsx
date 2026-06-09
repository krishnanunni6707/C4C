import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import StatCard from "@/components/admin/StatCard";
import AdminHeader from "@/components/admin/AdminHeader";

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

async function safeRevenue(): Promise<number> {
  try {
    const snap = await adminDb
      .collection(COLLECTIONS.PRINT_JOBS)
      .where("paymentStatus", "==", "PAID")
      .get();
    return snap.docs.reduce((sum, d) => sum + (d.data().amount ?? 0), 0);
  } catch {
    return 0;
  }
}

export default async function AdminOverviewPage() {
  const [totalJobs, pendingJobs, completedJobs, revenue] = await Promise.all([
    safeCount(COLLECTIONS.PRINT_JOBS),
    safeCount(COLLECTIONS.PRINT_JOBS, [["status", "in", ["WAITING", "PRINTING", "READY"]]]),
    safeCount(COLLECTIONS.PRINT_JOBS, [["status", "==", "COLLECTED"]]),
    safeRevenue(),
  ]);

  const stats = [
    {
      title: "Total Jobs",
      value: totalJobs,
      icon: "📋",
      color: "bg-blue-100",
      textColor: "text-blue-700",
    },
    {
      title: "Pending Jobs",
      value: pendingJobs,
      icon: "⏳",
      color: "bg-amber-100",
      textColor: "text-amber-700",
    },
    {
      title: "Completed Jobs",
      value: completedJobs,
      icon: "✅",
      color: "bg-green-100",
      textColor: "text-green-700",
    },
    {
      title: "Total Revenue",
      value: `₹${revenue}`,
      icon: "💰",
      color: "bg-purple-100",
      textColor: "text-purple-700",
    },
  ];

  return (
    <div className="p-8">
      <AdminHeader
        title="Overview"
        subtitle="System summary at a glance"
      />

      {/* 4 stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
        {stats.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>

      {/* Phase 2+ placeholder */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
        <p className="text-gray-400 text-sm">
          Queue management, student directory, and settings will be available in the next phase.
        </p>
      </div>
    </div>
  );
}
