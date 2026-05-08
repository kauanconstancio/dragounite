import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentTeam } from "@/hooks/useCurrentTeam";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, LogOut } from "lucide-react";
import { toast } from "sonner";
import { AnnouncementsManager } from "@/components/admin/AnnouncementsManager";
import { TeamSettingsManager } from "@/components/admin/TeamSettingsManager";
import { RosterManager } from "@/components/admin/RosterManager";
import { DeleteTeamZone } from "@/components/admin/DeleteTeamZone";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Battle Arena" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { user, loading, signOut } = useAuth();
  const { isTeamCoach, loading: teamLoading, teams, team, setActiveTeam } = useCurrentTeam();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  // If the user is a coach in some team but the *active* team isn't one of them,
  // auto-switch to a team where they have coach access so /admin works seamlessly.
  const coachTeams = teams.filter((t) => t.team_role === "coach");
  useEffect(() => {
    if (teamLoading) return;
    if (isTeamCoach) return;
    if (coachTeams.length > 0 && team?.id !== coachTeams[0].team.id) {
      setActiveTeam(coachTeams[0].team.id);
    }
  }, [teamLoading, isTeamCoach, coachTeams, team, setActiveTeam]);

  async function handleLogout() {
    await signOut();
    toast.success("Sessão encerrada");
    navigate({ to: "/auth" });
  }

  if (loading || teamLoading) return null;
  if (!user) return null;
  if (!isTeamCoach) {
    if (coachTeams.length > 0) {
      return (
        <div className="max-w-xl mx-auto mt-20">
          <Card className="p-8 text-center">
            <ShieldCheck className="mx-auto h-10 w-10 text-primary" />
            <h1 className="font-display text-2xl mt-4">Trocando de equipe...</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Você tem acesso de admin em outra equipe. Ativando agora.
            </p>
          </Card>
        </div>
      );
    }
    return (
      <div className="max-w-xl mx-auto mt-20">
        <Card className="p-8 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="font-display text-2xl mt-4">Acesso restrito</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Apenas coaches podem acessar o painel administrativo. Peça ao gerente da equipe para alterar seu acesso na coluna “Acesso” do roster.
          </p>
          <Button asChild className="mt-6"><Link to="/dashboard">Voltar ao Dashboard</Link></Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Painel</div>
          <h1 className="font-display text-3xl tracking-wider">ADMINISTRAÇÃO</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie roster, configurações da equipe e comunicados.
          </p>
        </div>
        <Button variant="outline" onClick={handleLogout} className="gap-2">
          <LogOut className="h-4 w-4" /> Sair
        </Button>
      </header>

      <RosterManager />

      <TeamSettingsManager />

      <AnnouncementsManager />

      <DeleteTeamZone />
    </div>
  );
}
