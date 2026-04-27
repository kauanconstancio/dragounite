import uniteChar from "@/assets/games/char-unite.png";
import hokChar from "@/assets/games/char-hok.png";
import lolChar from "@/assets/games/char-lol.png";
import mlbbChar from "@/assets/games/char-mlbb.png";
import aovChar from "@/assets/games/char-aov.png";

const games = [
  { name: "Pokémon Unite", short: "Unite", img: uniteChar, status: "live" as const },
  { name: "Honor of Kings", short: "HOK", img: hokChar, status: "soon" as const },
  { name: "League of Legends", short: "LOL", img: lolChar, status: "soon" as const },
  { name: "Mobile Legends", short: "MLBB", img: mlbbChar, status: "soon" as const },
  { name: "Arena of Valor", short: "AOV", img: aovChar, status: "soon" as const },
];

export function GamesShowcaseSection() {
  return (
    <section id="games" className="relative overflow-hidden py-24">
      {/* Background ambience */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[900px] rounded-full bg-indigo-600/10 blur-[120px]" />
      </div>

      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-16">
          <div className="text-xs uppercase tracking-[0.3em] text-indigo-400 mb-3">
            Games we power
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
            Construído para os <span className="text-indigo-400">titãs</span> do MOBA
          </h2>
          <p className="mt-4 text-slate-400 max-w-xl mx-auto">
            Um único hub para todos os ecossistemas competitivos que importam.
          </p>
        </div>

        {/* Showcase grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {games.map((g) => (
            <div
              key={g.short}
              className={`group relative aspect-[3/4] overflow-hidden rounded-2xl border transition-all duration-500 ${
                g.status === "live"
                  ? "border-indigo-500/50 bg-gradient-to-b from-indigo-950/60 via-[#0d0d24] to-[#0a0a1a] shadow-[0_0_40px_rgba(79,70,229,0.25)]"
                  : "border-slate-800 bg-gradient-to-b from-[#141432]/60 to-[#0a0a1a] hover:border-indigo-500/30"
              }`}
            >
              {/* Decorative pattern */}
              <div
                className="absolute inset-0 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.6) 1px, transparent 0)",
                  backgroundSize: "16px 16px",
                }}
              />

              {/* Character splash art */}
              <img
                src={g.img}
                alt={g.name}
                width={768}
                height={1024}
                loading="lazy"
                className="absolute inset-x-0 bottom-0 h-[88%] w-full object-contain object-bottom group-hover:scale-105 transition-all duration-700 drop-shadow-[0_8px_30px_rgba(79,70,229,0.5)]"
              />

              {/* Top gradient label area */}
              <div className="absolute inset-x-0 top-0 p-4 z-10 bg-gradient-to-b from-[#0a0a1a] via-[#0a0a1a]/70 to-transparent pb-8">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono">
                    {g.short}
                  </span>
                  <span
                    className={`text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                      g.status === "live"
                        ? "border-indigo-400/60 text-indigo-300 bg-indigo-500/10"
                        : "border-slate-700 text-slate-500"
                    }`}
                  >
                    {g.status === "live" ? "Live" : "Em breve"}
                  </span>
                </div>
              </div>

              {/* Bottom name */}
              <div className="absolute inset-x-0 bottom-0 p-4 z-10 bg-gradient-to-t from-[#0a0a1a] via-[#0a0a1a]/80 to-transparent pt-12">
                <h3 className="text-sm font-bold text-white leading-tight">{g.name}</h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
