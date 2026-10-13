import { Navbar } from "@/components/landing/Navbar";
import { MarketTicker } from "@/components/landing/MarketTicker";
import { HeroSection } from "@/components/landing/HeroSection";
import { LeakShowcase } from "@/components/landing/LeakShowcase";
import { RuleLabShowcase } from "@/components/landing/RuleLabShowcase";
import { ChargesEngine } from "@/components/landing/ChargesEngine";
import { CtaSection } from "@/components/landing/CtaSection";
import { Footer } from "@/components/landing/Footer";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900">
      <Navbar />
      <MarketTicker />
      <main className="flex-1">
        <HeroSection />
        <LeakShowcase />
        <RuleLabShowcase />
        <ChargesEngine />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}
