import { Check, Clock } from "lucide-react";
import uniteSilhouette from "@/assets/games/silhouette-unite.png";
import hokSilhouette from "@/assets/games/silhouette-hok.png";
import lolSilhouette from "@/assets/games/silhouette-lol.png";
import mlbbSilhouette from "@/assets/games/silhouette-mlbb.png";
import aovSilhouette from "@/assets/games/silhouette-aov.png";

const games = [
  {
    name: "Pokémon Unite",
    img: uniteSilhouette,
    status: "live" as const,
    desc: "Disponível em early access",
  },
  {
    name: "Honor of Kings (HOK)",
    img: hokSilhouette,
    status: "soon" as const,
    desc: "Em desenvolvimento",
  },
  {
    name: "League of Legends (LOL)",
    img: lolSilhouette,
    status: "soon" as const,
    desc: "Em desenvolvimento",
  },
  {
    name: "Mobile Legends: Bang Bang (MLBB)",
    img: mlbbSilhouette,
    status: "soon" as const,
    desc: "Em planejamento",
  },
  {
    name: "Arena of Valor (AOV)",
    img: aovSilhouette,
    status: "soon" as const,
    desc: "Em planejamento",
  },
];

export function RoadmapSection() {
  return (
    <section id="roadmap" className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-16">
          <div className="text-xs uppercase tracking-[0.3em] text-indigo-400 mb-3">Roadmap</div>
          <h2 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
            Multi-esports é o futuro
          </h2>
          <p className="mt-4 text-slate-400 max-w-xl mx-auto">
            Começamos com Pokémon Unite. Em breve, GymLy será o hub para qualquer esports
            competitivo.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {games.map((g) => (
            <div
              key={g.name}
              className={`relative overflow-hidden rounded-2xl border p-6 ${
                g.status === "live"
                  ? "border-indigo-500/40 bg-indigo-500/10 shadow-[0_0_30px_rgba(79,70,229,0.2)]"
                  : "border-slate-800 bg-slate-900/30"
              }`}
            >
              {/* Game silhouette as decorative background */}
              <img
                src={g.img}
                alt=""
                aria-hidden="true"
                width={512}
                height={512}
                loading="lazy"
                className="absolute -right-6 -bottom-6 w-28 opacity-[0.10] select-none pointer-events-none"
              />

              <div className="relative">
                <div
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${
                    g.status === "live"
                      ? "bg-indigo-500 text-white"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {g.status === "live" ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Clock className="h-4 w-4" />
                  )}
                </div>
                <h3 className="mt-4 font-semibold text-white text-sm leading-tight">{g.name}</h3>
                <p className="text-xs text-slate-500 mt-1">{g.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
