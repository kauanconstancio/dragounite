const steps = [
  {
    n: "01",
    title: "Monte o esquadrão",
    desc: "Configure o roster, adicione jogadores, defina lanes e funções (titular, reserva, coach, staff).",
  },
  {
    n: "02",
    title: "Registre cada batalha",
    desc: "Lance resultados de scrims, performance individual e VODs para revisão pós-jogo.",
  },
  {
    n: "03",
    title: "Domine o meta",
    desc: "Acompanhe dashboards, identifique pontos fortes e fracos, decida com base em dados — não achismo.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how" className="py-24 relative">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-red-950/20 to-transparent" />
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-16">
          <div className="text-xs uppercase tracking-[0.3em] text-red-500 mb-3 font-bold">
            Como funciona
          </div>
          <h2 className="text-4xl sm:text-6xl font-black text-white tracking-tighter uppercase">
            Do treino <span className="text-red-500">à conquista</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((s) => (
            <div
              key={s.n}
              className="relative rounded-xl border border-zinc-800 bg-zinc-900/40 p-8 hover:border-red-600/40 transition-colors"
            >
              <div className="text-7xl font-black bg-gradient-to-b from-red-500 to-red-900 bg-clip-text text-transparent mb-4 leading-none">
                {s.n}
              </div>
              <h3 className="text-xl font-black text-white mb-3 uppercase tracking-tight">
                {s.title}
              </h3>
              <p className="text-zinc-400 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
