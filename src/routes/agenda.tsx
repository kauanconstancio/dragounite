import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  Swords,
  Clock,
  Target,
  ChevronLeft,
  ChevronRight,
  Trophy,
  Dumbbell,
} from "lucide-react";
import {
  format,
  isPast,
  isSameDay,
  isSameMonth,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isToday,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda — Battle Arena" },
      {
        name: "description",
        content:
          "Calendário unificado de treinos e amistosos do time Pokémon Unite.",
      },
      { property: "og:title", content: "Agenda — Battle Arena" },
      {
        property: "og:description",
        content: "Visualize treinos e scrims agendados em um único calendário.",
      },
    ],
  }),
  component: AgendaPage,
});

type Training = {
  id: string;
  title: string;
  scheduled_at: string;
  duration_min: number;
  focus: string | null;
  status: "scheduled" | "completed" | "cancelled";
};

type Scrim = {
  id: string;
  opponent: string;
  scheduled_at: string;
  best_of: number;
  result: "pending" | "win" | "loss" | "draw";
  score_us: number;
  score_them: number;
  status: "scheduled" | "completed" | "cancelled";
};

type AgendaEvent = {
  id: string;
  kind: "training" | "scrim";
  title: string;
  date: Date;
  meta: string;
  badge?: string;
  badgeClass?: string;
  href: string;
};

const RESULT_STYLES: Record<string, string> = {
  win: "bg-gold/20 text-gold border-gold/40",
  loss: "bg-destructive/20 text-destructive border-destructive/40",
  draw: "bg-muted text-muted-foreground border-border",
  pending: "bg-primary/20 text-primary border-primary/40",
};
const RESULT_LABEL: Record<string, string> = {
  win: "Vitória",
  loss: "Derrota",
  draw: "Empate",
  pending: "Pendente",
};

function AgendaPage() {
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState<Date | null>(new Date());

  const { data: trainings = [] } = useQuery({
    queryKey: ["trainings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trainings")
        .select("*")
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return data as Training[];
    },
  });

  const { data: scrims = [] } = useQuery({
    queryKey: ["scrims"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scrims")
        .select("*")
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return data as Scrim[];
    },
  });

  const events: AgendaEvent[] = useMemo(() => {
    const t: AgendaEvent[] = trainings.map((tr) => ({
      id: `t-${tr.id}`,
      kind: "training",
      title: tr.title,
      date: new Date(tr.scheduled_at),
      meta: `${tr.duration_min}min${tr.focus ? ` · ${tr.focus}` : ""}`,
      href: "/treinos",
    }));
    const s: AgendaEvent[] = scrims.map((sc) => ({
      id: `s-${sc.id}`,
      kind: "scrim",
      title: `vs ${sc.opponent}`,
      date: new Date(sc.scheduled_at),
      meta: `BO${sc.best_of}${
        sc.result !== "pending" ? ` · ${sc.score_us}-${sc.score_them}` : ""
      }`,
      badge: RESULT_LABEL[sc.result],
      badgeClass: RESULT_STYLES[sc.result],
      href: "/amistosos",
    }));
    return [...t, ...s].sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [trainings, scrims]);

  // Build month grid (weeks)
  const grid = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
    const days: Date[] = [];
    let d = start;
    while (d <= end) {
      days.push(d);
      d = addDays(d, 1);
    }
    return days;
  }, [cursor]);

  const selectedEvents = useMemo(
    () => (selected ? events.filter((e) => isSameDay(e.date, selected)) : []),
    [events, selected],
  );

  const upcoming = useMemo(
    () =>
      events
        .filter((e) => !isPast(e.date))
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .slice(0, 6),
    [events],
  );

  const stats = useMemo(() => {
    const monthEvents = events.filter((e) => isSameMonth(e.date, cursor));
    return {
      training: monthEvents.filter((e) => e.kind === "training").length,
      scrim: monthEvents.filter((e) => e.kind === "scrim").length,
      total: monthEvents.length,
    };
  }, [events, cursor]);

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-5xl tracking-wider">
            AGENDA <span className="text-gold">DO TIME</span>
          </h1>
          <p className="mt-2 text-muted-foreground uppercase tracking-widest text-xs">
            Treinos e amistosos em um só lugar
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" className="uppercase tracking-wider">
            <Link to="/treinos">
              <Dumbbell className="mr-2 h-4 w-4" /> Gerenciar treinos
            </Link>
          </Button>
          <Button asChild variant="outline" className="uppercase tracking-wider">
            <Link to="/amistosos">
              <Swords className="mr-2 h-4 w-4" /> Gerenciar scrims
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="Treinos no mês"
          value={stats.training}
          Icon={Dumbbell}
          accent="primary"
        />
        <StatCard
          label="Scrims no mês"
          value={stats.scrim}
          Icon={Swords}
          accent="gold"
        />
        <StatCard
          label="Eventos no mês"
          value={stats.total}
          Icon={CalendarDays}
          accent="primary"
        />
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        {/* Calendar */}
        <Card className="p-5 border-border shadow-card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-2xl tracking-wider capitalize">
              {format(cursor, "MMMM yyyy", { locale: ptBR })}
            </h2>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setCursor((c) => subMonths(c, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCursor(new Date());
                  setSelected(new Date());
                }}
                className="uppercase tracking-wider text-xs"
              >
                Hoje
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setCursor((c) => addMonths(c, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
              <div
                key={d}
                className="text-center text-[10px] uppercase tracking-widest text-muted-foreground py-2"
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {grid.map((day) => {
              const inMonth = isSameMonth(day, cursor);
              const dayEvents = events.filter((e) => isSameDay(e.date, day));
              const isSel = selected && isSameDay(day, selected);
              const today = isToday(day);
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => setSelected(day)}
                  className={cn(
                    "relative aspect-square rounded-md border text-left p-1.5 transition-all flex flex-col gap-1",
                    !inMonth && "opacity-30",
                    isSel
                      ? "border-primary bg-primary/10 shadow-glow"
                      : "border-border hover:border-primary/40 hover:bg-accent/30",
                    today && !isSel && "border-gold/60",
                  )}
                >
                  <span
                    className={cn(
                      "font-display text-sm leading-none",
                      today && "text-gold",
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  {dayEvents.length > 0 && (
                    <div className="flex flex-wrap gap-0.5 mt-auto">
                      {dayEvents.slice(0, 3).map((e) => (
                        <span
                          key={e.id}
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            e.kind === "training"
                              ? "bg-primary"
                              : "bg-gold",
                          )}
                        />
                      ))}
                      {dayEvents.length > 3 && (
                        <span className="text-[9px] text-muted-foreground leading-none">
                          +{dayEvents.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex items-center gap-4 text-[10px] uppercase tracking-widest text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary" /> Treino
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-gold" /> Scrim
            </span>
          </div>
        </Card>

        {/* Selected day + upcoming */}
        <div className="space-y-5">
          <Card className="p-5 border-border shadow-card">
            <div className="flex items-center gap-2 mb-4">
              <CalendarDays className="h-4 w-4 text-gold" />
              <h3 className="font-display text-lg tracking-wider capitalize">
                {selected
                  ? format(selected, "EEEE, dd 'de' MMMM", { locale: ptBR })
                  : "Selecione um dia"}
              </h3>
            </div>
            {selectedEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nenhum evento neste dia.
              </p>
            ) : (
              <div className="space-y-2">
                {selectedEvents.map((e) => (
                  <EventRow key={e.id} event={e} />
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5 border-border shadow-card">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-4 w-4 text-primary" />
              <h3 className="font-display text-lg tracking-wider">
                Próximos eventos
              </h3>
            </div>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nada agendado.
              </p>
            ) : (
              <div className="space-y-2">
                {upcoming.map((e, i) => (
                  <motion.div
                    key={e.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <EventRow event={e} showDate />
                  </motion.div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  Icon,
  accent,
}: {
  label: string;
  value: number | string;
  Icon: typeof Trophy;
  accent: "gold" | "primary";
}) {
  return (
    <Card className="p-5 border-border shadow-card">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            {label}
          </div>
          <div
            className={cn(
              "font-display text-4xl mt-1",
              accent === "gold" ? "text-gold" : "text-primary",
            )}
          >
            {value}
          </div>
        </div>
        <Icon
          className={cn(
            "h-8 w-8 opacity-50",
            accent === "gold" ? "text-gold" : "text-primary",
          )}
        />
      </div>
    </Card>
  );
}

function EventRow({
  event,
  showDate,
}: {
  event: AgendaEvent;
  showDate?: boolean;
}) {
  const isTraining = event.kind === "training";
  const Icon = isTraining ? Dumbbell : Swords;
  return (
    <Link
      to={event.href}
      className="flex items-start gap-3 rounded-md border border-border bg-card/40 p-3 hover:border-primary/40 hover:bg-accent/20 transition-all group"
    >
      <div
        className={cn(
          "shrink-0 h-9 w-9 rounded-md flex items-center justify-center border",
          isTraining
            ? "bg-primary/15 border-primary/40 text-primary"
            : "bg-gold/15 border-gold/40 text-gold",
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-display text-sm tracking-wider truncate">
            {event.title}
          </span>
          {event.badge && (
            <Badge
              variant="outline"
              className={cn(
                "text-[9px] uppercase tracking-wider",
                event.badgeClass,
              )}
            >
              {event.badge}
            </Badge>
          )}
        </div>
        <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {showDate
              ? format(event.date, "dd MMM · HH:mm", { locale: ptBR })
              : format(event.date, "HH:mm")}
          </span>
          {event.meta && (
            <span className="flex items-center gap-1">
              <Target className="h-3 w-3" /> {event.meta}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
