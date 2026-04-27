import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useStaff, type StaffRole } from "@/hooks/useStaff";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShieldAlert,
  Crown,
  BarChart3,
  MessageSquare,
  Users,
  Building2,
  DollarSign,
  Megaphone,
  Wrench,
  UserCog,
  ScrollText,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const Route = createFileRoute("/staff")({
  head: () => ({
    meta: [
      { title: "Staff Console — GymLy" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: StaffLayout,
});

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  requires?: StaffRole; // owner always passes
};

type NavGroup = { label: string; items: NavItem[] };

const groups: NavGroup[] = [
  {
    label: "Geral",
    items: [
      { to: "/staff", label: "Visão Geral", icon: BarChart3, exact: true },
      { to: "/dev/feedback", label: "Feedbacks", icon: MessageSquare },
    ],
  },
  {
    label: "Suporte",
    items: [
      { to: "/staff/users", label: "Usuários", icon: Users, requires: "support" },
      { to: "/staff/teams", label: "Organizações", icon: Building2, requires: "support" },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { to: "/staff/finance", label: "Receita", icon: DollarSign, requires: "finance" },
      { to: "/staff/finance/waitlist", label: "Waitlist", icon: ScrollText, requires: "finance" },
    ],
  },
  {
    label: "Marketing",
    items: [
      { to: "/staff/marketing", label: "Funil", icon: Megaphone, requires: "marketing" },
    ],
  },
  {
    label: "Engenharia",
    items: [
      { to: "/staff/dev", label: "Sistema", icon: Wrench, requires: "developer" },
    ],
  },
  {
    label: "Administração",
    items: [
      { to: "/staff/staff", label: "Funcionários", icon: UserCog },
      { to: "/staff/audit", label: "Audit Log", icon: ScrollText },
    ],
  },
];

const ROLE_LABELS: Record<StaffRole, string> = {
  owner: "Proprietário",
  developer: "Engenharia",
  finance: "Financeiro",
  support: "Suporte",
  marketing: "Marketing",
};

function StaffLayout() {
  const { user, loading: authLoading } = useAuth();
  const { isStaff, isOwner, hasStaffRole, primaryRole, loading } = useStaff();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth", replace: true });
  }, [authLoading, user, navigate]);

  if (loading || authLoading) {
    return (
      <div className="py-20 text-center text-muted-foreground text-xs uppercase tracking-[0.3em]">
        Verificando credenciais...
      </div>
    );
  }

  if (!isStaff) {
    return (
      <Card className="p-10 max-w-lg mx-auto text-center border-destructive/40">
        <ShieldAlert className="h-10 w-10 mx-auto text-destructive mb-3" />
        <h1 className="font-display text-2xl tracking-wider uppercase">Acesso restrito</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta área é exclusiva para funcionários da GymLy. Se você acredita que deveria ter acesso,
          fale com o proprietário da conta.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid lg:grid-cols-[240px_1fr] gap-8">
      {/* Sidebar interna */}
      <aside className="lg:sticky lg:top-4 lg:self-start space-y-6 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto pr-2">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-gold mb-3">
            <Crown className="h-3 w-3" /> Staff Console
          </div>
          <h1 className="font-display text-2xl tracking-wider leading-tight">
            CONTROL <span className="text-gold">CENTER</span>
          </h1>
          {primaryRole && (
            <Badge variant="outline" className="mt-2 text-[10px] uppercase tracking-widest">
              {ROLE_LABELS[primaryRole]}
            </Badge>
          )}
        </div>

        <nav className="space-y-5">
          {groups.map((g) => {
            const visibleItems = g.items.filter(
              (it) => !it.requires || isOwner || hasStaffRole(it.requires),
            );
            if (visibleItems.length === 0) return null;
            return (
              <div key={g.label}>
                <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2 px-2">
                  {g.label}
                </div>
                <ul className="space-y-0.5">
                  {visibleItems.map((it) => {
                    const active = it.exact
                      ? location.pathname === it.to
                      : location.pathname.startsWith(it.to);
                    const Icon = it.icon;
                    return (
                      <li key={it.to}>
                        <Link
                          to={it.to}
                          className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs uppercase tracking-wider transition-colors ${
                            active
                              ? "bg-gold/10 text-gold"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" /> {it.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>
      </aside>

      <main className="min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
