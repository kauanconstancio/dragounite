import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { signupInvitedUser, getInvitePreview } from "@/server/onboarding.functions";

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

type Mode = "choose" | "login" | "signup";

function AcceptInvitePage() {
  const { token } = Route.useSearch();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const signupFn = useServerFn(signupInvitedUser);
  const previewFn = useServerFn(getInvitePreview);

  const [invite, setInvite] = useState<InvitePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [done, setDone] = useState(false);
  const [mode, setMode] = useState<Mode>("choose");

  // form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Token ausente");
      return;
    }
    (async () => {
      try {
        const res = await previewFn({ data: { token } });
        if (!res.found) {
          setError("Convite não encontrado");
          return;
        }
        const preview: InvitePreview = {
          team_id: res.team_id,
          team_role: res.team_role,
          email: res.email,
          expires_at: res.expires_at,
          accepted_at: res.accepted_at,
          revoked_at: res.revoked_at,
          team_name: res.team_name ?? undefined,
        };
        setInvite(preview);
        if (preview.email) setEmail(preview.email);
      } catch (err: any) {
        setError(err?.message ?? "Erro ao carregar convite");
      }
    })();
  }, [token]);

  // Auto-accept if already authenticated
  useEffect(() => {
    if (!user || !invite || done || accepting) return;
    if (invite.revoked_at || invite.accepted_at) return;
    if (new Date(invite.expires_at) < new Date()) return;
    handleAccept();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, invite]);

  async function handleAccept() {
    setAccepting(true);
    const { data, error: e } = await supabase.rpc("accept_team_invite", {
      _token: token,
    });
    setAccepting(false);
    if (e) {
      toast.error(e.message);
      return;
    }
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

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error: lErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (lErr) throw lErr;
      try {
        localStorage.removeItem("active-team-id");
      } catch {}
      // useEffect above will auto-accept after user updates
    } catch (err: any) {
      toast.error(err?.message ?? "Email ou senha inválidos.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    setSubmitting(true);
    try {
      await signupFn({
        data: {
          token,
          email: email.trim(),
          password,
          display_name: name.trim(),
        },
      });
      const { error: lErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (lErr) throw lErr;
      try {
        localStorage.removeItem("active-team-id");
      } catch {}
      // useEffect will auto-accept
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao criar conta.");
    } finally {
      setSubmitting(false);
    }
  }

  const inviteUsable =
    invite &&
    !invite.revoked_at &&
    !invite.accepted_at &&
    new Date(invite.expires_at) >= new Date();

  return (
    <div className="max-w-xl mx-auto mt-20 px-4">
      <Card className="p-8 text-center">
        <Mail className="mx-auto h-10 w-10 text-primary" />
        <h1 className="font-display text-2xl mt-4 tracking-wider">
          CONVITE DE EQUIPE
        </h1>

        {error && (
          <>
            <XCircle className="mx-auto h-8 w-8 text-destructive mt-6" />
            <p className="text-sm text-muted-foreground mt-2">{error}</p>
            <Button asChild className="mt-6">
              <Link to="/">Voltar ao início</Link>
            </Button>
          </>
        )}

        {!error && !invite && (
          <p className="text-sm text-muted-foreground mt-4">
            Carregando convite...
          </p>
        )}

        {invite && !done && (
          <>
            <p className="text-sm text-muted-foreground mt-4">
              Você foi convidado para{" "}
              <strong className="text-foreground">
                {invite.team_name ?? "uma equipe"}
              </strong>{" "}
              como{" "}
              <strong className="text-foreground">{invite.team_role}</strong>.
            </p>
            {invite.revoked_at && (
              <p className="mt-3 text-sm text-destructive">
                Este convite foi revogado.
              </p>
            )}
            {invite.accepted_at && (
              <p className="mt-3 text-sm text-muted-foreground">
                Este convite já foi aceito.
              </p>
            )}
            {new Date(invite.expires_at) < new Date() &&
              !invite.accepted_at && (
                <p className="mt-3 text-sm text-destructive">
                  Este convite expirou.
                </p>
              )}

            {loading && (
              <p className="mt-4 text-xs text-muted-foreground">
                Verificando sua sessão...
              </p>
            )}

            {inviteUsable && !loading && (
              <>
                {user ? (
                  <div className="mt-6">
                    <p className="text-xs text-muted-foreground mb-3">
                      Aceitando como <strong>{user.email}</strong>...
                    </p>
                    <Button
                      onClick={handleAccept}
                      disabled={accepting}
                      className="w-full bg-gradient-primary"
                    >
                      {accepting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Aceitando...
                        </>
                      ) : (
                        "Aceitar convite"
                      )}
                    </Button>
                  </div>
                ) : mode === "choose" ? (
                  <div className="mt-6 space-y-3 text-left">
                    <p className="text-xs text-muted-foreground text-center">
                      Para aceitar este convite, entre na sua conta ou crie uma
                      nova.
                    </p>
                    <Button
                      onClick={() => setMode("login")}
                      className="w-full bg-gradient-primary"
                    >
                      Já tenho conta — Entrar
                    </Button>
                    <Button
                      onClick={() => setMode("signup")}
                      variant="outline"
                      className="w-full"
                    >
                      Criar nova conta
                    </Button>
                  </div>
                ) : mode === "login" ? (
                  <form
                    onSubmit={handleLogin}
                    className="mt-6 space-y-4 text-left"
                  >
                    <div className="space-y-1.5">
                      <Label htmlFor="ai-email">Email</Label>
                      <Input
                        id="ai-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="voce@time.gg"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="ai-pass">Senha</Label>
                      <Input
                        id="ai-pass"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-gradient-primary"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Entrando...
                        </>
                      ) : (
                        "Entrar e aceitar convite"
                      )}
                    </Button>
                    <button
                      type="button"
                      onClick={() => setMode("choose")}
                      className="w-full text-xs text-muted-foreground hover:text-foreground"
                    >
                      ← Voltar
                    </button>
                  </form>
                ) : (
                  <form
                    onSubmit={handleSignup}
                    className="mt-6 space-y-4 text-left"
                  >
                    <div className="space-y-1.5">
                      <Label htmlFor="ai-su-email">Email</Label>
                      <Input
                        id="ai-su-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="voce@time.gg"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="ai-su-name">Seu nome</Label>
                      <Input
                        id="ai-su-name"
                        required
                        minLength={1}
                        maxLength={80}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Como podemos te chamar?"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="ai-su-pass">
                        Senha (mínimo 8 caracteres)
                      </Label>
                      <Input
                        id="ai-su-pass"
                        type="password"
                        required
                        minLength={8}
                        maxLength={72}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-gradient-primary"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Criando conta...
                        </>
                      ) : (
                        "Criar conta e aceitar convite"
                      )}
                    </Button>
                    <button
                      type="button"
                      onClick={() => setMode("choose")}
                      className="w-full text-xs text-muted-foreground hover:text-foreground"
                    >
                      ← Voltar
                    </button>
                  </form>
                )}
              </>
            )}
          </>
        )}

        {done && (
          <>
            <CheckCircle2 className="mx-auto h-8 w-8 text-primary mt-6" />
            <p className="text-sm text-muted-foreground mt-2">
              Convite aceito! Redirecionando...
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
