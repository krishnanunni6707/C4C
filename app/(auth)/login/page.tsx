import AuthBrandPanel from "@/components/auth/AuthBrandPanel";
import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <main className="min-h-screen lg:h-screen bg-[#FAFBFF] dark:bg-[#0B0F19] text-slate-800 antialiased selection:bg-indigo-500 selection:text-white flex flex-col lg:grid lg:grid-cols-2 overflow-x-hidden lg:overflow-hidden">
      {/* Left Column: Brand & Token Illustration */}
      <AuthBrandPanel />

      {/* Right Column: Form Panel */}
      <section
        className="w-full flex-1 flex flex-col items-center justify-center p-4 sm:p-8 lg:p-10 xl:p-12 overflow-y-auto"
        aria-label="Sign In Form"
      >
        <LoginForm />
      </section>
    </main>
  );
}
