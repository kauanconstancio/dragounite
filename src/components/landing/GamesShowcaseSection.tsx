import { Sparkles, Swords, Map, Layers, Trophy, Anchor } from "lucide-react";

const games = [
  {
    name: "Pokémon Unite",
    short: "UNITE",
    icon: Sparkles,
    desc: "MOBA 5v5 competitivo. Nossa origem.",
    status: "core" as const,
  },
  {
    name: "Rematch",
    short: "REMATCH",
    icon: Swords,
    desc: "Futebol arcade tático em equipe.",
    status: "active" as const,
  },
  {
    name: "Pokémon GO",
    short: "GO",
    icon: Map,
    desc: "GO Battle League e raid coordenadas.",
    status: "active" as const,
  },
  {
    name: "Pokémon TCG",
    short: "TCG",
    icon: Layers,
    desc: "Card game competitivo presencial e online.",
    status: "active" as const,
  },
  {
    name: "VGC",
    short: "VGC",
    icon: Trophy,
    desc: "Video Game Championships. Doubles oficiais.",
    status: "active" as const,
  },
  {
    name: "One Piece TCG",
    short: "OP TCG",
    icon: Anchor,
    desc: "O novo card game que tomou o circuito.",
    status: "active" as const,
  },
];

export function GamesShowcaseSection() {
  return (
    <section id="jogos" className="relative overflow-hidden py-24 border-y border-red-600/10">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[900px] rounded-full bg-red-600/10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-16">
          <div className="text-xs uppercase tracking-[0.3em] text-red-500 mb-3 font-bold">
            Onde batalhamos
          </div>
          <h2 className="text-4xl sm:text-6xl font-black text-white tracking-tighter uppercase">
            Seis jogos. <span className="text-red-500">Um time.</span>
          </h2>
          <p className="mt-4 text-zinc-400 max-w-xl mx-auto">
            O Dragounite compete oficialmente em todos os principais cenários competitivos da Pokémon Company e além.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {games.map((g) => {
            const Icon = g.icon;
            const isCore = g.status === "core";
            return (
              <div
                key={g.short}
                className={`group relative overflow-hidden rounded-xl border p-6 transition-all hover:-translate-y-1 ${
                  isCore
                    ? "border-red-500/60 bg-gradient-to-br from-red-950/40 via-black to-black shadow-[0_0_40px_rgba(220,38,38,0.25)]"
                    : "border-zinc-800 bg-gradient-to-br from-zinc-950 to-black hover:border-red-500/40"
                }`}
              >
                {/* Diagonal accent */}
                <div
                  className={`absolute -top-10 -right-10 h-40 w-40 rotate-45 ${
                    isCore ? "bg-red-600/20" : "bg-red-600/5 group-hover:bg-red-600/10"
                  } blur-2xl transition-colors`}
                />

                <div className="relative flex items-start justify-between mb-6">
                  <div
                    className={`inline-flex h-12 w-12 items-center justify-center rounded-lg ${
                      isCore ? "bg-red-600 text-white" : "bg-zinc-900 text-red-500 border border-zinc-800"
                    }`}
                  >
                    <Icon className="h-5 w-5" strokeWidth={2.5} />
                  </div>
                  <span
                    className={`text-[10px] uppercase tracking-[0.2em] px-2 py-1 rounded font-bold ${
                      isCore
                        ? "bg-red-500/20 text-red-300 border border-red-500/40"
                        : "border border-zinc-700 text-zinc-500"
                    }`}
                  >
                    {isCore ? "Core" : "Ativo"}
                  </span>
                </div>

                <div className="relative">
                  <div className="text-[11px] uppercase tracking-[0.25em] text-zinc-500 font-mono mb-1">
                    {g.short}
                  </div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">
                    {g.name}
                  </h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{g.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
