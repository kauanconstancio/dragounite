import { createFileRoute, Link } from "@tanstack/react-router";
import { useStaff } from "@/hooks/useStaff";
import { Card } from "@/components/ui/card";
import { ShieldAlert, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/staff/users")({
  component: UsersRedirectCard,
});

function UsersRedirectCard() {
  const { isOwner, hasStaffRole, loading } = useStaff();
  const allowed = isOwner || hasStaffRole("support");

  if (loading) return null;
  if (!allowed) {
    return (
      <Card className="p-10 text-center border-destructive/40">
        <ShieldAlert className="h-8 w-8 mx-auto text-destructive mb-3" />
        <p className="text-sm text-muted-foreground">Acesso restrito ao time de suporte.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Suporte</div>
        <h1 className="font-display text-3xl tracking-wider">USUÁRIOS</h1>
      </header>

      <Card className="p-6">
        <p className="text-sm text-muted-foreground mb-4">
          A gestão de equipes e vínculos está disponível no Staff Console.
        </p>
        <Link
          to="/staff/teams"
          className="inline-flex items-center gap-2 text-sm text-primary underline"
        >
          Abrir gestão de equipes <ExternalLink className="h-3 w-3" />
        </Link>
      </Card>
    </div>
  );
}
