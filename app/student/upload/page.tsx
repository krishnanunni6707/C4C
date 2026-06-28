"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function UploadPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/student");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center text-gray-400 text-sm">
      Loading print portal...
    </div>
  );
}
