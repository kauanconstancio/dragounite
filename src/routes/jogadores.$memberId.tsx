import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trophy, Crosshair, Star, BarChart3 } from "lucide-react";
import { PokemonImage } from "@/components/PokemonImage";
import { LANE_LABEL } from "@/lib/pokemon";
import { aggregatePlayer, kdaTimeline, playerWinRate, topPokemon, type PerfRow } from "@/lib/player-stats";

const KdaChart = lazy(() => import("@/components/dashboard/KdaChart").then((m) => ({ default: m.KdaChart })));

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

  const dateMap = useMemo(() => new Map(scrims.map((s) => [s.id, s.scheduled_at])), [scrims]);
  const resultMap = useMemo(() => new Map(scrims.map((s) => [s.id, s.result])), [scrims]);

  const agg = aggregatePlayer(perfs);
  const wr = playerWinRate(perfs, resultMap);
  const top = topPokemon(perfs);
  const timeline = kdaTimeline(perfs, dateMap);

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
        <Stat icon={BarChart3} label="KDA médio" value={agg.kda.toFixed(2)} accent="gold" />
        <Stat icon={Crosshair} label="Kills/jogo" value={agg.k} accent="gold" />
        <Stat icon={Trophy} label="Assists/jogo" value={agg.a} accent="gold" />
        <Stat icon={Star} label="MVPs" value={agg.mvp} accent="gold" />
        <Stat icon={BarChart3} label="Score médio" value={agg.avgScore.toLocaleString()} accent="primary" />
        <Stat icon={BarChart3} label="Dano médio" value={agg.dmg.toLocaleString()} accent="primary" />
        <Stat icon={BarChart3} label="Jogos" value={agg.games} accent="primary" />
      </div>

      <section className="grid lg:grid-cols-2 gap-5">
        <Card className="p-5 border-border shadow-card">
          <h2 className="font-display text-xl tracking-wider mb-4">EVOLUÇÃO DE KDA</h2>
          {timeline.length === 0 ? (
            <div className="text-sm text-muted-foreground py-10 text-center">Sem partidas registradas.</div>
          ) : (
            <Suspense fallback={<div className="h-64" />}>
              <KdaChart data={timeline} />
            </Suspense>
          )}
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
                    <div className="text-xs text-muted-foreground">{t.count} jogos</div>
                  </div>
                  <Badge variant="outline" className="border-gold/40 text-gold">KDA {t.kda}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>
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
