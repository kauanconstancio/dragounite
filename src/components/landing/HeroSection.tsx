import { ArrowRight, Sparkles, KeyRound } from "lucide-react";
import { Link } from "@tanstack/react-router";
import uniteChar from "@/assets/games/char-unite.webp";
import hokChar from "@/assets/games/char-hok.webp";
import lolChar from "@/assets/games/char-lol.webp";
import mlbbChar from "@/assets/games/char-mlbb.webp";

export function HeroSection() {
  return (
    <section id="top" className="relative overflow-hidden pt-20 pb-32">
      {/* Background glow */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[500px] w-[900px] rounded-full bg-indigo-600/20 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* Floating game character splash arts (decorative, lazy) */}
        <img
          src={uniteChar}
          alt=""
          aria-hidden="true"
          width={768}
          height={1024}
          loading="lazy"
          decoding="async"
          className="hidden md:block absolute top-32 left-[2%] w-40 lg:w-52 opacity-25 -rotate-12 select-none pointer-events-none"
        />
        <img
          src={hokChar}
          alt=""
          aria-hidden="true"
          width={768}
          height={1024}
          loading="lazy"
          decoding="async"
          className="hidden md:block absolute top-16 right-[3%] w-44 lg:w-56 opacity-20 rotate-6 select-none pointer-events-none"
        />
        <img
          src={lolChar}
          alt=""
          aria-hidden="true"
          width={768}
          height={1024}
          loading="lazy"
          decoding="async"
          className="hidden lg:block absolute top-[58%] left-[1%] w-36 opacity-20 rotate-3 select-none pointer-events-none"
        />
        <img
          src={mlbbChar}
          alt=""
          aria-hidden="true"
          width={768}
          height={1024}
          loading="lazy"
          decoding="async"
          className="hidden lg:block absolute top-[62%] right-[1%] w-40 opacity-20 -rotate-6 select-none pointer-events-none"
        />
      </div>

      <div className="mx-auto max-w-7xl px-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs text-indigo-300 mb-8">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Em early access · Pokémon Unite</span>
        </div>

        <h1 className="mx-auto max-w-4xl text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.05]">
          Eleve seu time de{" "}
          <span className="bg-gradient-to-r from-indigo-400 via-indigo-300 to-purple-300 bg-clip-text text-transparent">
            esports
          </span>{" "}
          ao próximo nível
        </h1>

        <p className="mx-auto mt-8 max-w-2xl text-lg sm:text-xl text-slate-400 leading-relaxed">
          GymLy é a plataforma all-in-one para gerenciar roster, scrims, drafts e
          a evolução dos seus jogadores.{" "}
          <span className="text-slate-200">
            Decisões guiadas por dados, não por achismo.
          </span>
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <a
            href="#waitlist"
            className="group inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-7 py-4 text-base font-semibold text-white shadow-[0_0_40px_rgba(79,70,229,0.5)] hover:shadow-[0_0_60px_rgba(79,70,229,0.8)] transition-all"
          >
            Entrar na waitlist
            <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </a>
          <Link
            to="/cadastro"
            className="group inline-flex items-center gap-2 rounded-xl border border-indigo-400/40 hover:border-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-7 py-4 text-base font-medium text-indigo-200 transition-colors"
          >
            <KeyRound className="h-4 w-4" />
            Já fui aprovado · Acessar
          </Link>
          <a
            href="#features"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 hover:border-slate-500 bg-slate-900/40 px-7 py-4 text-base font-medium text-slate-200 transition-colors"
          >
            Ver recursos
          </a>
        </div>

        {/* Mockup */}
        <div className="relative mt-20 mx-auto max-w-5xl">
          <div className="absolute -inset-4 bg-gradient-to-r from-indigo-600/30 via-purple-600/20 to-indigo-600/30 rounded-2xl blur-2xl" />
          <div className="relative rounded-2xl border border-indigo-500/20 bg-gradient-to-b from-[#141432] to-[#0a0a1a] p-6 shadow-2xl">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-3 w-3 rounded-full bg-red-500/60" />
              <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
              <div className="h-3 w-3 rounded-full bg-green-500/60" />
              <div className="ml-3 text-xs text-slate-500 font-mono">gymly.app/dashboard</div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Win Rate", value: "68%", trend: "+12%" },
                { label: "KA Médio", value: "9.4", trend: "+1.2" },
                { label: "Scrims", value: "42", trend: "esta semana" },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  className="rounded-xl border border-indigo-500/10 bg-[#0a0a1a]/60 p-4 text-left"
                >
                  <div className="text-[10px] uppercase tracking-widest text-slate-500">
                    {kpi.label}
                  </div>
                  <div className="mt-2 text-3xl font-bold text-white">{kpi.value}</div>
                  <div className="mt-1 text-xs text-indigo-400">{kpi.trend}</div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-indigo-500/10 bg-[#0a0a1a]/60 p-4 h-48 flex items-end gap-2">
              {[40, 65, 50, 80, 70, 90, 75, 95, 85, 100, 88, 92].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t bg-gradient-to-t from-indigo-600 to-indigo-400"
                  style={{ height: `${h}%`, opacity: 0.4 + i * 0.05 }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
