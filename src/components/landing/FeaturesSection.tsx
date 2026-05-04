import { Users, Swords, Brain, Search, BarChart3, Trophy } from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Roster & Jogadores",
    desc: "Perfis individuais com KDA, win rate por lane, top picks e evolução temporal de cada atleta.",
  },
  {
    icon: Swords,
    title: "Scrims & Amistosos",
    desc: "Registre partidas, performance individual e acompanhe a evolução de cada jogador.",
  },
  {
    icon: Brain,
    title: "Draft Tool",
    desc: "Simule picks e bans, planeje composições antes de cada partida competitiva.",
  },
  {
    icon: Search,
    title: "Scouting de Oponentes",
    desc: "Analise adversários, VODs, padrões de jogo e composições recorrentes.",
  },
  {
    icon: BarChart3,
    title: "Dashboard de Performance",
    desc: "Gráficos de KDA, win rate, radar do time e timeline de resultados.",
  },
  {
    icon: Trophy,
    title: "Tier List & Builds",
    desc: "Meta atualizado, builds, estratégias e biblioteca de jogadas do time.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 relative">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-16">
          <div className="text-xs uppercase tracking-[0.3em] text-red-500 mb-3 font-bold">
            Arsenal
          </div>
          <h2 className="text-4xl sm:text-6xl font-black text-white tracking-tighter uppercase">
            Tudo o que o time precisa.
            <br />
            <span className="text-zinc-500">Em um só lugar.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="group relative rounded-xl border border-zinc-800 bg-gradient-to-br from-zinc-950 to-black p-6 hover:border-red-600/50 transition-all hover:-translate-y-1"
              >
                <div className="absolute top-0 left-0 h-0.5 w-12 bg-red-600 group-hover:w-full transition-all duration-500" />
                <div className="relative">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-red-600/10 border border-red-600/30 mb-4 group-hover:bg-red-600/20 group-hover:border-red-500/60 transition-colors">
                    <Icon className="h-5 w-5 text-red-500" strokeWidth={2.5} />
                  </div>
                  <h3 className="text-lg font-black text-white mb-2 uppercase tracking-tight">
                    {f.title}
                  </h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
