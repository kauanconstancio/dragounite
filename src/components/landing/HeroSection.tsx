import { ArrowRight, Flame, KeyRound } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function HeroSection() {
  return (
    <section id="top" className="relative overflow-hidden pt-24 pb-32">
      {/* Background ambience */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[600px] w-[1000px] rounded-full bg-red-600/25 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        {/* Diagonal red slash */}
        <div className="absolute -top-20 -right-40 w-[600px] h-[200px] rotate-[18deg] bg-gradient-to-r from-transparent via-red-600/30 to-transparent blur-2xl" />
        <div className="absolute bottom-0 -left-40 w-[600px] h-[160px] -rotate-[15deg] bg-gradient-to-r from-transparent via-red-700/20 to-transparent blur-2xl" />
      </div>

      <div className="mx-auto max-w-7xl px-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-md border border-red-500/40 bg-red-600/10 px-4 py-1.5 text-xs uppercase tracking-[0.25em] text-red-300 mb-8 font-bold">
          <Flame className="h-3.5 w-3.5" />
          <span>Plataforma oficial · Time Dragounite</span>
        </div>

        <h1 className="mx-auto max-w-5xl text-6xl sm:text-7xl lg:text-8xl font-black tracking-tighter text-white leading-[0.95] uppercase">
          Domine a{" "}
          <span className="bg-gradient-to-r from-red-500 via-red-400 to-red-600 bg-clip-text text-transparent">
            arena
          </span>
          .<br />
          Forge a vitória.
        </h1>

        <p className="mx-auto mt-8 max-w-2xl text-lg sm:text-xl text-zinc-400 leading-relaxed">
          A central de comando do <span className="text-white font-semibold">Time Dragounite</span> —
          gestão de roster, scrims, drafts e scouting para os 6 jogos competitivos que dominamos.{" "}
          <span className="text-white">Dados que viram troféus.</span>
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <a
            href="#waitlist"
            className="group inline-flex items-center gap-2 rounded-md bg-red-600 hover:bg-red-500 px-7 py-4 text-base font-bold uppercase tracking-wider text-white shadow-[0_0_40px_rgba(220,38,38,0.6)] hover:shadow-[0_0_60px_rgba(220,38,38,0.9)] transition-all"
          >
            Entrar para o time
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </a>
          <Link
            to="/cadastro"
            className="group inline-flex items-center gap-2 rounded-md border border-red-500/50 hover:border-red-400 bg-red-600/10 hover:bg-red-600/20 px-7 py-4 text-base font-bold uppercase tracking-wider text-red-200 transition-colors"
          >
            <KeyRound className="h-4 w-4" />
            Já fui aprovado
          </Link>
          <a
            href="#games"
            className="inline-flex items-center gap-2 rounded-md border border-zinc-700 hover:border-zinc-500 bg-zinc-900/40 px-7 py-4 text-base font-bold uppercase tracking-wider text-zinc-200 transition-colors"
          >
            Ver jogos
          </a>
        </div>

        {/* Stat strip */}
        <div className="mt-20 grid grid-cols-3 max-w-3xl mx-auto gap-px bg-red-600/20 rounded-xl overflow-hidden border border-red-600/20">
          {[
            { v: "6", l: "Jogos competitivos" },
            { v: "1", l: "Time. Uma família" },
            { v: "∞", l: "Vontade de vencer" },
          ].map((s) => (
            <div key={s.l} className="bg-black/80 px-4 py-6">
              <div className="text-4xl font-black text-red-500">{s.v}</div>
              <div className="text-[11px] uppercase tracking-widest text-zinc-500 mt-1">{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
