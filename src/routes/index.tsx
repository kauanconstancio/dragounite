import { createFileRoute } from "@tanstack/react-router";
import { LandingNav } from "@/components/landing/LandingNav";
import { HeroSection } from "@/components/landing/HeroSection";
import { AboutSection } from "@/components/landing/AboutSection";
import { GamesShowcaseSection } from "@/components/landing/GamesShowcaseSection";
import { AchievementsSection } from "@/components/landing/AchievementsSection";
import { ContactSection } from "@/components/landing/ContactSection";
import { LandingFooter } from "@/components/landing/LandingFooter";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dragounite — Time competitivo de esports & TCG" },
      {
        name: "description",
        content:
          "Dragounite é um time competitivo brasileiro disputando Pokémon Unite, Rematch, Pokémon GO, TCG, VGC e One Piece TCG. Conheça o time, nossa trajetória e acompanhe nossas partidas.",
      },
      { property: "og:title", content: "Dragounite — Time competitivo de esports & TCG" },
      {
        property: "og:description",
        content:
          "Time competitivo brasileiro em 6 modalidades: Pokémon Unite, Rematch, Pokémon GO, TCG, VGC e One Piece TCG.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="dragounite-landing min-h-screen overflow-x-hidden bg-black text-white antialiased font-sans">
      <style>{`
        .dragounite-landing h1, .dragounite-landing h2, .dragounite-landing h3 {
          font-family: var(--font-display);
          letter-spacing: -0.02em;
        }
        .dragounite-landing { color-scheme: dark; }
        .dragounite-landing, .dragounite-landing main, .dragounite-landing section { max-width: 100vw; overflow-x: clip; }
      `}</style>
      <LandingNav />
      <main>
        <HeroSection />
        <AboutSection />
        <GamesShowcaseSection />
        <AchievementsSection />
        <ContactSection />
      </main>
      <LandingFooter />
    </div>
  );
}
