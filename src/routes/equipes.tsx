import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentTeam } from "@/hooks/useCurrentTeam";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Plus, Crown, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/equipes")({
  head: () => ({ meta: [{ title: "Minhas equipes — Battle Arena" }] }),
  component: EquipesPage,
});

function EquipesPage() {
  const { user, loading: authLoading, isSuperAdmin } = useAuth();
  const { teams, team, loading, setActiveTeam } = useCurrentTeam();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [authLoading, user, navigate]);

  // Auto-seleciona quando o usuário tem apenas uma equipe disponível
  // (caso típico após o login com membership única).
  useEffect(() => {
    if (loading || !user) return;
    if (teams.length === 1 && !team) {
      const only = teams[0].team;
      if (!only.archived) {
        setActiveTeam(only.id);
        navigate({ to: "/" });
      }
    }
  }, [loading, user, teams, team, setActiveTeam, navigate]);

  if (authLoading || loading) {
    return (
      <div className="text-center text-muted-foreground text-xs uppercase tracking-[0.3em] py-20">
        Carregando equipes...
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Organização
          </div>
          <h1 className="font-display text-4xl tracking-wider">
            MINHAS <span className="text-gold">EQUIPES</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Selecione a equipe que deseja gerenciar agora.
          </p>
        </div>
        {isSuperAdmin && (
          <Button asChild className="bg-gradient-primary shadow-glow uppercase tracking-wider text-xs">
            <Link to="/admin-org">
              <Plus className="h-4 w-4 mr-2" /> Nova equipe
            </Link>
          </Button>
        )}
      </header>

      {teams.length === 0 ? (
        <Card className="p-10 text-center border-border">
          <Users className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="font-display text-2xl mt-4 tracking-wider">Sem equipes</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Você ainda não foi adicionado a nenhuma equipe. Peça ao seu coach ou
            ao administrador da organização para incluir você.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map(({ team: t, team_role }) => {
            const active = t.id === team?.id;
            return (
              <Card
                key={t.id}
                className={`p-5 border-border bg-card/70 hover:border-primary/50 transition-all flex flex-col gap-4 ${
                  active ? "ring-1 ring-primary shadow-glow" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  {t.logo_url ? (
                    <img
                      src={t.logo_url}
                      alt={t.name}
                      className="h-12 w-12 object-contain rounded-md border border-border bg-background/40 p-1"
                    />
                  ) : (
                    <div
                      className="h-12 w-12 rounded-md flex items-center justify-center font-display text-lg text-white"
                      style={{ background: t.primary_color }}
                    >
                      {t.name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-display text-lg tracking-wider truncate">
                      {t.name}
                    </div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                      {team_role === "coach" && <Crown className="h-3 w-3 text-gold" />}
                      {team_role}
                      {t.archived && <span className="text-destructive">· arquivada</span>}
                    </div>
                  </div>
                </div>
                {t.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {t.description}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-auto">
                  <Button
                    size="sm"
                    onClick={() => {
                      setActiveTeam(t.id);
                      navigate({ to: "/" });
                    }}
                    disabled={t.archived}
                    className={active ? "bg-primary/80" : "bg-gradient-primary"}
                  >
                    {active ? "Continuar" : "Entrar"}
                  </Button>
                  {team_role === "coach" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setActiveTeam(t.id);
                        navigate({ to: "/admin" });
                      }}
                    >
                      <ShieldCheck className="h-3.5 w-3.5 mr-1.5" /> Admin
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
