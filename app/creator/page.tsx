"use client";

import Link from "next/link";
import Image from "next/image";

export default function Creator() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4 py-16"
      style={{
        background: "linear-gradient(-45deg, #f8fafc, #f1f5f9, #e2e8f0, #f8fafc)",
        backgroundSize: "400% 400%",
        animation: "gradient 15s ease infinite",
      }}
    >
      <style jsx global>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>

      <div className="relative z-10 w-full max-w-2xl mx-auto text-center">
        <h1 className="text-4xl font-bold text-slate-900 mb-16">Meet the Team</h1>
        
        <div className="relative grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          
          {/* Logo at the center */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
            <Image 
              src="/logo.png" 
              alt="Logo" 
              width={80} 
              height={80} 
              className="object-contain" 
            />
          </div>

          {[
            { name: "Krishnanunni H Pillai", role: "System Architect", linkedin: "https://www.linkedin.com/in/krishnanunni-h-pillai-b87448327" },
            { name: "Gayathri M Nair", role: "Fulstack Developer", linkedin: "https://www.linkedin.com/in/gayathri-m-nair-556605290?utm_source=share_via&utm_content=profile&utm_medium=member_android" },
            { name: "Adya", role: "UI/UX", linkedin: "https://linkedin.com/in/..." },
            { name: "Aksa Thomas", role: "Backend Engineer", linkedin: "https://www.linkedin.com/in/aksa-thomas-b95a3b303?utm_source=share_via&utm_content=profile&utm_medium=member_android" },
          ].map((member, i) => (
            <div key={i} className="bg-white/70 backdrop-blur-md border border-slate-200 p-8 rounded-3xl shadow-sm flex flex-col items-center">
              <h3 className="text-lg font-bold text-slate-800">{member.name}</h3>
              <p className="text-sm text-indigo-600 font-medium mt-1 mb-3">{member.role}</p>
              <a 
                href={member.linkedin} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs font-bold text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-widest"
              >
                LinkedIn
              </a>
            </div>
          ))}
        </div>

        <Link 
          href="/" 
          className="text-slate-500 hover:text-slate-800 transition-colors font-medium text-sm flex items-center justify-center gap-2"
        >
          ← Back to Home
        </Link>
      </div>
    </main>
  );
}