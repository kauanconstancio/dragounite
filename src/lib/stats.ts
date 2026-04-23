import { isAfter, isSameMonth, subDays } from "date-fns";

export type RadarPerfLite = {
  scrim_id: string;
  game_number: number;
  result: "pending" | "win" | "loss" | "draw";
  kills: number;
  deaths: number;
  assists: number;
  damage_dealt: number;
  is_mvp: boolean;
};

export type ScrimLite = {
  id: string;
  result: "pending" | "win" | "loss" | "draw";
  scheduled_at: string;
  score_us: number;
  score_them: number;
  opponent: string;
};

export type TrainingLite = {
  id: string;
  scheduled_at: string;
  status: "scheduled" | "completed" | "cancelled";
};

export function computeWinrate(scrims: ScrimLite[]) {
  const finished = scrims.filter((s) => s.result === "win" || s.result === "loss");
  if (!finished.length) return { rate: 0, wins: 0, losses: 0, total: 0 };
  const wins = finished.filter((s) => s.result === "win").length;
  return {
    rate: Math.round((wins / finished.length) * 100),
    wins,
    losses: finished.length - wins,
    total: finished.length,
  };
}

export type MatchPerfLite = {
  scrim_id: string;
  game_number: number;
  result: "pending" | "win" | "loss" | "draw";
};

export function computeMatchWinrate(perfs: MatchPerfLite[]) {
  const seen = new Map<string, "pending" | "win" | "loss" | "draw">();
  for (const p of perfs) {
    const key = `${p.scrim_id}:${p.game_number}`;
    if (!seen.has(key)) seen.set(key, p.result);
  }
  const games = [...seen.values()].filter((r) => r === "win" || r === "loss");
  if (!games.length) return { rate: 0, wins: 0, losses: 0, total: 0 };
  const wins = games.filter((r) => r === "win").length;
  return {
    rate: Math.round((wins / games.length) * 100),
    wins,
    losses: games.length - wins,
    total: games.length,
  };
}

export function computeStreak(scrims: ScrimLite[]) {
  const finished = scrims
    .filter((s) => s.result === "win" || s.result === "loss")
    .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());
  if (!finished.length) return { type: "none" as "none" | "win" | "loss", count: 0 };
  const type = finished[0].result;
  let count = 0;
  for (const s of finished) {
    if (s.result === type) count++;
    else break;
  }
  return { type: type as "win" | "loss", count };
}

export function eventsThisMonth(items: { scheduled_at: string }[], ref = new Date()) {
  return items.filter((i) => isSameMonth(new Date(i.scheduled_at), ref)).length;
}

export function nextEvent<T extends { scheduled_at: string }>(items: T[]): T | null {
  const now = new Date();
  return (
    items
      .filter((i) => isAfter(new Date(i.scheduled_at), now))
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0] ??
    null
  );
}

export function lastNScrimsForChart(
  scrims: ScrimLite[],
  perfs: MatchPerfLite[] = [],
  n = 10,
) {
  const finished = scrims
    .filter((s) => s.result === "win" || s.result === "loss")
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
    .slice(-n);

  // Deduplicate matches per scrim+game and keep their result + scrim time
  const seen = new Map<string, { result: "pending" | "win" | "loss" | "draw"; scrimId: string }>();
  for (const p of perfs) {
    const key = `${p.scrim_id}:${p.game_number}`;
    if (!seen.has(key)) seen.set(key, { result: p.result, scrimId: p.scrim_id });
  }
  const scrimDate = new Map(scrims.map((s) => [s.id, new Date(s.scheduled_at).getTime()]));
  const matchEntries = [...seen.values()]
    .map((m) => ({ result: m.result, t: scrimDate.get(m.scrimId) ?? 0 }))
    .sort((a, b) => a.t - b.t);

  return finished.map((s, i) => {
    const cutoff = new Date(s.scheduled_at).getTime();
    const matchesUpTo = matchEntries.filter((m) => m.t <= cutoff);
    const total = matchesUpTo.length;
    const wins = matchesUpTo.filter((m) => m.result === "win").length;
    return {
      label: `#${i + 1}`,
      opponent: s.opponent,
      wins,
      total,
    };
  });
}

export function recentActivity(scrims: ScrimLite[], days = 30) {
  const cutoff = subDays(new Date(), days);
  return scrims.filter((s) => isAfter(new Date(s.scheduled_at), cutoff)).length;
}

export type RadarAxis = { axis: string; value: number; raw: string };

export function computeTeamRadar(scrims: ScrimLite[], perfs: RadarPerfLite[]): RadarAxis[] {
  // 1. Winrate Scrims
  const wr = computeWinrate(scrims);

  // 2. Winrate Partidas (dedupe by scrim+game)
  const gameMap = new Map<string, RadarPerfLite>();
  for (const p of perfs) {
    const key = `${p.scrim_id}:${p.game_number}`;
    if (!gameMap.has(key)) gameMap.set(key, p);
  }
  const games = [...gameMap.values()];
  const decided = games.filter((g) => g.result === "win" || g.result === "loss");
  const matchWins = decided.filter((g) => g.result === "win").length;
  const matchWr = decided.length ? Math.round((matchWins / decided.length) * 100) : 0;

  // 3. KDA médio (across all perfs, all players)
  const totalK = perfs.reduce((s, p) => s + (p.kills ?? 0), 0);
  const totalD = perfs.reduce((s, p) => s + (p.deaths ?? 0), 0);
  const totalA = perfs.reduce((s, p) => s + (p.assists ?? 0), 0);
  const kda = totalD === 0 ? totalK + totalA : (totalK + totalA) / totalD;
  const kdaNorm = Math.min((kda / 5) * 100, 100);

  // 4. Dano médio por performance
  const avgDmg = perfs.length
    ? perfs.reduce((s, p) => s + (p.damage_dealt ?? 0), 0) / perfs.length
    : 0;
  const dmgNorm = Math.min((avgDmg / 100000) * 100, 100);

  // 5. MVP rate — % de games com pelo menos um MVP
  const gamesWithMvp = new Set<string>();
  const allGameKeys = new Set<string>();
  for (const p of perfs) {
    const key = `${p.scrim_id}:${p.game_number}`;
    allGameKeys.add(key);
    if (p.is_mvp) gamesWithMvp.add(key);
  }
  const mvpRate = allGameKeys.size
    ? (gamesWithMvp.size / allGameKeys.size) * 100
    : 0;

  // 6. Atividade — scrims finalizadas nos últimos 30d
  const cutoff = subDays(new Date(), 30);
  const recent = scrims.filter(
    (s) =>
      isAfter(new Date(s.scheduled_at), cutoff) &&
      (s.result === "win" || s.result === "loss"),
  ).length;
  const activityNorm = Math.min((recent / 10) * 100, 100);

  return [
    { axis: "WR Scrims", value: wr.rate, raw: `${wr.rate}% (${wr.wins}V·${wr.losses}D)` },
    { axis: "WR Partidas", value: matchWr, raw: `${matchWr}% (${matchWins}V·${decided.length - matchWins}D)` },
    { axis: "KDA", value: Math.round(kdaNorm), raw: kda.toFixed(2) },
    { axis: "Dano méd.", value: Math.round(dmgNorm), raw: Math.round(avgDmg).toLocaleString("pt-BR") },
    { axis: "MVP rate", value: Math.round(mvpRate), raw: `${Math.round(mvpRate)}% (${gamesWithMvp.size}/${allGameKeys.size})` },
    { axis: "Atividade", value: Math.round(activityNorm), raw: `${recent} em 30d` },
  ];
}
