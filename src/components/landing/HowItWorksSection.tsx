const steps = [
  {
    n: "01",
    title: "Crie sua organização",
    desc: "Configure seu time, adicione jogadores, defina lanes e funções (titular, reserva, coach).",
  },
  {
    n: "02",
    title: "Registre treinos e scrims",
    desc: "Lance resultados, performance individual de cada partida e VODs para revisão posterior.",
  },
  {
    n: "03",
    title: "Evolua com dados",
    desc: "Acompanhe dashboards, identifique pontos fortes e fracos, tome decisões baseadas em métricas.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how" className="py-24 relative">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-indigo-950/20 to-transparent" />
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-16">
          <div className="text-xs uppercase tracking-[0.3em] text-indigo-400 mb-3">
            Como funciona
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
            Do cadastro à conquista
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((s) => (
            <div key={s.n} className="relative">
              <div className="text-6xl font-extrabold bg-gradient-to-b from-indigo-400 to-indigo-700 bg-clip-text text-transparent mb-4">
                {s.n}
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">{s.title}</h3>
              <p className="text-slate-400 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
