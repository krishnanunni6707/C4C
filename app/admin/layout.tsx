import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import AdminSidebar from "@/components/admin/AdminSidebar";

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
  if (session.user.role !== "ADMIN") redirect("/student/upload");

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Fixed sidebar */}
      <AdminSidebar adminName={session.user.name} />

      {/* Scrollable main content — offset by sidebar width */}
      <main className="flex-1 overflow-y-auto ml-64 bg-gray-50">
        {children}
      </main>
    </div>
  );
}
