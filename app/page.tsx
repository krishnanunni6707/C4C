import Link from "next/link";

export default function Home() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4 py-16"
      style={{
        background: "linear-gradient(135deg, #0d0f1c 0%, #111322 60%, #0f1228 100%)",
      }}
    >
      {/* Subtle grid overlay */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#4f46e5 1px, transparent 1px), linear-gradient(to right, #4f46e5 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative z-10 w-full max-w-3xl mx-auto flex flex-col items-center text-center gap-6">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-1.5 text-[11px] font-bold text-indigo-400 uppercase tracking-widest font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse inline-block" />
          Campus Print Network
        </div>

        {/* Heading */}
        <h1 className="text-5xl sm:text-6xl font-extrabold text-white tracking-tight leading-[1.1]">
          Smart Campus
          <br />
          <span className="text-transparent bg-clip-text"
            style={{ backgroundImage: "linear-gradient(90deg, #6366f1, #818cf8)" }}>
            Printing System
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-base text-gray-400 max-w-md leading-relaxed">
          Efficient, convenient, and eco-friendly printing for students and staff — from upload to pickup in minutes.
        </p>

        {/* CTA */}
        <Link
          href="/login"
          className="mt-2 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm px-7 py-3.5 rounded-xl transition-colors shadow-lg shadow-indigo-600/20"
        >
          Sign In to Print
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </Link>

        {/* Feature cards */}
        <div className="mt-10 w-full grid sm:grid-cols-3 gap-4">
          {[
            {
              icon: "🖨️",
              title: "Easy Printing",
              desc: "Upload and print documents from anywhere on campus",
              accent: "border-indigo-500/20",
            },
            {
              icon: "⚡",
              title: "Fast Service",
              desc: "Quick processing and minimal wait times",
              accent: "border-yellow-500/20",
            },
            {
              icon: "💰",
              title: "Cost Effective",
              desc: "Affordable pricing for students",
              accent: "border-green-500/20",
            },
          ].map((card) => (
            <div
              key={card.title}
              className={`bg-[#111322] border ${card.accent} rounded-2xl p-6 flex flex-col items-center gap-3 text-center`}
            >
              <span className="text-3xl select-none">{card.icon}</span>
              <h3 className="text-sm font-bold text-white">{card.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <p className="mt-6 text-[11px] text-gray-600 font-mono">
          Contact the admin if you don&apos;t have an account.
        </p>
      </div>
    </main>
  );
}
