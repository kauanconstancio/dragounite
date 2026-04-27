import { createFileRoute, Link } from "@tanstack/react-router";
import { useStaff } from "@/hooks/useStaff";
import { Card } from "@/components/ui/card";
import { ShieldAlert, Wrench, Database, Activity, Flag } from "lucide-react";

export const Route = createFileRoute("/staff/dev")({
  component: DevSystemPage,
});

function DevSystemPage() {
  const { isOwner, hasStaffRole, loading } = useStaff();
  const allowed = isOwner || hasStaffRole("developer");

  if (loading) return null;
  if (!allowed) {
    return (
      <Card className="p-10 text-center border-destructive/40">
        <ShieldAlert className="h-8 w-8 mx-auto text-destructive mb-3" />
        <p className="text-sm text-muted-foreground">Acesso restrito à equipe de engenharia.</p>
      </Card>
    );
  }

  const items = [
    {
      title: "Logs do sistema",
      desc: "Stream de auth, database e edge functions. Filtros por nível e timestamp.",
      icon: Database,
      status: "Em breve",
    },
    {
      title: "Health & latência",
      desc: "Status do backend, latência média de queries, taxa de erro 5xx.",
      icon: Activity,
      status: "Em breve",
    },
    {
      title: "Feature flags",
      desc: "Toggles de features com rollout por equipe e percentual.",
      icon: Flag,
      status: "Em breve",
    },
  ];

  return (
    <div className="space-y-6">
      <header>
        <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Engenharia</div>
        <h1 className="font-display text-3xl tracking-wider">SISTEMA</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ferramentas internas de observabilidade e operação.
        </p>
      </header>

      <div className="grid md:grid-cols-3 gap-4">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <Card key={it.title} className="p-5 border-dashed border-border/60 bg-card/40">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-4 w-4 text-primary" />
                <h3 className="font-display tracking-wider">{it.title}</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-3">{it.desc}</p>
              <span className="text-[10px] uppercase tracking-widest text-gold">{it.status}</span>
            </Card>
          );
        })}
      </div>

      <Card className="p-5 bg-card/40">
        <div className="flex items-center gap-2 mb-2">
          <Wrench className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-display tracking-wider">Atalhos atuais</h3>
        </div>
        <ul className="text-sm space-y-1.5">
          <li>
            <Link to="/staff/teams" className="text-primary underline">Gestão de equipes</Link>
            <span className="text-muted-foreground"> — criar, arquivar e vincular usuários.</span>
          </li>
          <li>
            <Link to="/staff/audit" className="text-primary underline">Audit log</Link>
            <span className="text-muted-foreground"> — todas as ações de funcionários.</span>
          </li>
        </ul>
      </Card>
    </div>
  );
}
