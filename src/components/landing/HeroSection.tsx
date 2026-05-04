import { Flame, Instagram, Twitter, Youtube } from "lucide-react";

export function HeroSection() {
  return (
    <section id="top" className="relative overflow-hidden pt-24 pb-32">
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
        <div className="absolute -top-20 -right-40 w-[600px] h-[200px] rotate-[18deg] bg-gradient-to-r from-transparent via-red-600/30 to-transparent blur-2xl" />
        <div className="absolute bottom-0 -left-40 w-[600px] h-[160px] -rotate-[15deg] bg-gradient-to-r from-transparent via-red-700/20 to-transparent blur-2xl" />
      </div>

      <div className="mx-auto max-w-7xl px-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-md border border-red-500/40 bg-red-600/10 px-4 py-1.5 text-xs uppercase tracking-[0.25em] text-red-300 mb-8 font-bold">
          <Flame className="h-3.5 w-3.5" />
          <span>Time competitivo · Multi-jogos</span>
        </div>

        <h1 className="mx-auto max-w-5xl text-6xl sm:text-7xl lg:text-8xl font-black tracking-tighter text-white leading-[0.95] uppercase">
          Somos{" "}
          <span className="bg-gradient-to-r from-red-500 via-red-400 to-red-600 bg-clip-text text-transparent">
            Dragounite
          </span>
          .<br />
          Forjados para vencer.
        </h1>

        <p className="mx-auto mt-8 max-w-2xl text-lg sm:text-xl text-zinc-400 leading-relaxed">
          Um time competitivo brasileiro disputando os principais cenários de
          <span className="text-white font-semibold"> Pokémon</span> e
          <span className="text-white font-semibold"> card games</span>. Treino, dedicação e
          paixão pelo competitivo.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <a
            href="#jogos"
            className="inline-flex items-center gap-2 rounded-md bg-red-600 hover:bg-red-500 px-7 py-4 text-base font-bold uppercase tracking-wider text-white shadow-[0_0_40px_rgba(220,38,38,0.6)] hover:shadow-[0_0_60px_rgba(220,38,38,0.9)] transition-all"
          >
            Conheça o time
          </a>
          <a
            href="#contato"
            className="inline-flex items-center gap-2 rounded-md border border-zinc-700 hover:border-zinc-500 bg-zinc-900/40 px-7 py-4 text-base font-bold uppercase tracking-wider text-zinc-200 transition-colors"
          >
            Fale conosco
          </a>
        </div>

        <div className="mt-10 flex items-center justify-center gap-5 text-zinc-500">
          <a href="#" aria-label="Instagram" className="hover:text-red-400 transition-colors">
            <Instagram className="h-5 w-5" />
          </a>
          <a href="#" aria-label="Twitter" className="hover:text-red-400 transition-colors">
            <Twitter className="h-5 w-5" />
          </a>
          <a href="#" aria-label="YouTube" className="hover:text-red-400 transition-colors">
            <Youtube className="h-5 w-5" />
          </a>
        </div>
      </div>
    </section>
  );
}
