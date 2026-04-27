import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { isDevOwner } from "@/lib/dev-access";
import { Card } from "@/components/ui/card";
import { ShieldAlert, Crown, BarChart3, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/dev")({
  head: () => ({
    meta: [
      { title: "Owner Console — Battle Arena" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: DevLayout,
});

function DevLayout() {
  const { user, isSuperAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="py-20 text-center text-muted-foreground text-xs uppercase tracking-[0.3em]">
        Verificando credenciais...
      </div>
    );
  }

  if (!isDevOwner(user?.email, isSuperAdmin)) {
    return (
      <Card className="p-10 max-w-lg mx-auto text-center border-destructive/40">
        <ShieldAlert className="h-10 w-10 mx-auto text-destructive mb-3" />
        <h1 className="font-display text-2xl tracking-wider uppercase">Acesso restrito</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta área é exclusiva dos criadores do sistema.
        </p>
      </Card>
    );
  }

  const tabs = [
    { to: "/dev", label: "Visão Geral", icon: BarChart3, exact: true },
    { to: "/dev/feedback", label: "Feedbacks", icon: MessageSquare },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-gold mb-3">
            <Crown className="h-3 w-3" /> Owner Console
          </div>
          <h1 className="font-display text-4xl sm:text-5xl tracking-wider">
            CONTROL <span className="text-gold">CENTER</span>
          </h1>
          <p className="mt-2 text-muted-foreground uppercase tracking-widest text-xs">
            Gestão estratégica · Métricas · Feedback dos usuários
          </p>
        </div>
      </div>

      <nav className="flex gap-2 border-b border-border">
        {tabs.map((t) => {
          const active = t.exact
            ? location.pathname === t.to
            : location.pathname.startsWith(t.to);
          const Icon = t.icon;
          return (
            <Link
              key={t.to}
              to={t.to}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs uppercase tracking-wider border-b-2 transition-colors ${
                active
                  ? "border-gold text-gold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" /> {t.label}
            </Link>
          );
        })}
      </nav>

      <Outlet />
    </div>
  );
}
