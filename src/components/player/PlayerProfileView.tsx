import { lazy, Suspense, useMemo, useState, type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PokemonImage } from "@/components/PokemonImage";
import { PerformanceDialog } from "@/components/scouting/PerformanceDialog";
import { LANE_LABEL, ROLE_COLORS, ROLE_LABEL } from "@/lib/pokemon";
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
import {
  UserCircle,
  Gamepad2,
  MessageSquare,
  Hash,
  Map as MapIcon,
  Star,
  TrendingUp,
  BarChart3,
  Crosshair,
  Trophy,
  Activity,
  Zap,
  Swords,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const KdaChart = lazy(() => import("@/components/dashboard/KdaChart").then((m) => ({ default: m.KdaChart })));
const PerformanceTimelineChart = lazy(() =>
  import("@/components/dashboard/PerformanceTimelineChart").then((m) => ({ default: m.PerformanceTimelineChart })),
);
const LaneWinrateChart = lazy(() =>
  import("@/components/dashboard/LaneWinrateChart").then((m) => ({ default: m.LaneWinrateChart })),
);

export type PlayerProfileMember = {
  id: string;
  name: string;
  ign: string | null;
  game_id: string | null;
  role: "player" | "substitute" | "coach" | "manager";
  lane: "top" | "jungle" | "mid" | "bot" | "support" | "flex" | null;
  main_pokemon: string | null;
  discord: string | null;
  notes: string | null;
};

type Scrim = {
  id: string;
  scheduled_at: string;
  result: "win" | "loss" | "draw" | "pending";
  opponent?: string;
  best_of?: number;
  opponent_id?: string | null;
  status?: "scheduled" | "completed" | "cancelled";
};

export function PlayerProfileView({
  member,
  perfs,
  scrims,
  email,
  headerEyebrow,
  headerAction,
}: {
  member: PlayerProfileMember;
  perfs: PerfRow[];
  scrims: Scrim[];
  email?: string | null;
  headerEyebrow?: string;
  headerAction?: ReactNode;
}) {
  const scrimMap = useMemo(
    () =>
      new Map<string, ScrimMeta>(
        scrims.map((s) => [s.id, { scheduled_at: s.scheduled_at, result: s.result, opponent: s.opponent ?? "—" }]),
      ),
    [scrims],
  );
  const dateMap = useMemo(() => new Map(scrims.map((s) => [s.id, s.scheduled_at])), [scrims]);

  const agg = aggregatePlayer(perfs);
  const wr = playerWinRate(perfs);
  const mvp = mvpRate(perfs);
  const top = topPokemon(perfs, 6);
  const timeline = kdaTimeline(perfs, dateMap);
  const perfTimeline = performanceTimeline(perfs, scrimMap);
  const byRole = winRateByRole(perfs);
  const recent = recentScrimsBreakdown(perfs, scrimMap, perfs.length);

  const PAGE_SIZE = 10;
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(recent.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pagedRecent = recent.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  const hasGames = agg.games > 0;

  const scrimsById = useMemo(() => new Map(scrims.map((s) => [s.id, s])), [scrims]);
  const [openScrim, setOpenScrim] = useState<Scrim | null>(null);

  return (
    <div className="space-y-6">
      {/* HERO */}
      <Card className="relative overflow-hidden border-border bg-gradient-to-br from-card via-card to-muted/30 p-6 sm:p-8">
        <div className="absolute inset-0 -z-0 opacity-20 pointer-events-none">
          <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-primary/30 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-gold/20 blur-3xl" />
        </div>

        <div className="relative flex flex-col sm:flex-row items-start gap-6">
          <div className="relative shrink-0">
            {member.main_pokemon ? (
              <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-2xl overflow-hidden ring-2 ring-gold/40 shadow-glow">
                <PokemonImage name={member.main_pokemon} withRoleBg />
              </div>
            ) : (
              <div className="flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground font-display text-5xl shadow-glow ring-2 ring-gold/40">
                {member.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            {headerEyebrow && (
              <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{headerEyebrow}</div>
            )}
            <h1 className="font-display text-3xl sm:text-5xl tracking-wider leading-tight mt-1 break-words">
              {member.ign || member.name}
            </h1>
            <div className="text-sm text-muted-foreground mt-1">{member.name}</div>

            <div className="flex flex-wrap gap-2 mt-3">
              <Badge className={`uppercase tracking-wider text-[10px] ${ROLE_COLORS[member.role]}`} variant="outline">
                {ROLE_LABEL[member.role]}
              </Badge>
              {member.lane && (
                <Badge variant="outline" className="uppercase tracking-wider text-[10px] border-gold/40 text-gold">
                  <MapIcon className="h-3 w-3 mr-1" />
                  {LANE_LABEL[member.lane]}
                </Badge>
              )}
              {member.main_pokemon && (
                <Badge variant="outline" className="uppercase tracking-wider text-[10px] border-primary/40 text-primary">
                  <Star className="h-3 w-3 mr-1" />
                  Main: {member.main_pokemon}
                </Badge>
              )}
            </div>
          </div>

          {hasGames && (
            <div className="text-left sm:text-right">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Win rate</div>
              <div className="font-display text-4xl sm:text-5xl text-gold leading-none mt-1">{wr.rate}%</div>
              <div className="text-xs text-muted-foreground mt-1">{wr.wins}V · {wr.losses}D</div>
            </div>
          )}

          {headerAction && <div className="w-full sm:w-auto">{headerAction}</div>}
        </div>

        <div className="relative mt-6 pt-6 border-t border-border/60 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {email && <InfoItem icon={UserCircle} label="Email" value={email} />}
          <InfoItem icon={Gamepad2} label="ID do jogo" value={member.game_id || "—"} mono />
          <InfoItem icon={MessageSquare} label="Discord" value={member.discord || "—"} />
          <InfoItem icon={Hash} label="IGN" value={member.ign || "—"} />
        </div>

        {member.notes && (
          <div className="relative mt-4 pt-4 border-t border-border/60">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Notas pessoais</div>
            <p className="text-sm text-foreground/90 whitespace-pre-wrap">{member.notes}</p>
          </div>
        )}
      </Card>

      {/* SECTION HEADER */}
      <div>
        <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Desempenho</div>
        <h2 className="font-display text-2xl tracking-wider">
          ESTATÍSTICAS <span className="text-gold">DE JOGO</span>
        </h2>
      </div>

      {!hasGames ? (
        <Card className="p-10 text-center border-dashed">
          <BarChart3 className="mx-auto h-8 w-8 text-muted-foreground opacity-50" />
          <div className="mt-3 text-sm text-muted-foreground">
            Nenhuma partida registrada. As estatísticas aparecerão aqui assim que houver performances de scrims.
          </div>
        </Card>
      ) : (
        <>
          {/* MINI STATS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MiniStat icon={TrendingUp} label="Win rate" value={`${wr.rate}%`} hint={`${wr.wins}V · ${wr.losses}D`} accent="gold" />
            <MiniStat icon={BarChart3} label="KDA médio" value={agg.kda.toFixed(2)} hint={`${agg.k} K · ${agg.a} A`} accent="gold" />
            <MiniStat icon={Star} label="MVP rate" value={`${mvp.rate}%`} hint={`${agg.mvp} MVPs`} accent="gold" />
            <MiniStat icon={Zap} label="Score médio" value={agg.avgScore.toLocaleString()} hint={`Dano ${agg.dmg.toLocaleString()}`} accent="primary" />
            <MiniStat icon={Crosshair} label="Kills/jogo" value={agg.k} accent="gold" />
            <MiniStat icon={Trophy} label="Assists/jogo" value={agg.a} accent="primary" />
            <MiniStat icon={Activity} label="KA médio" value={(agg.k + agg.a).toFixed(1)} accent="primary" />
            <MiniStat icon={Swords} label="Jogos" value={agg.games} accent="primary" />
          </div>

          {/* CHARTS */}
          <section className="grid lg:grid-cols-2 gap-5">
            <Card className="p-5 border-border shadow-card">
              <h3 className="font-display text-lg tracking-wider mb-4">EVOLUÇÃO DE KDA</h3>
              {timeline.length === 0 ? (
                <div className="text-sm text-muted-foreground py-10 text-center">Sem dados.</div>
              ) : (
                <Suspense fallback={<div className="h-64" />}>
                  <KdaChart data={timeline} />
                </Suspense>
              )}
            </Card>

            <Card className="p-5 border-border shadow-card">
              <h3 className="font-display text-lg tracking-wider mb-4">SCORE & DANO POR PARTIDA</h3>
              {perfTimeline.length === 0 ? (
                <div className="text-sm text-muted-foreground py-10 text-center">Sem dados.</div>
              ) : (
                <Suspense fallback={<div className="h-64" />}>
                  <PerformanceTimelineChart data={perfTimeline} />
                </Suspense>
              )}
            </Card>
          </section>

          <section className="grid lg:grid-cols-2 gap-5">
            <Card className="p-5 border-border shadow-card">
              <h3 className="font-display text-lg tracking-wider mb-1">WIN RATE POR PAPEL</h3>
              <p className="text-xs text-muted-foreground mb-4">Performance agrupada pelo papel Unite do pokémon jogado.</p>
              <Suspense fallback={<div className="h-32" />}>
                <LaneWinrateChart data={byRole} />
              </Suspense>
            </Card>

            <Card className="p-5 border-border shadow-card">
              <h3 className="font-display text-lg tracking-wider mb-4">POKÉMON MAIS UTILIZADOS</h3>
              {top.length === 0 ? (
                <div className="text-sm text-muted-foreground py-10 text-center">Sem dados.</div>
              ) : (
                <div className="space-y-2">
                  {top.map((t, i) => (
                    <div key={t.pokemon} className="flex items-center gap-3 p-2 border border-border rounded-md hover:bg-muted/30 transition-colors">
                      <div className="text-xs text-muted-foreground font-display w-5 text-center tabular-nums">{i + 1}</div>
                      <div className="h-10 w-10 shrink-0"><PokemonImage name={t.pokemon} withRoleBg /></div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{t.pokemon}</div>
                        <div className="text-xs text-muted-foreground">
                          {t.count} {t.count === 1 ? "jogo" : "jogos"} · {t.wins}V {t.losses}D
                        </div>
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

          {/* RECENT MATCHES */}
          <Card className="p-5 border-border shadow-card">
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <h3 className="font-display text-lg tracking-wider">ÚLTIMAS PARTIDAS</h3>
              {recent.length > 0 && (
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  {recent.length} {recent.length === 1 ? "partida" : "partidas"}
                </span>
              )}
            </div>
            <div className="overflow-x-auto -mx-5 px-5">
              <div className="space-y-2 min-w-[680px]">
                {pagedRecent.map((r) => {
                  const isWin = r.gameResult === "win";
                  const isLoss = r.gameResult === "loss";
                  const accent = isWin
                    ? "border-l-emerald-500"
                    : isLoss
                      ? "border-l-rose-500"
                      : "border-l-muted-foreground/30";
                  const dateObj = new Date(r.date);
                  const dateLabel = dateObj.toLocaleDateString("pt-BR", { month: "short", day: "2-digit" });
                  const timeLabel = dateObj.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
                  const scoreColor = r.isMvp
                    ? "text-purple-400"
                    : isWin
                      ? "text-foreground"
                      : "text-foreground/80";
                  return (
                    <button
                      type="button"
                      key={r.id}
                      onClick={() => {
                        const s = scrimsById.get(r.scrim_id);
                        if (s) setOpenScrim(s);
                      }}
                      className={`w-full text-left relative flex items-center gap-4 sm:gap-5 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 transition-colors px-3 sm:px-4 py-3 border-l-4 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40 ${accent}`}
                    >
                      <div className="shrink-0 min-w-[100px]">
                        <div className="text-[11px] font-medium text-foreground tabular-nums capitalize">{dateLabel}</div>
                        <div className="text-[11px] text-muted-foreground tabular-nums">{timeLabel}</div>
                        <div className="text-[10px] text-muted-foreground truncate mt-0.5 max-w-[110px]">{r.opponent}</div>
                        <div className="text-[9px] uppercase tracking-widest text-muted-foreground/70 mt-0.5">
                          Game {r.gameNumber}
                        </div>
                      </div>

                      <div className="shrink-0">
                        {r.pokemon ? (
                          <div className="relative h-12 w-12 rounded-md overflow-hidden ring-1 ring-border">
                            <PokemonImage name={r.pokemon} withRoleBg />
                            {r.isMvp && (
                              <div className="absolute bottom-0 right-0 bg-gold text-black text-[8px] font-bold px-1 leading-tight rounded-tl">
                                MVP
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="h-12 w-12 rounded-md bg-muted" />
                        )}
                      </div>

                      <div className="shrink-0 min-w-[80px] text-center">
                        <div className={`font-display text-xl sm:text-2xl tabular-nums leading-none ${scoreColor}`}>
                          {r.score.toLocaleString()}
                        </div>
                        <div className="text-[9px] uppercase tracking-widest text-muted-foreground mt-1">Score</div>
                        <div
                          className={`text-[10px] font-bold tabular-nums mt-1 ${
                            isWin ? "text-emerald-400" : isLoss ? "text-rose-400" : "text-muted-foreground"
                          }`}
                        >
                          {isWin ? "VITÓRIA" : isLoss ? "DERROTA" : r.gameResult === "draw" ? "EMPATE" : "—"}
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <KdaCell label="KO" value={r.kills} />
                        <span className="text-muted-foreground/40 text-sm">/</span>
                        <KdaCell label="AST" value={r.assists} />
                      </div>

                      <div className="shrink-0 ml-auto flex items-center gap-4 sm:gap-5">
                        <StatCell label="DMG" value={r.damage} color="text-rose-400" />
                        {r.damageTaken > 0 && <StatCell label="TKN" value={r.damageTaken} color="text-purple-400" />}
                        {r.healing > 0 && <StatCell label="HEAL" value={r.healing} color="text-emerald-400" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            {recent.length > PAGE_SIZE && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                <span className="text-xs text-muted-foreground tabular-nums">
                  Página {currentPage + 1} de {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={currentPage === 0}>
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={currentPage >= totalPages - 1}
                  >
                    Próxima
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </>
      )}
      {openScrim && (
        <PerformanceDialog
          scrimId={openScrim.id}
          bestOf={openScrim.best_of ?? 1}
          opponentId={openScrim.opponent_id ?? null}
          opponentName={openScrim.opponent ?? ""}
          status={openScrim.status ?? "completed"}
          open={!!openScrim}
          onOpenChange={(v) => { if (!v) setOpenScrim(null); }}
        />
      )}
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: any;
  label: string;
  value: string | number;
  hint?: string;
  accent: "gold" | "primary";
}) {
  const color = accent === "gold" ? "text-gold" : "text-primary";
  return (
    <Card className="p-4 border-border shadow-card">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
          <div className={`font-display text-2xl mt-1 leading-none ${color}`}>{value}</div>
          {hint && <div className="text-[10px] text-muted-foreground mt-1.5">{hint}</div>}
        </div>
        <Icon className={`h-5 w-5 opacity-50 ${color}`} />
      </div>
    </Card>
  );
}

function InfoItem({ icon: Icon, label, value, mono }: { icon: any; label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className={`mt-1 text-sm text-foreground/90 truncate ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}

function KdaCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center min-w-[28px]">
      <div className="font-display text-base sm:text-lg leading-none tabular-nums">{value}</div>
      <div className="text-[9px] uppercase tracking-widest text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

function StatCell({ label, value, color }: { label: string; value: number; color: string }) {
  const formatted = value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k` : value.toString();
  return (
    <div className="text-center min-w-[40px]">
      <div className={`font-display text-base sm:text-lg leading-none tabular-nums ${color}`}>{formatted}</div>
      <div className="text-[9px] uppercase tracking-widest text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
