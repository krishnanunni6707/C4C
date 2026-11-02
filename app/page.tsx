import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import WhyChoose from "@/components/landing/WhyChoose";
import Faq from "@/components/landing/Faq";
import CtaBand from "@/components/landing/CtaBand";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 antialiased selection:bg-indigo-500 selection:text-white flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <HowItWorks />
        <WhyChoose />
        <Faq />
        <CtaBand />
      </main>
      <Footer />
    </div>
  );
}