import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Smart Campus Printing</h1>
            <a href="/api/auth/signout" className="text-blue-600 hover:underline">
              Logout
            </a>
          </div>
        </div>
      </nav>
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-6">Welcome, {session.user?.name}!</h2>
          
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-xl font-semibold mb-4">Your Account</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Email:</span> {session.user?.email}</p>
              <p><span className="font-medium">Role:</span> {session.user?.role}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-2">Upload Document</h3>
              <p className="text-gray-600 mb-4">Upload files to print</p>
              <a href="/student/upload">
                <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                  Upload
                </button>
              </a>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-2">Print Queue</h3>
              <p className="text-gray-600 mb-4">Track your print jobs</p>
              <a href="/dashboard/queue">
                <button className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700">
                  View Queue
                </button>
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
