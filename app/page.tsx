import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Smart Campus Printing System
          </h1>
          <p className="text-xl text-gray-600 mb-12">
            Efficient, convenient, and eco-friendly printing for students and staff
          </p>

          {/* Single login button — no public registration */}
          <div className="flex justify-center">
            <Link href="/login">
              <Button size="lg">Sign In to Print</Button>
            </Link>
          </div>

          <div className="mt-16 grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-3xl mb-4">🖨️</div>
              <h3 className="text-lg font-semibold mb-2">Easy Printing</h3>
              <p className="text-gray-600">Upload and print documents from anywhere on campus</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-3xl mb-4">⚡</div>
              <h3 className="text-lg font-semibold mb-2">Fast Service</h3>
              <p className="text-gray-600">Quick processing and minimal wait times</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-3xl mb-4">💰</div>
              <h3 className="text-lg font-semibold mb-2">Cost Effective</h3>
              <p className="text-gray-600">Affordable pricing for students</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
