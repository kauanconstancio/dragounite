export function AboutSection() {
  return (
    <section id="sobre" className="py-24 relative border-y border-red-600/10">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-red-950/10 to-transparent" />
      <div className="mx-auto max-w-5xl px-6">
        <div className="text-center mb-12">
          <div className="text-xs uppercase tracking-[0.3em] text-red-500 mb-3 font-bold">
            Sobre nós
          </div>
          <h2 className="text-4xl sm:text-6xl font-black text-white tracking-tighter uppercase">
            Mais que um time. <span className="text-red-500">Uma família.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-zinc-800 bg-black/50 p-8 hover:border-red-600/40 transition-colors">
            <h3 className="text-xl font-black text-white uppercase tracking-tight mb-3">
              Nossa missão
            </h3>
            <p className="text-zinc-400 leading-relaxed">
              Levar o nome Dragounite ao topo dos principais campeonatos brasileiros e
              internacionais, representando o competitivo nacional com técnica, atitude e
              respeito.
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-black/50 p-8 hover:border-red-600/40 transition-colors">
            <h3 className="text-xl font-black text-white uppercase tracking-tight mb-3">
              Nossos valores
            </h3>
            <p className="text-zinc-400 leading-relaxed">
              Treino consistente, comunicação clara, evolução individual e coletiva. Acreditamos
              que disciplina e união são o que separa um time bom de um time campeão.
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-px bg-red-600/20 rounded-xl overflow-hidden border border-red-600/20">
          {[
            { v: "6", l: "Jogos competitivos" },
            { v: "20+", l: "Atletas no roster" },
            { v: "BR", l: "Origem brasileira" },
          ].map((s) => (
            <div key={s.l} className="bg-black/80 px-4 py-6 text-center">
              <div className="text-4xl font-black text-red-500">{s.v}</div>
              <div className="text-[11px] uppercase tracking-widest text-zinc-500 mt-1">
                {s.l}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
