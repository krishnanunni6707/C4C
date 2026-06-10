"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

interface Location {
  id: string;
  name: string;
  building?: string;
  floor?: string;
}

export default function LocationSelectionPage() {
  const router = useRouter();
  const [locations, setLocations] = useState<Location[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Redirect back if no uploaded file
  useEffect(() => {
    const uploaded = localStorage.getItem("uploadedFile");
    if (!uploaded) {
      router.push("/student/upload");
      return;
    }

    // Restore previously selected location if user navigated back
    const saved = localStorage.getItem("selectedLocation");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSelected(parsed.id ?? "");
      } catch {
        // ignore
      }
    }
  }, [router]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/locations");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setLocations(data.locations ?? []);
      } catch (e: unknown) {
        setError(
          e instanceof Error ? e.message : "Failed to load print locations"
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleContinue = () => {
    if (!selected) return;
    const loc = locations.find((l) => l.id === selected);
    if (!loc) return;

    const payload = { id: loc.id, name: loc.name };
    localStorage.setItem("selectedLocation", JSON.stringify(payload));
    sessionStorage.setItem("selectedLocation", JSON.stringify(payload));

    router.push("/student/print-preferences");
  };

  const subtitle = (loc: Location) => {
    const parts = [loc.building, loc.floor].filter(Boolean);
    return parts.length > 0 ? parts.join(" · ") : null;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Smart Campus Printing</h1>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-xl mx-auto">
          <h2 className="text-3xl font-bold mb-2">Select Print Location</h2>
          <p className="text-gray-600 mb-8">
            Choose where you want to collect your printout
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <p className="text-gray-400">Loading locations…</p>
            </div>
          ) : locations.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <div className="text-4xl mb-4">🏢</div>
              <p className="text-gray-600">
                No print locations are available right now. Please contact the
                admin.
              </p>
            </div>
          ) : (
            <div className="space-y-3 mb-8">
              {locations.map((loc) => {
                const sub = subtitle(loc);
                return (
                  <button
                    key={loc.id}
                    onClick={() => setSelected(loc.id)}
                    className={`w-full text-left p-5 bg-white rounded-lg shadow-sm border-2 transition-all ${
                      selected === loc.id
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          selected === loc.id
                            ? "border-blue-600"
                            : "border-gray-300"
                        }`}
                      >
                        {selected === loc.id && (
                          <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{loc.name}</p>
                        {sub && (
                          <p className="text-sm text-gray-500 mt-0.5">{sub}</p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {!loading && locations.length > 0 && (
            <Button
              onClick={handleContinue}
              className="w-full"
              size="lg"
              disabled={!selected}
            >
              Continue to Print Preferences →
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
