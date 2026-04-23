export type PerfRow = {
  id: string;
  scrim_id: string;
  member_id: string;
  game_number: number;
  pokemon: string | null;
  kills: number;
  deaths: number;
  assists: number;
  score: number;
  damage_dealt: number;
  damage_taken: number;
  healing: number;
  is_mvp: boolean;
  notes: string | null;
  created_at: string;
  result?: "win" | "loss" | "draw" | "pending";
};

export function kdaRatio(k: number, d: number, a: number) {
  return d === 0 ? k + a : Number(((k + a) / d).toFixed(2));
}

export function aggregatePlayer(perfs: PerfRow[]) {
  if (!perfs.length) {
    return { games: 0, kda: 0, k: 0, d: 0, a: 0, avgScore: 0, mvp: 0, dmg: 0 };
  }
  const k = perfs.reduce((s, p) => s + p.kills, 0);
  const d = perfs.reduce((s, p) => s + p.deaths, 0);
  const a = perfs.reduce((s, p) => s + p.assists, 0);
  const avgScore = Math.round(perfs.reduce((s, p) => s + p.score, 0) / perfs.length);
  const mvp = perfs.filter((p) => p.is_mvp).length;
  const dmg = Math.round(perfs.reduce((s, p) => s + p.damage_dealt, 0) / perfs.length);
  return {
    games: perfs.length,
    kda: kdaRatio(k, d, a),
    k: Number((k / perfs.length).toFixed(1)),
    d: Number((d / perfs.length).toFixed(1)),
    a: Number((a / perfs.length).toFixed(1)),
    avgScore,
    mvp,
    dmg,
  };
}

export function topPokemon(perfs: PerfRow[], limit = 5) {
  const map = new Map<string, { count: number; k: number; d: number; a: number; w: number; l: number }>();
  for (const p of perfs) {
    if (!p.pokemon) continue;
    const cur = map.get(p.pokemon) ?? { count: 0, k: 0, d: 0, a: 0, w: 0, l: 0 };
    cur.count++;
    cur.k += p.kills;
    cur.d += p.deaths;
    cur.a += p.assists;
    if (p.result === "win") cur.w++;
    else if (p.result === "loss") cur.l++;
    map.set(p.pokemon, cur);
  }
  return [...map.entries()]
    .map(([pokemon, v]) => {
      const decided = v.w + v.l;
      const winrate = decided > 0 ? Math.round((v.w / decided) * 100) : null;
      return {
        pokemon,
        count: v.count,
        kda: kdaRatio(v.k, v.d, v.a),
        wins: v.w,
        losses: v.l,
        winrate,
      };
    })
    .sort((a, b) => {
      const aWr = a.winrate ?? -1;
      const bWr = b.winrate ?? -1;
      if (bWr !== aWr) return bWr - aWr;
      return b.count - a.count;
    })
    .slice(0, limit);
}

export function kdaTimeline(perfs: PerfRow[], scrimDateMap: Map<string, string>) {
  return [...perfs]
    .sort((a, b) => {
      const da = scrimDateMap.get(a.scrim_id) ?? a.created_at;
      const db = scrimDateMap.get(b.scrim_id) ?? b.created_at;
      return new Date(da).getTime() - new Date(db).getTime();
    })
    .map((p, i) => ({
      label: `#${i + 1}`,
      kda: p.kills,
      score: p.score,
    }));
}

/**
 * Win rate por jogo individual (cada partida de scrim conta separado).
 * Usa o campo `result` de match_performances.
 */
export function playerWinRate(perfs: PerfRow[]) {
  let w = 0;
  let l = 0;
  for (const p of perfs) {
    if (p.result === "win") w++;
    else if (p.result === "loss") l++;
  }
  const total = w + l;
  return { rate: total ? Math.round((w / total) * 100) : 0, wins: w, losses: l };
}
