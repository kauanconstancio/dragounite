import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStaff } from "@/hooks/useStaff";
import { Card } from "@/components/ui/card";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Megaphone, ShieldAlert, Users, ScrollText, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/staff/marketing")({
  component: MarketingPage,
});

function MarketingPage() {
  const { isOwner, hasStaffRole, loading } = useStaff();
  const allowed = isOwner || hasStaffRole("marketing");

  const { data } = useQuery({
    queryKey: ["staff-marketing-funnel"],
    queryFn: async () => {
      const [waitlist, users, teams] = await Promise.all([
        supabase.from("waitlist").select("source"),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("teams").select("id", { count: "exact", head: true }),
      ]);
      const sources: Record<string, number> = {};
      (waitlist.data ?? []).forEach((w) => {
        sources[w.source] = (sources[w.source] ?? 0) + 1;
      });
      return {
        waitlistTotal: waitlist.data?.length ?? 0,
        users: users.count ?? 0,
        teams: teams.count ?? 0,
        sources,
      };
    },
    enabled: allowed,
  });

  if (loading) return null;
  if (!allowed) {
    return (
      <Card className="p-10 text-center border-destructive/40">
        <ShieldAlert className="h-8 w-8 mx-auto text-destructive mb-3" />
        <p className="text-sm text-muted-foreground">Acesso restrito ao time de marketing.</p>
      </Card>
    );
  }

  const conv = data && data.waitlistTotal > 0
    ? Math.round((data.users / data.waitlistTotal) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <header>
        <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Marketing</div>
        <h1 className="font-display text-3xl tracking-wider">FUNIL DE CONVERSÃO</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Acompanhe a jornada do visitante até o time ativo.
        </p>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Waitlist" value={data?.waitlistTotal ?? 0} hint="Topo do funil" Icon={ScrollText} accent="gold" />
        <KpiCard label="Cadastros" value={data?.users ?? 0} hint="Contas criadas" Icon={Users} accent="primary" />
        <KpiCard label="Times ativos" value={data?.teams ?? 0} hint="Adoção" Icon={Megaphone} accent="emerald" />
        <KpiCard label="Conv. waitlist→user" value={`${conv}%`} hint="Estimativa" Icon={TrendingUp} accent="gold" />
      </div>

      <Card className="p-5">
        <h2 className="font-display text-lg tracking-wider mb-3">Origem da waitlist</h2>
        {Object.keys(data?.sources ?? {}).length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma inscrição ainda.</p>
        ) : (
          <ul className="space-y-2">
            {Object.entries(data?.sources ?? {}).map(([src, count]) => (
              <li key={src} className="flex items-center justify-between text-sm">
                <span className="font-mono text-xs">{src}</span>
                <span className="font-display tracking-wider">{count}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-6 border-dashed border-border/60 bg-card/40">
        <h2 className="font-display text-xl tracking-wider mb-2">Em breve</h2>
        <p className="text-sm text-muted-foreground">
          Integração com analytics da landing page (visitas, sources de tráfego, taxa de bounce),
          campanhas e attribution. Por enquanto, use os dados acima como baseline.
        </p>
      </Card>
    </div>
  );
}
