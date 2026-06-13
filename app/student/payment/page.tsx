"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PaymentPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/student");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0f111a] flex items-center justify-center text-[#686d7d] font-mono text-sm">
      Loading payment gateway...
    </div>
  );
}
