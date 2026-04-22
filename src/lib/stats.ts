import { isAfter, isSameMonth, subDays } from "date-fns";

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

export function lastNScrimsForChart(scrims: ScrimLite[], n = 10) {
  const finished = scrims
    .filter((s) => s.result === "win" || s.result === "loss")
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
    .slice(-n);
  let wins = 0;
  return finished.map((s, i) => {
    if (s.result === "win") wins++;
    const total = i + 1;
    return {
      label: `#${i + 1}`,
      opponent: s.opponent,
      winrate: Math.round((wins / total) * 100),
      result: s.result === "win" ? 1 : 0,
    };
  });
}

export function recentActivity(scrims: ScrimLite[], days = 30) {
  const cutoff = subDays(new Date(), days);
  return scrims.filter((s) => isAfter(new Date(s.scheduled_at), cutoff)).length;
}
