import { Users, Swords, Brain, Search, BarChart3, Trophy } from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Roster & Jogadores",
    desc: "Perfis individuais com KA, win rate por lane, top pokémons e evolução temporal.",
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
    desc: "Gráficos de KA, win rate, radar de time e timeline de resultados.",
  },
  {
    icon: Trophy,
    title: "Tier List & Composições",
    desc: "Meta atualizado, builds, estratégias e biblioteca de jogadas do time.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 relative">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-16">
          <div className="text-xs uppercase tracking-[0.3em] text-indigo-400 mb-3">
            Recursos
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
            Tudo que seu time precisa.
            <br />
            <span className="text-slate-400">Em um só lugar.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="group relative rounded-2xl border border-indigo-500/10 bg-gradient-to-b from-[#141432]/60 to-[#0a0a1a]/60 p-6 hover:border-indigo-500/40 transition-all hover:-translate-y-1"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-indigo-500/0 to-indigo-500/0 group-hover:from-indigo-500/5 transition-all" />
                <div className="relative">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 mb-4 group-hover:bg-indigo-500/20 transition-colors">
                    <Icon className="h-5 w-5 text-indigo-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
