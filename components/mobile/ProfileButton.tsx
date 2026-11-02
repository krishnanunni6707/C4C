"use client";

import React from "react";
import { useSession } from "next-auth/react";

interface ProfileButtonProps {
  onClick?: () => void;
  className?: string;
}

export default function ProfileButton({
  onClick,
  className = "",
}: ProfileButtonProps) {
  const { data: session } = useSession();
  const userName = session?.user?.name?.trim() || "Student";
  const initial = userName.charAt(0).toUpperCase() || "S";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open profile"
      className={`relative min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${className}`}
    >
      <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold text-sm shadow-sm flex items-center justify-center hover:bg-indigo-700 active:scale-95 transition-all select-none">
        {initial}
      </div>
    </button>
  );
}
