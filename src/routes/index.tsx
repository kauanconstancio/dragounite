import { createFileRoute } from "@tanstack/react-router";
import { LandingNav } from "@/components/landing/LandingNav";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { RoadmapSection } from "@/components/landing/RoadmapSection";
import { GamesShowcaseSection } from "@/components/landing/GamesShowcaseSection";
import { WaitlistSection } from "@/components/landing/WaitlistSection";
import { FaqSection } from "@/components/landing/FaqSection";
import { LandingFooter } from "@/components/landing/LandingFooter";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GymLy — Gestão competitiva para times de esports" },
      {
        name: "description",
        content:
          "Plataforma all-in-one para roster, scrims, draft e scouting de Pokémon Unite. Eleve seu time com decisões guiadas por dados. Entre na waitlist.",
      },
      { property: "og:title", content: "GymLy — Gestão competitiva para times de esports" },
      {
        property: "og:description",
        content:
          "Plataforma all-in-one para roster, scrims, draft e scouting. Eleve seu time com decisões guiadas por dados.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div
      className="gymly-landing min-h-screen bg-[#0a0a1a] text-white antialiased"
      style={{ fontFamily: '"Manrope", system-ui, sans-serif' }}
    >
      <style>{`
        .gymly-landing h1, .gymly-landing h2, .gymly-landing h3 {
          font-family: "Sora", system-ui, sans-serif;
          letter-spacing: -0.02em;
        }
        .gymly-landing { color-scheme: dark; }
      `}</style>
      <LandingNav />
      <main>
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <RoadmapSection />
        <WaitlistSection />
        <FaqSection />
      </main>
      <LandingFooter />
    </div>
  );
}
