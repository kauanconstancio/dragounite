import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStaff } from "@/hooks/useStaff";
import { Card } from "@/components/ui/card";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { DollarSign, TrendingUp, Users, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/staff/finance/")({
  component: FinancePage,
});

function FinancePage() {
  const { isOwner, hasStaffRole, loading } = useStaff();
  const allowed = isOwner || hasStaffRole("finance");

  const { data: counts } = useQuery({
    queryKey: ["staff-finance-counts"],
    queryFn: async () => {
      const [teams, users, waitlist] = await Promise.all([
        supabase.from("teams").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("waitlist").select("id", { count: "exact", head: true }),
      ]);
      return {
        teams: teams.count ?? 0,
        users: users.count ?? 0,
        waitlist: waitlist.count ?? 0,
      };
    },
    enabled: allowed,
  });

  if (loading) return null;
  if (!allowed) {
    return (
      <Card className="p-10 text-center border-destructive/40">
        <ShieldAlert className="h-8 w-8 mx-auto text-destructive mb-3" />
        <p className="text-sm text-muted-foreground">Acesso restrito ao time financeiro.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Financeiro</div>
        <h1 className="font-display text-3xl tracking-wider">RECEITA</h1>
        <p className="text-sm text-muted-foreground mt-1">
          MRR, churn e LTV ficarão disponíveis após a integração de pagamentos.
        </p>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="MRR" value="R$ 0" hint="Aguardando billing" Icon={DollarSign} accent="emerald" />
        <KpiCard label="Clientes pagantes" value={0} hint="Aguardando billing" Icon={Users} accent="primary" />
        <KpiCard label="Equipes" value={counts?.teams ?? 0} hint="Total cadastrado" Icon={Users} accent="primary" />
        <KpiCard label="Waitlist" value={counts?.waitlist ?? 0} hint="Pipeline potencial" Icon={TrendingUp} accent="gold" />
      </div>

      <Card className="p-6 border-dashed border-border/60 bg-card/40">
        <h2 className="font-display text-xl tracking-wider mb-2">Próximo passo: integrar Stripe</h2>
        <p className="text-sm text-muted-foreground">
          Para visualizar MRR real, planos, faturas, churn e LTV, ative os pagamentos via Stripe.
          Depois esta página vai exibir gráficos de receita mensal, top clientes por receita, taxa de
          churn e lista de faturas em aberto.
        </p>
      </Card>
    </div>
  );
}
