import { Flame, Instagram, Twitter, Youtube, ArrowRight } from "lucide-react";
import dragonHero from "@/assets/dragon-hero.jpg";

export function HeroSection() {
  return (
    <section id="top" className="relative overflow-hidden pt-20 pb-32 lg:pt-28 lg:pb-40">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
            maskImage: "radial-gradient(ellipse 80% 60% at 50% 40%, black 30%, transparent 75%)",
          }}
        />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[700px] w-[1100px] rounded-full bg-red-600/20 blur-[140px]" />
      </div>

      <div className="mx-auto max-w-7xl px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left: text */}
        <div className="lg:col-span-7 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-600/10 px-4 py-1.5 text-[11px] uppercase tracking-[0.25em] text-red-300 mb-8 font-bold backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
            </span>
            <span>Time competitivo brasileiro</span>
          </div>

          <h1 className="max-w-3xl text-5xl sm:text-6xl lg:text-7xl xl:text-[5.5rem] font-black tracking-tighter text-white leading-[0.92] uppercase">
            Somos
            <br />
            <span className="relative inline-block">
              <span className="bg-gradient-to-br from-red-400 via-red-500 to-red-700 bg-clip-text text-transparent">
                Dragounite
              </span>
              <span className="absolute -bottom-2 left-0 h-[6px] w-full bg-gradient-to-r from-red-600 via-red-500 to-transparent rounded-full" />
            </span>
            <br />
            <span className="text-zinc-300">Forjados para vencer.</span>
          </h1>

          <p className="mx-auto lg:mx-0 mt-8 max-w-xl text-base sm:text-lg text-zinc-400 leading-relaxed">
            Disputamos os principais cenários competitivos de
            <span className="text-white font-semibold"> Pokémon</span> e
            <span className="text-white font-semibold"> card games</span> no Brasil. Treino,
            estratégia e paixão pelo competitivo em cada partida.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center lg:justify-start gap-3">
            <a
              href="#jogos"
              className="group inline-flex items-center gap-2 rounded-full bg-red-600 hover:bg-red-500 px-7 py-3.5 text-sm font-bold uppercase tracking-wider text-white shadow-[0_10px_40px_-10px_rgba(220,38,38,0.8)] hover:shadow-[0_15px_50px_-10px_rgba(220,38,38,1)] transition-all hover:-translate-y-0.5"
            >
              Conheça o time
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </a>
            <a
              href="#contato"
              className="inline-flex items-center gap-2 rounded-full border border-zinc-700 hover:border-red-500/50 bg-zinc-900/40 hover:bg-zinc-900/70 px-7 py-3.5 text-sm font-bold uppercase tracking-wider text-zinc-200 transition-all"
            >
              Acompanhar
            </a>
          </div>

          <div className="mt-10 flex items-center justify-center lg:justify-start gap-1">
            <span className="text-[11px] uppercase tracking-[0.25em] text-zinc-500 font-bold mr-3">
              Siga
            </span>
            {[
              { Icon: Instagram, label: "Instagram" },
              { Icon: Twitter, label: "Twitter" },
              { Icon: Youtube, label: "YouTube" },
            ].map(({ Icon, label }) => (
              <a
                key={label}
                href="#"
                aria-label={label}
                className="h-9 w-9 rounded-full inline-flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-600/10 transition-all"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        {/* Right: hero image */}
        <div className="lg:col-span-5 relative">
          <div className="relative aspect-square max-w-md mx-auto">
            {/* Glow rings */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-red-600/40 via-red-700/20 to-transparent blur-2xl" />
            <div className="absolute -inset-4 rounded-[2rem] border border-red-500/20" />
            <div className="absolute -inset-8 rounded-[2.5rem] border border-red-500/10" />

            <div className="relative h-full w-full overflow-hidden rounded-3xl border border-red-500/30 shadow-[0_30px_80px_-20px_rgba(220,38,38,0.5)]">
              <img
                src={dragonHero}
                alt="Dragounite — esports team key visual"
                width={1024}
                height={1024}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-red-950/40 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-[#0f0d0e] via-[#0f0d0e]/70 to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-lg">
                  <Flame className="h-4 w-4 text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-red-300 font-bold">
                    Esports
                  </div>
                  <div className="text-sm font-black text-white uppercase tracking-tight">
                    Time Dragounite
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stat strip */}
      <div className="mx-auto max-w-5xl px-6 mt-20 lg:mt-28">
        <div className="grid grid-cols-3 gap-px rounded-2xl overflow-hidden border border-red-600/20 bg-red-600/10">
          {[
            { v: "6", l: "Jogos competitivos" },
            { v: "20+", l: "Atletas no roster" },
            { v: "BR", l: "Origem brasileira" },
          ].map((s) => (
            <div
              key={s.l}
              className="bg-zinc-950/80 px-4 py-7 text-center backdrop-blur-sm"
            >
              <div className="text-4xl sm:text-5xl font-black bg-gradient-to-b from-red-400 to-red-600 bg-clip-text text-transparent">
                {s.v}
              </div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 mt-2 font-bold">
                {s.l}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
