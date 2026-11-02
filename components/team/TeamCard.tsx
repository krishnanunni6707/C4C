"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import type { TeamMember } from "@/lib/team";

interface TeamCardProps {
  member: TeamMember;
  index: number;
}

export default function TeamCard({ member, index }: TeamCardProps) {
  const shouldReduceMotion = useReducedMotion();

  // Compute initials fallback (e.g. "Aarav Nair" -> "AN")
  const initials = member.name
    .split(" ")
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <motion.article
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{
        duration: 0.4,
        delay: shouldReduceMotion ? 0 : index * 0.06,
        ease: "easeOut",
      }}
      className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-indigo-200 hover:-translate-y-0.5 transition-all duration-200 text-center flex flex-col items-center justify-between group"
    >
      <div className="flex flex-col items-center w-full">
        {/* Photo Container: 136px circle with soft indigo-100 ring/background */}
        {/* NOTE: To add real member photos, save your photo to /public/team/<slug>.jpg (e.g. /public/team/aarav-nair.jpg) and specify photo: "/team/aarav-nair.jpg" in lib/team.ts */}
        <div className="w-[136px] h-[136px] rounded-full p-1 bg-gradient-to-br from-indigo-100 via-indigo-50 to-indigo-100 shadow-sm mb-6 flex-shrink-0 flex items-center justify-center">
          <div className="w-full h-full rounded-full overflow-hidden relative flex items-center justify-center bg-gradient-to-br from-indigo-50 via-indigo-100/70 to-indigo-100">
            {member.photo ? (
              <Image
                src={member.photo}
                alt={`${member.name} - ${member.role}`}
                width={136}
                height={136}
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <span
                className="text-3xl font-extrabold text-indigo-600 tracking-tight select-none"
                aria-hidden="true"
              >
                {initials}
              </span>
            )}
          </div>
        </div>

        {/* Member Name */}
        <h2 className="text-xl font-bold text-[#0F172A] tracking-tight">
          {member.name}
        </h2>

        {/* Member Role */}
        <p className="text-sm sm:text-base font-semibold text-indigo-600 mt-1 mb-3.5">
          {member.role}
        </p>

        {/* Member Bio */}
        <p className="text-[14px] sm:text-[15px] text-slate-500 leading-[1.6] line-clamp-4 max-w-[260px] font-normal">
          {member.bio}
        </p>
      </div>

      {/* Social Links Row (40px Circles, rendered only if URL exists) */}
      <div className="flex items-center justify-center gap-2.5 mt-6 pt-2">
        {member.github && (
          <motion.a
            href={member.github}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${member.name}'s GitHub profile`}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
            className="w-10 h-10 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            {/* GitHub SVG */}
            <svg
              className="w-4 h-4 fill-current"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              />
            </svg>
          </motion.a>
        )}

        {member.linkedin && (
          <motion.a
            href={member.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${member.name}'s LinkedIn profile`}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
            className="w-10 h-10 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            {/* LinkedIn SVG */}
            <svg
              className="w-4 h-4 fill-none stroke-current"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
              <rect x="2" y="9" width="4" height="12" />
              <circle cx="4" cy="4" r="2" />
            </svg>
          </motion.a>
        )}

        {member.x && (
          <motion.a
            href={member.x}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${member.name}'s X profile`}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
            className="w-10 h-10 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            {/* X (formerly Twitter) SVG */}
            <svg
              className="w-3.5 h-3.5 fill-current"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </motion.a>
        )}
      </div>
    </motion.article>
  );
}
