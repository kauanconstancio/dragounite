import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { KpiCard } from "@/components/dashboard/KpiCard";
import {
  Users,
  Building2,
  Swords,
  Dumbbell,
  MessageSquare,
  Bug,
  Lightbulb,
  Zap,
  TrendingUp,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/dev/")({
  component: DevOverview,
});

function DevOverview() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dev-stats-overview"],
    queryFn: async () => {
      const since30 = subDays(new Date(), 30).toISOString();

      const [teams, members, scrims, trainings, feedback, recentScrims] = await Promise.all([
        supabase.from("teams").select("id, archived, created_at"),
        supabase.from("members").select("id, archived, created_at"),
        supabase.from("scrims").select("id, status, result, created_at"),
        supabase.from("trainings").select("id, status, created_at"),
        supabase.from("feedback").select("id, type, status, created_at"),
        supabase.from("scrims").select("id, scheduled_at, result").gte("scheduled_at", since30),
      ]);

      return {
        teams: teams.data ?? [],
        members: members.data ?? [],
        scrims: scrims.data ?? [],
        trainings: trainings.data ?? [],
        feedback: feedback.data ?? [],
        recentScrims: recentScrims.data ?? [],
      };
    },
  });

  const { data: usersCount } = useQuery({
    queryKey: ["dev-users-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  if (isLoading || !stats) {
    return (
      <div className="py-20 text-center text-muted-foreground text-xs uppercase tracking-[0.3em]">
        Carregando métricas...
      </div>
    );
  }

  const activeTeams = stats.teams.filter((t: any) => !t.archived).length;
  const activeMembers = stats.members.filter((m: any) => !m.archived).length;
  const completedScrims = stats.scrims.filter((s: any) => s.status === "completed").length;
  const openFeedback = stats.feedback.filter((f: any) => f.status === "open").length;

  // Activity by day (last 14 days) — scrims + trainings + feedback
  const activityData = Array.from({ length: 14 }).map((_, i) => {
    const day = startOfDay(subDays(new Date(), 13 - i));
    const next = startOfDay(subDays(new Date(), 12 - i));
    const inRange = (d: string) => {
      const dt = new Date(d);
      return dt >= day && dt < next;
    };
    return {
      day: format(day, "dd/MM", { locale: ptBR }),
      scrims: stats.scrims.filter((s: any) => inRange(s.created_at)).length,
      treinos: stats.trainings.filter((t: any) => inRange(t.created_at)).length,
      feedback: stats.feedback.filter((f: any) => inRange(f.created_at)).length,
    };
  });

  // Feedback by type
  const fbByType = [
    { name: "Sugestões", value: stats.feedback.filter((f: any) => f.type === "suggestion").length, color: "hsl(var(--gold))" },
    { name: "Bugs", value: stats.feedback.filter((f: any) => f.type === "bug").length, color: "hsl(var(--destructive))" },
    { name: "Melhorias", value: stats.feedback.filter((f: any) => f.type === "improvement").length, color: "hsl(var(--primary))" },
  ];

  // Feedback by status
  const fbByStatus = [
    { status: "Aberto", count: stats.feedback.filter((f: any) => f.status === "open").length },
    { status: "Em análise", count: stats.feedback.filter((f: any) => f.status === "in_review").length },
    { status: "Resolvido", count: stats.feedback.filter((f: any) => f.status === "resolved").length },
    { status: "Fechado", count: stats.feedback.filter((f: any) => f.status === "closed").length },
  ];

  // Scrim winrate (last 30d)
  const completed30 = stats.recentScrims.filter((s: any) => s.result === "win" || s.result === "loss");
  const wins30 = stats.recentScrims.filter((s: any) => s.result === "win").length;
  const wr30 = completed30.length ? Math.round((wins30 / completed30.length) * 100) : 0;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Usuários" value={usersCount ?? 0} hint="Contas registradas" Icon={Users} accent="primary" />
        <KpiCard label="Equipes ativas" value={activeTeams} hint={`${stats.teams.length} totais`} Icon={Building2} accent="gold" />
        <KpiCard label="Membros ativos" value={activeMembers} hint={`${stats.members.length} cadastrados`} Icon={Users} accent="primary" />
        <KpiCard label="Scrims concluídas" value={completedScrims} hint={`WR 30d: ${wr30}%`} Icon={Swords} accent="emerald" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Treinos" value={stats.trainings.length} hint="Total registrado" Icon={Dumbbell} accent="primary" />
        <KpiCard label="Feedbacks" value={stats.feedback.length} hint={`${openFeedback} em aberto`} Icon={MessageSquare} accent="gold" />
        <KpiCard label="Bugs reportados" value={stats.feedback.filter((f: any) => f.type === "bug").length} hint="Total" Icon={Bug} accent="destructive" />
        <KpiCard label="Sugestões" value={stats.feedback.filter((f: any) => f.type === "suggestion").length} hint="Total" Icon={Lightbulb} accent="gold" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-5 lg:col-span-2 border-border shadow-card bg-card/70">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-gold" />
            <h2 className="font-display text-xl tracking-wider">Atividade · Últimos 14 dias</h2>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend />
                <Bar dataKey="scrims" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="treinos" fill="hsl(var(--gold))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="feedback" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 border-border shadow-card bg-card/70">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-4 w-4 text-primary" />
            <h2 className="font-display text-xl tracking-wider">Feedback por tipo</h2>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={fbByType} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={3}>
                  {fbByType.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-5 border-border shadow-card bg-card/70">
        <h2 className="font-display text-xl tracking-wider mb-4">Status dos feedbacks</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={fbByStatus} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis dataKey="status" type="category" stroke="hsl(var(--muted-foreground))" fontSize={11} width={100} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Bar dataKey="count" fill="hsl(var(--gold))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
