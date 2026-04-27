import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Mail } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/aceitar-convite")({
  head: () => ({ meta: [{ title: "Aceitar convite — Battle Arena" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    token: (search.token as string) ?? "",
  }),
  component: AcceptInvitePage,
});

type InvitePreview = {
  team_id: string;
  team_role: string;
  email: string | null;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  team_name?: string;
};

function AcceptInvitePage() {
  const { token } = Route.useSearch();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [invite, setInvite] = useState<InvitePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) { setError("Token ausente"); return; }
    (async () => {
      const { data, error: e } = await supabase
        .from("team_invites")
        .select("team_id, team_role, email, expires_at, accepted_at, revoked_at, teams(name)")
        .eq("token", token)
        .maybeSingle();
      if (e || !data) { setError("Convite não encontrado"); return; }
      setInvite({
        team_id: data.team_id,
        team_role: data.team_role,
        email: data.email,
        expires_at: data.expires_at,
        accepted_at: data.accepted_at,
        revoked_at: data.revoked_at,
        team_name: (data as any).teams?.name,
      });
    })();
  }, [token]);

  async function handleAccept() {
    setAccepting(true);
    const { data, error: e } = await supabase.rpc("accept_team_invite", { _token: token });
    setAccepting(false);
    if (e) { toast.error(e.message); return; }
    const result = data as { ok: boolean; error?: string; team_id?: string };
    if (!result.ok) {
      const map: Record<string, string> = {
        not_authenticated: "Faça login antes de aceitar",
        not_found: "Convite não encontrado",
        revoked: "Convite foi revogado",
        already_accepted: "Convite já foi aceito",
        expired: "Convite expirou",
      };
      toast.error(map[result.error ?? ""] ?? "Erro ao aceitar");
      return;
    }
    toast.success("Bem-vindo à equipe!");
    setDone(true);
    setTimeout(() => navigate({ to: "/dashboard" }), 1500);
  }

  if (loading) return null;

  return (
    <div className="max-w-xl mx-auto mt-20">
      <Card className="p-8 text-center">
        <Mail className="mx-auto h-10 w-10 text-primary" />
        <h1 className="font-display text-2xl mt-4 tracking-wider">CONVITE DE EQUIPE</h1>

        {error && (
          <>
            <XCircle className="mx-auto h-8 w-8 text-destructive mt-6" />
            <p className="text-sm text-muted-foreground mt-2">{error}</p>
            <Button asChild className="mt-6"><Link to="/">Voltar ao início</Link></Button>
          </>
        )}

        {!error && !invite && (
          <p className="text-sm text-muted-foreground mt-4">Carregando convite...</p>
        )}

        {invite && !done && (
          <>
            <p className="text-sm text-muted-foreground mt-4">
              Você foi convidado para <strong className="text-foreground">{invite.team_name ?? "uma equipe"}</strong> como{" "}
              <strong className="text-foreground">{invite.team_role}</strong>.
            </p>
            {invite.revoked_at && <p className="mt-3 text-sm text-destructive">Este convite foi revogado.</p>}
            {invite.accepted_at && <p className="mt-3 text-sm text-muted-foreground">Este convite já foi aceito.</p>}
            {new Date(invite.expires_at) < new Date() && !invite.accepted_at && (
              <p className="mt-3 text-sm text-destructive">Este convite expirou.</p>
            )}

            {!invite.revoked_at && !invite.accepted_at && new Date(invite.expires_at) >= new Date() && (
              <>
                {!user ? (
                  <div className="mt-6 space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Faça login ou crie uma conta {invite.email && <>com <strong>{invite.email}</strong></>} para aceitar.
                    </p>
                    <Button asChild className="w-full bg-gradient-primary">
                      <Link to="/auth" search={{ redirect: `/aceitar-convite?token=${token}` } as any}>
                        Entrar / Criar conta
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <Button onClick={handleAccept} disabled={accepting} className="mt-6 w-full bg-gradient-primary">
                    {accepting ? "Aceitando..." : "Aceitar convite"}
                  </Button>
                )}
              </>
            )}
          </>
        )}

        {done && (
          <>
            <CheckCircle2 className="mx-auto h-8 w-8 text-primary mt-6" />
            <p className="text-sm text-muted-foreground mt-2">Convite aceito! Redirecionando...</p>
          </>
        )}
      </Card>
    </div>
  );
}
