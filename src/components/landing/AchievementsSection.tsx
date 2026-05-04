import { Trophy, Medal, Star } from "lucide-react";

const achievements = [
  {
    icon: Trophy,
    title: "Competindo no cenário nacional",
    desc: "Participações ativas em campeonatos brasileiros de Pokémon Unite e card games.",
  },
  {
    icon: Medal,
    title: "Roster multi-modalidade",
    desc: "Atletas dedicados a cada um dos 6 jogos competitivos que disputamos.",
  },
  {
    icon: Star,
    title: "Comunidade engajada",
    desc: "Construindo presença e influência na cena competitiva brasileira.",
  },
];

export function AchievementsSection() {
  return (
    <section id="conquistas" className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-16">
          <div className="text-xs uppercase tracking-[0.3em] text-red-500 mb-3 font-bold">
            Trajetória
          </div>
          <h2 className="text-4xl sm:text-6xl font-black text-white tracking-tighter uppercase">
            Construindo <span className="text-red-500">história</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {achievements.map((a) => {
            const Icon = a.icon;
            return (
              <div
                key={a.title}
                className="group relative rounded-xl border border-zinc-800 bg-gradient-to-br from-zinc-950 to-black p-6 hover:border-red-600/50 transition-all hover:-translate-y-1"
              >
                <div className="absolute top-0 left-0 h-0.5 w-12 bg-red-600 group-hover:w-full transition-all duration-500" />
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-red-600/10 border border-red-600/30 mb-4">
                  <Icon className="h-5 w-5 text-red-500" strokeWidth={2.5} />
                </div>
                <h3 className="text-lg font-black text-white mb-2 uppercase tracking-tight">
                  {a.title}
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{a.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
