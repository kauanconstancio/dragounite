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
      { title: "Dragounite — Time competitivo de esports & TCG" },
      {
        name: "description",
        content:
          "Dragounite: time competitivo em Pokémon Unite, Rematch, Pokémon GO, TCG, VGC e One Piece TCG. Plataforma de gestão all-in-one para roster, scrims, drafts e scouting.",
      },
      { property: "og:title", content: "Dragounite — Time competitivo de esports & TCG" },
      {
        property: "og:description",
        content:
          "Plataforma oficial do Time Dragounite. Roster, scrims, draft, scouting e dashboards para 6 jogos competitivos.",
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
      className="dragounite-landing min-h-screen overflow-x-hidden bg-black text-white antialiased"
      style={{ fontFamily: '"Inter", system-ui, sans-serif' }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Bebas+Neue&family=Oswald:wght@500;600;700;800&display=swap');
        .dragounite-landing h1, .dragounite-landing h2, .dragounite-landing h3 {
          font-family: "Oswald", "Bebas Neue", system-ui, sans-serif;
          letter-spacing: -0.02em;
        }
        .dragounite-landing { color-scheme: dark; }
        .dragounite-landing, .dragounite-landing main, .dragounite-landing section { max-width: 100vw; overflow-x: clip; }
      `}</style>
      <LandingNav />
      <main>
        <HeroSection />
        <GamesShowcaseSection />
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
