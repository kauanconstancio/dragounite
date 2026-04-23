import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  Swords,
  Dumbbell,
  Users,
  CalendarDays,
  Flame,
  Megaphone,
  Sparkles,
  TrendingUp,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { WinrateChart } from "@/components/dashboard/WinrateChart";
import {
  computeWinrate,
  computeMatchWinrate,
  computeStreak,
  eventsThisMonth,
  lastNScrimsForChart,
  recentActivity,
  type ScrimLite,
  type TrainingLite,
  type MatchPerfLite,
} from "@/lib/stats";
import { PokemonImage } from "@/components/PokemonImage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Battle Arena" },
      { name: "description", content: "Visão geral de performance, agenda e estatísticas do time." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { data: scrims = [] } = useQuery({
    queryKey: ["scrims"],
    queryFn: async () => {
      const { data, error } = await supabase.from("scrims").select("*").order("scheduled_at");
      if (error) throw error;
      return data as ScrimLite[];
    },
  });

  const { data: trainings = [] } = useQuery({
    queryKey: ["trainings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("trainings").select("*").order("scheduled_at");
      if (error) throw error;
      return data as TrainingLite[];
    },
  });

  const { data: matchPerfs = [] } = useQuery({
    queryKey: ["match_performances", "winrate"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_performances")
        .select("scrim_id, game_number, result");
      if (error) throw error;
      return data as MatchPerfLite[];
    },
  });

  const { data: members = [] } = useQuery({
    queryKey: ["members"],
    queryFn: async () => {
      const { data, error } = await supabase.from("members").select("id, name, role, lane, main_pokemon");
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: comps = [] } = useQuery({
    queryKey: ["compositions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("compositions").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: announcements = [] } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data as any[];
    },
  });

  const wr = useMemo(() => computeWinrate(scrims), [scrims]);
  const matchWr = useMemo(() => computeMatchWinrate(matchPerfs), [matchPerfs]);
  const streak = useMemo(() => computeStreak(scrims), [scrims]);
  const chartData = useMemo(() => lastNScrimsForChart(scrims, matchPerfs, 10), [scrims, matchPerfs]);
  const activity = useMemo(() => recentActivity(scrims, 30), [scrims]);

  const next = useMemo(() => {
    const now = Date.now();
    const allEvents = [
      ...trainings.filter((t) => t.status === "scheduled").map((t: any) => ({
        kind: "training" as const,
        id: t.id,
        title: t.title,
        date: new Date(t.scheduled_at),
        href: "/treinos",
      })),
      ...scrims
        .filter((s: any) => s.status === "scheduled")
        .map((s: any) => ({
          kind: "scrim" as const,
          id: s.id,
          title: `vs ${s.opponent}`,
          date: new Date(s.scheduled_at),
          href: "/amistosos",
        })),
    ]
      .filter((e) => e.date.getTime() > now)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 4);
    return allEvents;
  }, [trainings, scrims]);

  const topPokemon = useMemo(() => {
    const counts = new Map<string, number>();
    members.forEach((m: any) => {
      if (m.main_pokemon) counts.set(m.main_pokemon, (counts.get(m.main_pokemon) ?? 0) + 1);
    });
    comps.forEach((c: any) => {
      ["top_pokemon", "jungle_pokemon", "mid_pokemon", "bot_pokemon", "support_pokemon"].forEach((k) => {
        if (c[k]) counts.set(c[k], (counts.get(c[k]) ?? 0) + 1);
      });
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [members, comps]);

  const activeRoster = members.filter((m: any) => m.role === "player").length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-5xl tracking-wider">
          BATTLE <span className="text-gold">DASHBOARD</span>
        </h1>
        <p className="mt-2 text-muted-foreground uppercase tracking-widest text-xs">
          Visão geral · Performance · Agenda
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          label="Winrate Scrims"
          value={wr.total ? `${wr.rate}%` : "—"}
          hint={`${wr.wins}V · ${wr.losses}D em ${wr.total}`}
          Icon={Trophy}
          accent="gold"
        />
        <KpiCard
          label="Winrate Partidas"
          value={matchWr.total ? `${matchWr.rate}%` : "—"}
          hint={`${matchWr.wins}V · ${matchWr.losses}D em ${matchWr.total} partidas`}
          Icon={Swords}
          accent="primary"
        />
        <KpiCard
          label="Streak atual"
          value={streak.count > 0 ? `${streak.count}${streak.type === "win" ? "W" : "L"}` : "—"}
          hint={streak.type === "win" ? "Sequência de vitórias" : streak.type === "loss" ? "Sequência de derrotas" : "Sem partidas"}
          Icon={Flame}
          accent={streak.type === "win" ? "emerald" : streak.type === "loss" ? "destructive" : "primary"}
        />
        <KpiCard
          label="Treinos no mês"
          value={eventsThisMonth(trainings)}
          hint={`${activity} scrims em 30d`}
          Icon={Dumbbell}
          accent="primary"
        />
        <KpiCard
          label="Roster ativo"
          value={activeRoster}
          hint={`${members.length} membros totais`}
          Icon={Users}
          accent="gold"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-5 border-border shadow-card bg-card/70">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-gold" />
              <h2 className="font-display text-xl tracking-wider">Partidas Ganhas vs Total</h2>
            </div>
            <Badge variant="outline" className="text-[10px] uppercase tracking-widest">
              Últimas {chartData.length || 0}
            </Badge>
          </div>
          <WinrateChart data={chartData} />
        </Card>

        <Card className="p-5 border-border shadow-card bg-card/70">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-primary" />
              <h2 className="font-display text-xl tracking-wider">Mural</h2>
            </div>
            <Link to="/mural" className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-gold">
              Ver tudo →
            </Link>
          </div>
          {announcements.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Nenhum aviso.</p>
          ) : (
            <div className="space-y-3">
              {announcements.map((a: any) => (
                <div key={a.id} className="rounded-md border border-border p-3 bg-background/40">
                  <div className="flex items-center gap-2 flex-wrap">
                    {a.pinned && (
                      <Badge variant="outline" className="border-gold/40 text-gold text-[9px] uppercase">
                        Fixado
                      </Badge>
                    )}
                    <h3 className="font-display text-sm tracking-wider">{a.title}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.body}</p>
                  <div className="text-[10px] text-muted-foreground mt-2 uppercase tracking-widest">
                    {format(new Date(a.created_at), "dd MMM · HH:mm", { locale: ptBR })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-5 border-border shadow-card bg-card/70">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              <h2 className="font-display text-xl tracking-wider">Próximos Eventos</h2>
            </div>
            <Link to="/agenda" className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-gold">
              Agenda →
            </Link>
          </div>
          {next.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Nada agendado.</p>
          ) : (
            <div className="space-y-2">
              {next.map((e, i) => {
                const Icon = e.kind === "training" ? Dumbbell : Swords;
                return (
                  <motion.div
                    key={e.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Link
                      to={e.href}
                      className="flex items-center gap-3 rounded-md border border-border p-3 hover:border-primary/50 transition-all bg-background/40 group"
                    >
                      <div
                        className={`shrink-0 h-10 w-10 rounded-md flex items-center justify-center border ${
                          e.kind === "training"
                            ? "bg-primary/15 border-primary/40 text-primary"
                            : "bg-gold/15 border-gold/40 text-gold"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-display text-sm tracking-wider truncate">{e.title}</div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
                          {format(e.date, "EEE, dd MMM · HH:mm", { locale: ptBR })}
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-5 border-border shadow-card bg-card/70">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-gold" />
              <h2 className="font-display text-xl tracking-wider">Top Pokémon</h2>
            </div>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Roster + Comps
            </span>
          </div>
          {topPokemon.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Sem dados ainda.</p>
          ) : (
            <div className="grid grid-cols-5 gap-2">
              {topPokemon.map(([pkm, count], idx) => (
                <div key={pkm} className="text-center">
                  <div className="aspect-square mb-1.5 relative">
                    <PokemonImage name={pkm} withRoleBg />
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-gold text-gold-foreground text-[10px] font-display flex items-center justify-center shadow-gold">
                      {idx + 1}
                    </span>
                  </div>
                  <div className="text-[9px] uppercase tracking-widest truncate text-foreground">{pkm}</div>
                  <div className="text-[9px] text-muted-foreground">{count}x</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
