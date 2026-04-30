// Lightweight recurrence helper for trainings & scrims.
// Generates a list of occurrence Dates from a base date + a simple rule.

export type RecurrenceFreq = "none" | "daily" | "weekly" | "biweekly" | "monthly";

export type RecurrenceRule = {
  freq: Exclude<RecurrenceFreq, "none">;
  /** For weekly/biweekly: 0=Sun..6=Sat. If empty, use the base date's weekday. */
  byWeekday?: number[];
  /** Total number of occurrences (including the first). Required if `until` not set. */
  count?: number;
  /** Inclusive end date (ISO). Optional. */
  until?: string;
};

const MAX_OCCURRENCES = 60;

export function expandRecurrence(baseISO: string, rule: RecurrenceRule | null | undefined): Date[] {
  const base = new Date(baseISO);
  if (!rule) return [base];

  const untilDate = rule.until ? new Date(rule.until) : null;
  const cap = Math.min(rule.count ?? MAX_OCCURRENCES, MAX_OCCURRENCES);
  const out: Date[] = [];

  if (rule.freq === "daily") {
    for (let i = 0; i < cap; i++) {
      const d = addDays(base, i);
      if (untilDate && d > untilDate) break;
      out.push(d);
    }
    return out;
  }

  if (rule.freq === "monthly") {
    for (let i = 0; i < cap; i++) {
      const d = new Date(base);
      d.setMonth(d.getMonth() + i);
      if (untilDate && d > untilDate) break;
      out.push(d);
    }
    return out;
  }

  // weekly / biweekly
  const stepWeeks = rule.freq === "biweekly" ? 2 : 1;
  const days = rule.byWeekday && rule.byWeekday.length > 0
    ? [...new Set(rule.byWeekday)].sort((a, b) => a - b)
    : [base.getDay()];

  // Anchor: start of base's week (Sunday)
  const weekStart = addDays(base, -base.getDay());
  let weekIndex = 0;
  while (out.length < cap) {
    for (const dow of days) {
      const d = addDays(weekStart, weekIndex * 7 + dow);
      // copy time from base
      d.setHours(base.getHours(), base.getMinutes(), 0, 0);
      if (d < base) continue; // skip dates before the base date
      if (untilDate && d > untilDate) return out;
      out.push(d);
      if (out.length >= cap) return out;
    }
    weekIndex += stepWeeks;
    if (weekIndex > 520) break; // safety: 10 years
  }
  return out;
}

function addDays(d: Date, days: number) {
  const n = new Date(d);
  n.setDate(n.getDate() + days);
  return n;
}

export const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function describeRule(rule: RecurrenceRule | null | undefined): string {
  if (!rule) return "Não se repete";
  const freqLabel: Record<RecurrenceRule["freq"], string> = {
    daily: "Diariamente",
    weekly: "Semanalmente",
    biweekly: "A cada 2 semanas",
    monthly: "Mensalmente",
  };
  let s = freqLabel[rule.freq];
  if ((rule.freq === "weekly" || rule.freq === "biweekly") && rule.byWeekday?.length) {
    s += ` (${rule.byWeekday.map((d) => WEEKDAY_LABELS[d]).join(", ")})`;
  }
  if (rule.count) s += ` · ${rule.count}x`;
  if (rule.until) s += ` · até ${new Date(rule.until).toLocaleDateString("pt-BR")}`;
  return s;
}
