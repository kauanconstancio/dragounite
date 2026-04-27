import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Trophy,
  Crosshair,
  Star,
  BarChart3,
  Activity,
  Zap,
  Swords,
} from "lucide-react";
import { PokemonImage } from "@/components/PokemonImage";
import { LANE_LABEL } from "@/lib/pokemon";
import {
  aggregatePlayer,
  kdaTimeline,
  mvpRate,
  performanceTimeline,
  playerWinRate,
  recentScrimsBreakdown,
  topPokemon,
  winRateByRole,
  type PerfRow,
  type ScrimMeta,
} from "@/lib/player-stats";

const KdaChart = lazy(() => import("@/components/dashboard/KdaChart").then((m) => ({ default: m.KdaChart })));
const PerformanceTimelineChart = lazy(() =>
  import("@/components/dashboard/PerformanceTimelineChart").then((m) => ({ default: m.PerformanceTimelineChart })),
);
const LaneWinrateChart = lazy(() =>
  import("@/components/dashboard/LaneWinrateChart").then((m) => ({ default: m.LaneWinrateChart })),
);

export const Route = createFileRoute("/jogadores/$memberId")({
  head: () => ({ meta: [{ title: "Perfil do jogador — Battle Arena" }] }),
  component: PlayerPage,
});

function PlayerPage() {
  const { memberId } = useParams({ from: "/jogadores/$memberId" });

  const { data: member } = useQuery({
    queryKey: ["member", memberId],
    queryFn: async () => {
      const { data, error } = await supabase.from("members").select("*").eq("id", memberId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: perfs = [] } = useQuery({
    queryKey: ["perfs", memberId],
    queryFn: async () => {
      const { data, error } = await supabase.from("match_performances").select("*").eq("member_id", memberId);
      if (error) throw error;
      return data as PerfRow[];
    },
  });

  const { data: scrims = [] } = useQuery({
    queryKey: ["scrims-for-perf"],
    queryFn: async () => {
      const { data, error } = await supabase.from("scrims").select("id, scheduled_at, result, opponent");
      if (error) throw error;
      return data as { id: string; scheduled_at: string; result: "win" | "loss" | "draw" | "pending"; opponent: string }[];
    },
  });

  const scrimMap = useMemo(
    () =>
      new Map<string, ScrimMeta>(
        scrims.map((s) => [s.id, { scheduled_at: s.scheduled_at, result: s.result, opponent: s.opponent }]),
      ),
    [scrims],
  );
  const dateMap = useMemo(() => new Map(scrims.map((s) => [s.id, s.scheduled_at])), [scrims]);

  const agg = aggregatePlayer(perfs);
  const wr = playerWinRate(perfs);
  const mvp = mvpRate(perfs);
  const top = topPokemon(perfs);
  const timeline = kdaTimeline(perfs, dateMap);
  const perfTimeline = performanceTimeline(perfs, scrimMap);
  const byRole = winRateByRole(perfs);
  const recent = recentScrimsBreakdown(perfs, scrimMap, 10);

  return (
    <div className="space-y-8">
      <Link to="/roster" className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> Roster
      </Link>

      <Card className="p-6 border-border shadow-card">
        <div className="flex items-center gap-5 flex-wrap">
          <div className="h-20 w-20 shrink-0">
            {member?.main_pokemon ? (
              <PokemonImage name={member.main_pokemon} withRoleBg />
            ) : (
              <div className="h-20 w-20 rounded-md bg-muted" />
            )}
          </div>
          <div className="flex-1">
            <h1 className="font-display text-4xl tracking-wider">{member?.name ?? "—"}</h1>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              {member?.ign && <Badge variant="outline" className="border-border">@{member.ign}</Badge>}
              {member?.lane && <Badge variant="outline" className="border-primary/40 text-primary uppercase tracking-wider">{LANE_LABEL[member.lane as keyof typeof LANE_LABEL]}</Badge>}
              {member?.main_pokemon && <Badge variant="outline" className="border-gold/40 text-gold">{member.main_pokemon}</Badge>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Win rate pessoal</div>
            <div className="font-display text-5xl text-gold">{wr.rate}%</div>
            <div className="text-xs text-muted-foreground">{wr.wins}V · {wr.losses}D</div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat icon={Crosshair} label="Kills/jogo" value={agg.k} accent="gold" />
        <Stat icon={Trophy} label="Assists/jogo" value={agg.a} accent="gold" />
        <Stat icon={Activity} label="KDA médio" value={agg.kda} accent="primary" />
        <Stat icon={Star} label="MVP rate" value={`${mvp.rate}%`} accent="gold" />
        <Stat icon={BarChart3} label="Jogos" value={agg.games} accent="primary" />
        <Stat icon={Star} label="MVPs" value={agg.mvp} accent="gold" />
        <Stat icon={Zap} label="Score médio" value={agg.avgScore.toLocaleString()} accent="primary" />
        <Stat icon={Swords} label="Dano médio" value={agg.dmg.toLocaleString()} accent="primary" />
      </div>

      <section className="grid lg:grid-cols-2 gap-5">
        <Card className="p-5 border-border shadow-card">
          <h2 className="font-display text-xl tracking-wider mb-4">EVOLUÇÃO DE KILLS E ASSISTÊNCIAS</h2>
          {timeline.length === 0 ? (
            <div className="text-sm text-muted-foreground py-10 text-center">Sem partidas registradas.</div>
          ) : (
            <Suspense fallback={<div className="h-64" />}>
              <KdaChart data={timeline} />
            </Suspense>
          )}
        </Card>

        <Card className="p-5 border-border shadow-card">
          <h2 className="font-display text-xl tracking-wider mb-4">SCORE & DANO POR PARTIDA</h2>
          {perfTimeline.length === 0 ? (
            <div className="text-sm text-muted-foreground py-10 text-center">Sem partidas registradas.</div>
          ) : (
            <Suspense fallback={<div className="h-64" />}>
              <PerformanceTimelineChart data={perfTimeline} />
            </Suspense>
          )}
        </Card>
      </section>

      <section className="grid lg:grid-cols-2 gap-5">
        <Card className="p-5 border-border shadow-card">
          <h2 className="font-display text-xl tracking-wider mb-1">WIN RATE POR PAPEL</h2>
          <p className="text-xs text-muted-foreground mb-4">Performance agrupada pelo papel Unite do pokémon jogado.</p>
          <Suspense fallback={<div className="h-32" />}>
            <LaneWinrateChart data={byRole} />
          </Suspense>
        </Card>

        <Card className="p-5 border-border shadow-card">
          <h2 className="font-display text-xl tracking-wider mb-4">TOP POKÉMON</h2>
          {top.length === 0 ? (
            <div className="text-sm text-muted-foreground py-10 text-center">Sem dados.</div>
          ) : (
            <div className="space-y-2">
              {top.map((t) => (
                <div key={t.pokemon} className="flex items-center gap-3 p-2 border border-border rounded-md">
                  <div className="h-10 w-10 shrink-0"><PokemonImage name={t.pokemon} withRoleBg /></div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{t.pokemon}</div>
                    <div className="text-xs text-muted-foreground">{t.count} {t.count === 1 ? "jogo" : "jogos"} · {t.wins}V {t.losses}D</div>
                  </div>
                  {t.winrate !== null ? (
                    <Badge variant="outline" className={t.winrate >= 50 ? "border-gold/40 text-gold" : "border-destructive/40 text-destructive"}>
                      {t.winrate}% WR
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-border text-muted-foreground">—</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      <Card className="p-5 border-border shadow-card">
        <h2 className="font-display text-xl tracking-wider mb-4">ÚLTIMAS SCRIMS</h2>
        {recent.length === 0 ? (
          <div className="text-sm text-muted-foreground py-10 text-center">Nenhuma partida registrada ainda.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border">
                  <th className="text-left font-normal py-2 pr-3">Data</th>
                  <th className="text-left font-normal py-2 pr-3">Oponente</th>
                  <th className="text-left font-normal py-2 pr-3">Pokémon</th>
                  <th className="text-center font-normal py-2 pr-3">G</th>
                  <th className="text-center font-normal py-2 pr-3">Resultado</th>
                  <th className="text-center font-normal py-2 pr-3">K/D/A</th>
                  <th className="text-center font-normal py-2 pr-3">KDA</th>
                  <th className="text-right font-normal py-2 pr-3">Score</th>
                  <th className="text-center font-normal py-2">MVP</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => {
                  const isWin = r.gameResult === "win";
                  const isLoss = r.gameResult === "loss";
                  return (
                    <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-2 pr-3 text-xs text-muted-foreground tabular-nums">
                        {new Date(r.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                      </td>
                      <td className="py-2 pr-3 truncate max-w-[140px]">{r.opponent}</td>
                      <td className="py-2 pr-3">
                        {r.pokemon ? (
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 shrink-0"><PokemonImage name={r.pokemon} withRoleBg /></div>
                            <span className="text-xs truncate">{r.pokemon}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-center text-xs text-muted-foreground">{r.gameNumber}</td>
                      <td className="py-2 pr-3 text-center">
                        <Badge
                          variant="outline"
                          className={
                            isWin
                              ? "border-gold/40 text-gold"
                              : isLoss
                                ? "border-destructive/40 text-destructive"
                                : "border-border text-muted-foreground"
                          }
                        >
                          {isWin ? "V" : isLoss ? "D" : r.gameResult === "draw" ? "E" : "—"}
                        </Badge>
                      </td>
                      <td className="py-2 pr-3 text-center text-xs tabular-nums">
                        {r.kills}/{r.deaths}/{r.assists}
                      </td>
                      <td className="py-2 pr-3 text-center text-xs font-medium tabular-nums">{r.kda}</td>
                      <td className="py-2 pr-3 text-right text-xs tabular-nums">{r.score.toLocaleString()}</td>
                      <td className="py-2 text-center">
                        {r.isMvp ? <Star className="h-4 w-4 text-gold inline-block fill-gold" /> : <span className="text-muted-foreground">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent }: { icon: any; label: string; value: any; accent: "gold" | "primary" }) {
  return (
    <Card className="p-4 border-border shadow-card">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
          <div className={`font-display text-3xl mt-1 ${accent === "gold" ? "text-gold" : "text-primary"}`}>{value}</div>
        </div>
        <Icon className={`h-6 w-6 opacity-50 ${accent === "gold" ? "text-gold" : "text-primary"}`} />
      </div>
    </Card>
  );
}
