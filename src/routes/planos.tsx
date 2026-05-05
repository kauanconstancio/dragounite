import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, X, ImageIcon, Type, Shield, AlertTriangle, Sparkles, ArrowRight } from "lucide-react";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingFooter";

export const Route = createFileRoute("/planos")({
  head: () => ({
    meta: [
      { title: "Planos — GymLy" },
      {
        name: "description",
        content:
          "Compare os planos Free e Pro do GymLy. Veja quais recursos usam artes oficiais e quais funcionam em modo texto para máxima segurança jurídica.",
      },
      { property: "og:title", content: "Planos — GymLy" },
      {
        property: "og:description",
        content:
          "Free com tudo essencial em modo texto. Pro adiciona analytics, exports e integrações.",
      },
    ],
  }),
  component: PlanosPage,
});

type PlanFeature = { label: string; free: boolean | string; pro: boolean | string };

const PLAN_FEATURES: PlanFeature[] = [
  { label: "Roster e gestão de jogadores", free: true, pro: true },
  { label: "Agenda de scrims e treinos", free: true, pro: true },
  { label: "Draft simulator (modo texto)", free: true, pro: true },
  { label: "Histórico de partidas", free: "Últimas 30", pro: "Ilimitado" },
  { label: "Membros por equipe", free: "Até 8", pro: "Ilimitado" },
  { label: "Analytics avançado (KDA, lane winrate, timeline)", free: false, pro: true },
  { label: "Export PDF / CSV", free: false, pro: true },
  { label: "Integrações Discord / Webhooks", free: false, pro: true },
  { label: "Multi-equipes (alt rosters / academy)", free: false, pro: true },
  { label: "Modo apresentação para coaching", free: false, pro: true },
  { label: "Suporte prioritário", free: false, pro: true },
];

type GameMatrix = {
  game: string;
  status: "live" | "soon";
  license: "Permitido" | "Sem licença pública" | "Risco alto";
  licenseColor: "green" | "amber" | "red";
  freeMode: string;
  proMode: string;
  source: string;
};

const GAMES_MATRIX: GameMatrix[] = [
  {
    game: "League of Legends",
    status: "soon",
    license: "Permitido",
    licenseColor: "green",
    freeMode: "Artes oficiais (Data Dragon)",
    proMode: "Artes oficiais (Data Dragon)",
    source: "Riot Games — Legal Jibber Jabber + API oficial",
  },
  {
    game: "Pokémon Unite",
    status: "live",
    license: "Sem licença pública",
    licenseColor: "amber",
    freeMode: "Modo texto (role tiles + iniciais)",
    proMode: "Modo texto (role tiles + iniciais)",
    source: "The Pokémon Company não publica política de fan-tools",
  },
  {
    game: "Honor of Kings",
    status: "soon",
    license: "Sem licença pública",
    licenseColor: "amber",
    freeMode: "Modo texto",
    proMode: "Modo texto",
    source: "Tencent / TiMi — sem política pública para third-party",
  },
  {
    game: "Mobile Legends",
    status: "soon",
    license: "Risco alto",
    licenseColor: "red",
    freeMode: "Modo texto",
    proMode: "Modo texto",
    source: "Moonton já moveu ações contra ferramentas third-party",
  },
  {
    game: "Arena of Valor",
    status: "soon",
    license: "Sem licença pública",
    licenseColor: "amber",
    freeMode: "Modo texto",
    proMode: "Modo texto",
    source: "Tencent / Garena — sem política pública",
  },
];

const licenseChip = {
  green: "border-emerald-400/40 bg-emerald-500/10 text-emerald-300",
  amber: "border-amber-400/40 bg-amber-500/10 text-amber-300",
  red: "border-rose-400/40 bg-rose-500/10 text-rose-300",
} as const;

function Cell({ value }: { value: boolean | string }) {
  if (value === true) return <Check className="h-4 w-4 text-emerald-400" />;
  if (value === false) return <X className="h-4 w-4 text-slate-600" />;
  return <span className="text-xs text-slate-300">{value}</span>;
}

function PlanosPage() {
  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white">
      <LandingNav />

      {/* Hero */}
      <section className="relative overflow-hidden pt-20 pb-16">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[400px] w-[700px] rounded-full bg-indigo-600/20 blur-3xl" />
        </div>
        <div className="mx-auto max-w-5xl px-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs text-indigo-300 mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            Planos transparentes
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05]">
            Comece grátis. <span className="bg-gradient-to-r from-indigo-400 to-purple-300 bg-clip-text text-transparent">Escale com o Pro.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400">
            Nosso valor está em <span className="text-slate-200">analytics, integrações e workflow</span> —
            não em artes de personagens. Por isso o Free entrega tudo que importa, mesmo sem depender de imagens oficiais.
          </p>
        </div>
      </section>

      {/* Plan cards */}
      <section className="pb-16">
        <div className="mx-auto max-w-5xl px-6 grid md:grid-cols-2 gap-6">
          {/* Free */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-2xl font-bold">Free</h2>
              <span className="text-xs uppercase tracking-widest text-slate-500">Comunidade</span>
            </div>
            <p className="text-sm text-slate-400 mb-6">Tudo que um time competitivo precisa para começar.</p>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-5xl font-bold">R$ 0</span>
              <span className="text-slate-500">/mês</span>
            </div>
            <Link
              to="/cadastro"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 hover:border-indigo-400/60 bg-slate-900/60 hover:bg-indigo-500/10 px-5 py-3 text-sm font-medium text-slate-200 transition-colors"
            >
              Começar grátis
            </Link>
            <div className="mt-6 flex items-start gap-2 rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-xs text-slate-400">
              <Type className="h-4 w-4 shrink-0 mt-0.5 text-slate-500" />
              <span>
                Personagens exibidos em <span className="text-slate-200">modo texto</span> com tiles coloridos por role.
                Nenhuma dependência de assets de terceiros.
              </span>
            </div>
          </div>

          {/* Pro */}
          <div className="relative rounded-2xl border border-indigo-500/50 bg-gradient-to-b from-indigo-950/60 via-[#0d0d24] to-[#0a0a1a] p-8 shadow-[0_0_50px_rgba(79,70,229,0.25)]">
            <div className="absolute -top-3 left-8 inline-flex items-center gap-1 rounded-full bg-indigo-500 px-3 py-1 text-[10px] uppercase tracking-widest text-white font-bold">
              <Sparkles className="h-3 w-3" /> Recomendado
            </div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-2xl font-bold">Pro</h2>
              <span className="text-xs uppercase tracking-widest text-indigo-300">Times sérios</span>
            </div>
            <p className="text-sm text-slate-400 mb-6">Analytics, integrações e workflow para times competitivos.</p>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-5xl font-bold">R$ 49</span>
              <span className="text-slate-500">/mês por equipe</span>
            </div>
            <a
              href="#waitlist"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_0_30px_rgba(79,70,229,0.5)] transition-all"
            >
              Entrar na waitlist Pro
              <ArrowRight className="h-4 w-4" />
            </a>
            <div className="mt-6 flex items-start gap-2 rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-3 text-xs text-indigo-200/80">
              <Shield className="h-4 w-4 shrink-0 mt-0.5 text-indigo-300" />
              <span>
                O valor do Pro está em <span className="text-white">dados, exports e integrações</span> — recursos
                proprietários, sem depender de IP de terceiros.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature comparison */}
      <section className="pb-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-2xl font-bold mb-6">Comparativo de recursos</h2>
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/30">
            <table className="w-full text-sm min-w-[480px]">
              <thead className="bg-slate-900/60 text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="text-left font-medium px-5 py-3">Recurso</th>
                  <th className="text-center font-medium px-5 py-3 w-32">Free</th>
                  <th className="text-center font-medium px-5 py-3 w-32 text-indigo-300">Pro</th>
                </tr>
              </thead>
              <tbody>
                {PLAN_FEATURES.map((f, i) => (
                  <tr key={f.label} className={i % 2 === 0 ? "bg-slate-900/10" : ""}>
                    <td className="px-5 py-3 text-slate-200">{f.label}</td>
                    <td className="px-5 py-3 text-center"><div className="inline-flex"><Cell value={f.free} /></div></td>
                    <td className="px-5 py-3 text-center"><div className="inline-flex"><Cell value={f.pro} /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Game-by-game artwork policy */}
      <section className="pb-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-8">
            <div className="text-xs uppercase tracking-[0.3em] text-indigo-400 mb-2">Política de imagens por jogo</div>
            <h2 className="text-3xl font-bold mb-3">Transparência sobre artes oficiais</h2>
            <p className="text-slate-400 max-w-3xl">
              Só usamos artes oficiais de personagens quando o publisher publica uma política clara permitindo o uso
              em ferramentas de comunidade. Caso contrário, operamos em <span className="text-slate-200">modo texto</span> —
              mais seguro juridicamente e funcionalmente equivalente.
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/30">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/60 text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="text-left font-medium px-5 py-3">Jogo</th>
                  <th className="text-left font-medium px-5 py-3">Status da licença</th>
                  <th className="text-left font-medium px-5 py-3">Free</th>
                  <th className="text-left font-medium px-5 py-3">Pro</th>
                </tr>
              </thead>
              <tbody>
                {GAMES_MATRIX.map((g, i) => (
                  <tr key={g.game} className={i % 2 === 0 ? "bg-slate-900/10" : ""}>
                    <td className="px-5 py-4 align-top">
                      <div className="font-semibold text-white">{g.game}</div>
                      <div className="text-[11px] uppercase tracking-widest text-slate-500 mt-1">
                        {g.status === "live" ? "Disponível" : "Em breve"}
                      </div>
                      <div className="text-xs text-slate-500 mt-2 max-w-[220px]">{g.source}</div>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${licenseChip[g.licenseColor]}`}>
                        {g.licenseColor === "green" ? (
                          <Shield className="h-3 w-3" />
                        ) : (
                          <AlertTriangle className="h-3 w-3" />
                        )}
                        {g.license}
                      </span>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <ModeBadge mode={g.freeMode} />
                    </td>
                    <td className="px-5 py-4 align-top">
                      <ModeBadge mode={g.proMode} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 grid sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4 flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-400/30 flex items-center justify-center shrink-0">
                <ImageIcon className="h-4 w-4 text-emerald-300" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white">Modo arte oficial</div>
                <p className="text-xs text-slate-400 mt-1">
                  Habilitado apenas para jogos com permissão pública (LoL via Data Dragon).
                  Carregado direto da CDN oficial do publisher.
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4 flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-indigo-500/10 border border-indigo-400/30 flex items-center justify-center shrink-0">
                <Type className="h-4 w-4 text-indigo-300" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white">Modo texto (padrão)</div>
                <p className="text-xs text-slate-400 mt-1">
                  Tiles coloridos por role + nome/iniciais do personagem. Sem dependência de IP de terceiros,
                  sem risco autoral, e funciona offline.
                </p>
              </div>
            </div>
          </div>

          <p className="mt-8 text-xs text-slate-500 max-w-3xl">
            GymLy é uma ferramenta independente, sem afiliação ou endosso de Riot Games, The Pokémon Company,
            Tencent, TiMi Studios, Moonton ou Garena. Marcas e nomes de personagens pertencem aos seus respectivos titulares.
          </p>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}

function ModeBadge({ mode }: { mode: string }) {
  const isOfficial = mode.toLowerCase().includes("oficia");
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${isOfficial ? "text-emerald-300" : "text-slate-300"}`}>
      {isOfficial ? <ImageIcon className="h-3.5 w-3.5" /> : <Type className="h-3.5 w-3.5" />}
      {mode}
    </span>
  );
}
