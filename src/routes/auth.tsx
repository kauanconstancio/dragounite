import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import dragouniteLogo from "@/assets/dragounite-logo.png";
import { useTeamSettings } from "@/hooks/useTeamSettings";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Acesso — Battle Arena" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { data: team } = useTeamSettings();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/equipes" });
    });
  }, [navigate]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    // Limpa equipe ativa anterior para forçar nova escolha após o login.
    try { localStorage.removeItem("active-team-id"); } catch {}
    toast.success("Bem-vindo de volta! Escolha sua equipe para continuar.");
    navigate({ to: "/equipes" });
  }

  const teamName = team?.team_name ?? "DragoUnite Y";
  const teamLogo = team?.logo_url ?? dragouniteLogo;
  const [teamHead, ...teamRest] = teamName.split(" ");
  const teamTail = teamRest.join(" ");

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <Card className="w-full max-w-md p-8 border-border shadow-card">
        <div className="flex flex-col items-center gap-3 mb-6 text-center">
          <img
            src={teamLogo}
            alt={teamName}
            className="h-24 w-24 object-contain drop-shadow-[0_0_16px_hsl(var(--primary)/0.5)]"
          />
          <div>
            <div className="font-display text-3xl tracking-wider uppercase">
              {teamHead}
              {teamTail && <> <span className="text-primary">{teamTail}</span></>}
            </div>
            {team?.description ? (
              <div className="text-xs text-muted-foreground mt-2 max-w-xs">{team.description}</div>
            ) : (
              <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mt-1">
                Pokémon Unite · Team OPS Access
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 mt-4">
          <div>
            <Label htmlFor="li-email">Email</Label>
            <Input id="li-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="li-pass">Senha</Label>
            <Input id="li-pass" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-gradient-primary shadow-glow uppercase tracking-wider">
            {loading ? "Entrando..." : "Entrar"}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            As contas são criadas pelos gerentes. Solicite acesso ao seu coach.
          </p>
        </form>
      </Card>
    </div>
  );
}
