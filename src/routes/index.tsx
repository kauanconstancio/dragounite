import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Heart,
  Check,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { WinrateBarChart } from "@/components/dashboard/WinrateBarChart";
import {
  computeWinrate,
  computeMatchWinrate,
  computeStreak,
  eventsThisMonth,
  recentActivity,
  type ScrimLite,
  type TrainingLite,
  type RadarPerfLite,
} from "@/lib/stats";
import { PokemonImage } from "@/components/PokemonImage";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentTeam } from "@/hooks/useCurrentTeam";
import { toast } from "sonner";

type LikeRow = { announcement_id: string; user_id: string };

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
  const { user } = useAuth();
  const { team, isTeamCoach } = useCurrentTeam();
  const teamId = team?.id;
  const qc = useQueryClient();

  const { data: scrims = [] } = useQuery({
    queryKey: ["scrims", teamId],
    queryFn: async () => {
      if (!teamId) return [] as ScrimLite[];
      const { data, error } = await supabase.from("scrims").select("*").eq("team_id", teamId).order("scheduled_at");
      if (error) throw error;
      return data as ScrimLite[];
    },
    enabled: !!teamId,
  });

  const { data: trainings = [] } = useQuery({
    queryKey: ["trainings", teamId],
    queryFn: async () => {
      if (!teamId) return [] as TrainingLite[];
      const { data, error } = await supabase.from("trainings").select("*").eq("team_id", teamId).order("scheduled_at");
      if (error) throw error;
      return data as TrainingLite[];
    },
    enabled: !!teamId,
  });

  const { data: matchPerfs = [] } = useQuery({
    queryKey: ["match_performances", "radar", teamId],
    queryFn: async () => {
      if (!teamId) return [] as RadarPerfLite[];
      const { data, error } = await supabase
        .from("match_performances")
        .select("scrim_id, game_number, result, kills, deaths, assists, damage_dealt, is_mvp")
        .eq("team_id", teamId);
      if (error) throw error;
      return data as RadarPerfLite[];
    },
    enabled: !!teamId,
  });

  const { data: pokemonUsage = [] } = useQuery({
    queryKey: ["match_performances", "pokemon_usage", teamId],
    queryFn: async () => {
      if (!teamId) return [] as { pokemon: string | null; result: string; scrim_id: string; game_number: number }[];
      const { data, error } = await supabase
        .from("match_performances")
        .select("pokemon, result, scrim_id, game_number")
        .eq("team_id", teamId);
      if (error) throw error;
      return data as { pokemon: string | null; result: string; scrim_id: string; game_number: number }[];
    },
    enabled: !!teamId,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["members", teamId],
    queryFn: async () => {
      if (!teamId) return [] as any[];
      const { data, error } = await supabase.from("members").select("id, name, role, lane, main_pokemon").eq("team_id", teamId);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!teamId,
  });

  const { data: comps = [] } = useQuery({
    queryKey: ["compositions", teamId],
    queryFn: async () => {
      if (!teamId) return [] as any[];
      const { data, error } = await supabase.from("compositions").select("*").eq("team_id", teamId).order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!teamId,
  });

  const { data: announcements = [] } = useQuery({
    queryKey: ["announcements", "dashboard", teamId],
    queryFn: async () => {
      if (!teamId) return [] as any[];
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("team_id", teamId)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!teamId,
  });

  const { data: announcementLikes = [] } = useQuery({
    queryKey: ["announcement_likes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcement_likes")
        .select("announcement_id, user_id");
      if (error) throw error;
      return data as LikeRow[];
    },
  });

  const toggleLike = useMutation({
    mutationFn: async ({ id, liked }: { id: string; liked: boolean }) => {
      if (!user) throw new Error("Faça login para curtir");
      if (liked) {
        const { error } = await supabase
          .from("announcement_likes")
          .delete()
          .eq("announcement_id", id)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("announcement_likes")
          .insert({ announcement_id: id, user_id: user.id });
        if (error) throw error;
      }
    },
    onMutate: async ({ id, liked }) => {
      if (!user) return;
      await qc.cancelQueries({ queryKey: ["announcement_likes"] });
      const prev = qc.getQueryData<LikeRow[]>(["announcement_likes"]) ?? [];
      const next = liked
        ? prev.filter((l) => !(l.announcement_id === id && l.user_id === user.id))
        : [...prev, { announcement_id: id, user_id: user.id }];
      qc.setQueryData(["announcement_likes"], next);
      return { prev };
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["announcement_likes"], ctx.prev);
      toast.error(e.message);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["announcement_likes"] }),
  });

  const wr = useMemo(() => computeWinrate(scrims), [scrims]);
  const matchWr = useMemo(() => computeMatchWinrate(matchPerfs), [matchPerfs]);
  const streak = useMemo(() => computeStreak(scrims), [scrims]);
  const activity = useMemo(() => recentActivity(scrims, 30), [scrims]);

  const [eventFilter, setEventFilter] = useState<"all" | "training" | "scrim">("all");

  const updateEventStatus = useMutation({
    mutationFn: async ({
      kind,
      id,
      status,
    }: {
      kind: "training" | "scrim";
      id: string;
      status: "completed" | "cancelled";
    }) => {
      const table = kind === "training" ? "trainings" : "scrims";
      const { error } = await supabase.from(table).update({ status }).eq("id", id);
      if (error) throw error;
      return { kind, status };
    },
    onSuccess: ({ kind, status }) => {
      qc.invalidateQueries({ queryKey: [kind === "training" ? "trainings" : "scrims", teamId] });
      toast.success(status === "completed" ? "Evento concluído" : "Evento cancelado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { todayEvents, next } = useMemo(() => {
    const now = Date.now();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const all = [
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
      .filter((e) => eventFilter === "all" || e.kind === eventFilter)
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    const todayAll = all.filter(
      (e) => e.date.getTime() >= startOfToday.getTime() && e.date.getTime() <= endOfToday.getTime(),
    );
    // Próximos primeiro (a partir de agora, ordem crescente), depois os que já passaram (mais recentes primeiro)
    const upcomingToday = todayAll
      .filter((e) => e.date.getTime() >= now)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    const pastToday = todayAll
      .filter((e) => e.date.getTime() < now)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
    const todayEvents = [
      ...upcomingToday.map((e) => ({ ...e, past: false })),
      ...pastToday.map((e) => ({ ...e, past: true })),
    ];
    const next = all.filter((e) => e.date.getTime() > now).slice(0, 4);
    return { todayEvents, next };
  }, [trainings, scrims, eventFilter]);

  const topPokemon = useMemo(() => {
    // Dedup por scrim+game+pokemon: cada game de cada pokemon conta 1x (result vem do game)
    const seen = new Map<string, { pokemon: string; result: string }>();
    for (const p of pokemonUsage) {
      if (!p.pokemon) continue;
      const key = `${p.scrim_id}:${p.game_number}:${p.pokemon}`;
      if (!seen.has(key)) seen.set(key, { pokemon: p.pokemon, result: p.result });
    }
    const stats = new Map<string, { uses: number; wins: number; losses: number }>();
    for (const { pokemon, result } of seen.values()) {
      const s = stats.get(pokemon) ?? { uses: 0, wins: 0, losses: 0 };
      s.uses += 1;
      if (result === "win") s.wins += 1;
      else if (result === "loss") s.losses += 1;
      stats.set(pokemon, s);
    }
    return [...stats.entries()]
      .map(([pokemon, s]) => {
        const decided = s.wins + s.losses;
        const wr = decided ? Math.round((s.wins / decided) * 100) : null;
        return { pokemon, uses: s.uses, wins: s.wins, losses: s.losses, wr };
      })
      .sort((a, b) => b.uses - a.uses)
      .slice(0, 10);
  }, [pokemonUsage]);

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
        <Card className="p-5 border-border shadow-card bg-card/70">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-gold" />
              <div>
                <h2 className="font-display text-xl tracking-wider">Winrate</h2>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">
                  Scrims · Partidas
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] uppercase tracking-widest">
              Time
            </Badge>
          </div>
          <WinrateBarChart scrimWr={wr} matchWr={matchWr} />
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
              {announcements.map((a: any) => {
                const list = announcementLikes.filter((l) => l.announcement_id === a.id);
                const count = list.length;
                const liked = !!user && list.some((l) => l.user_id === user.id);
                return (
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
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-widest">
                        {format(new Date(a.created_at), "dd MMM · HH:mm", { locale: ptBR })}
                      </div>
                      <Button
                        size="sm"
                        variant={liked ? "default" : "outline"}
                        disabled={!user}
                        onClick={() => toggleLike.mutate({ id: a.id, liked })}
                        className={`h-6 px-2 text-[10px] gap-1 ${liked ? "" : "hover:text-gold hover:border-gold/40"}`}
                        title={user ? (liked ? "Descurtir" : "Curtir") : "Faça login para curtir"}
                      >
                        <Heart className={`h-3 w-3 ${liked ? "fill-current" : ""}`} />
                        {count}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-5 border-border shadow-card bg-card/70">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              <h2 className="font-display text-xl tracking-wider">Próximos Eventos</h2>
            </div>
            <Link to="/agenda" className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-gold">
              Agenda →
            </Link>
          </div>
          <div className="flex items-center gap-1 mb-4 p-1 rounded-md border border-border bg-background/40">
            {([
              { key: "all", label: "Todos", Icon: CalendarDays },
              { key: "training", label: "Treinos", Icon: Dumbbell },
              { key: "scrim", label: "Amistosos", Icon: Swords },
            ] as const).map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setEventFilter(key)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-[10px] uppercase tracking-widest font-display transition-all ${
                  eventFilter === key
                    ? key === "training"
                      ? "bg-primary/20 text-primary border border-primary/40"
                      : key === "scrim"
                        ? "bg-gold/20 text-gold border border-gold/40"
                        : "bg-foreground/10 text-foreground border border-border"
                    : "text-muted-foreground hover:text-foreground border border-transparent"
                }`}
              >
                <Icon className="h-3 w-3" />
                {label}
              </button>
            ))}
          </div>
          {todayEvents.length === 0 && next.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Nada agendado.</p>
          ) : (
            <div className="space-y-4">
              {todayEvents.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] uppercase tracking-widest text-gold font-display">Hoje</span>
                    <span className="h-px flex-1 bg-gold/20" />
                    <span className="text-[10px] text-muted-foreground">{todayEvents.length}</span>
                  </div>
                  <div className="space-y-2">
                    {todayEvents.map((e, i) => {
                      const Icon = e.kind === "training" ? Dumbbell : Swords;
                      return (
                        <motion.div
                          key={e.id}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04 }}
                        >
                          <div
                            className={`flex items-center gap-2 rounded-md border p-3 group transition-opacity ${
                              e.past ? "border-border bg-background/40 opacity-60" : "border-gold/30 bg-gold/5"
                            }`}
                          >
                            <Link to={e.href} className="flex items-center gap-3 flex-1 min-w-0">
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
                                  {format(e.date, "HH:mm", { locale: ptBR })}
                                  {e.past && <span className="text-[9px] uppercase tracking-widest">· passou</span>}
                                </div>
                              </div>
                            </Link>
                            {isTeamCoach && (
                              <div className="flex items-center gap-1 shrink-0">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={updateEventStatus.isPending}
                                  onClick={() =>
                                    updateEventStatus.mutate({ kind: e.kind, id: e.id, status: "completed" })
                                  }
                                  className="h-8 w-8 p-0 hover:text-emerald-400 hover:border-emerald-400/40"
                                  title="Marcar como concluído"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={updateEventStatus.isPending}
                                  onClick={() =>
                                    updateEventStatus.mutate({ kind: e.kind, id: e.id, status: "cancelled" })
                                  }
                                  className="h-8 w-8 p-0 hover:text-destructive hover:border-destructive/40"
                                  title="Cancelar evento"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

              {next.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-display">Próximos</span>
                    <span className="h-px flex-1 bg-border" />
                  </div>
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
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      <Card className="p-5 border-border shadow-card bg-card/70">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-gold" />
            <h2 className="font-display text-xl tracking-wider">Pokémon Mais Utilizados</h2>
          </div>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Partidas registradas
          </span>
        </div>
        {topPokemon.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Sem dados ainda.</p>
        ) : (
          <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-10 gap-3">
            {topPokemon.map((p, idx) => {
              const wrColor =
                p.wr === null
                  ? "text-muted-foreground"
                  : p.wr >= 60
                    ? "text-emerald-400"
                    : p.wr >= 45
                      ? "text-gold"
                      : "text-destructive";
              return (
                <div key={p.pokemon} className="text-center">
                  <div className="aspect-square mb-1.5 relative">
                    <PokemonImage name={p.pokemon} withRoleBg />
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-gold text-gold-foreground text-[10px] font-display flex items-center justify-center shadow-gold">
                      {idx + 1}
                    </span>
                  </div>
                  <div className="text-[9px] uppercase tracking-widest truncate text-foreground">{p.pokemon}</div>
                  <div className="text-[9px] text-muted-foreground">{p.uses}x</div>
                  <div className={`text-[10px] font-display tracking-wider ${wrColor}`}>
                    {p.wr === null ? "—" : `${p.wr}%`}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
