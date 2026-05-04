import { Check, Clock, Rocket } from "lucide-react";

const milestones = [
  {
    phase: "Agora",
    title: "Pokémon Unite em produção",
    desc: "Plataforma completa rodando: roster, scrims, draft, scouting e dashboards.",
    icon: Check,
    status: "live" as const,
  },
  {
    phase: "Próximo",
    title: "Módulos para TCG, GO e VGC",
    desc: "Tracking de torneios, deck builder, IV calculator e ladder histórico.",
    icon: Clock,
    status: "soon" as const,
  },
  {
    phase: "Em breve",
    title: "Hub multi-modalidade",
    desc: "Rematch + One Piece TCG integrados — calendário, resultados e estatísticas unificadas.",
    icon: Rocket,
    status: "planned" as const,
  },
];

export function RoadmapSection() {
  return (
    <section id="roadmap" className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-16">
          <div className="text-xs uppercase tracking-[0.3em] text-red-500 mb-3 font-bold">
            Roadmap
          </div>
          <h2 className="text-4xl sm:text-6xl font-black text-white tracking-tighter uppercase">
            O que vem <span className="text-red-500">por aí</span>
          </h2>
          <p className="mt-4 text-zinc-400 max-w-xl mx-auto">
            Construímos a plataforma que o próprio Dragounite usa — e ela cresce com o time.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {milestones.map((m) => {
            const Icon = m.icon;
            const isLive = m.status === "live";
            return (
              <div
                key={m.title}
                className={`relative overflow-hidden rounded-xl border p-6 ${
                  isLive
                    ? "border-red-500/50 bg-gradient-to-br from-red-950/30 to-zinc-900 shadow-[0_0_30px_rgba(220,38,38,0.2)]"
                    : "border-zinc-800 bg-zinc-900/40"
                }`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-md ${
                      isLive ? "bg-red-600 text-white" : "bg-zinc-900 text-zinc-500 border border-zinc-800"
                    }`}
                  >
                    <Icon className="h-4 w-4" strokeWidth={2.5} />
                  </div>
                  <span
                    className={`text-[10px] uppercase tracking-[0.25em] font-bold ${
                      isLive ? "text-red-300" : "text-zinc-500"
                    }`}
                  >
                    {m.phase}
                  </span>
                </div>
                <h3 className="font-black text-white text-lg mb-2 uppercase tracking-tight leading-tight">
                  {m.title}
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{m.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
