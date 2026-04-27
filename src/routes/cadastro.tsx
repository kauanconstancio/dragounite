import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Zap, ArrowLeft, CheckCircle2, ShieldAlert, Loader2 } from "lucide-react";
import {
  checkWaitlistApproval,
  signupApprovedUser,
} from "@/server/onboarding.functions";

export const Route = createFileRoute("/cadastro")({
  head: () => ({ meta: [{ title: "Criar conta — GymLy" }] }),
  component: CadastroPage,
});

type CheckState =
  | { phase: "idle" }
  | { phase: "checking" }
  | { phase: "ok"; suggestedTeamName: string | null }
  | { phase: "login"; suggestedTeamName: string | null }
  | { phase: "error"; message: string };

function CadastroPage() {
  const navigate = useNavigate();
  const checkFn = useServerFn(checkWaitlistApproval);
  const signupFn = useServerFn(signupApprovedUser);

  const [email, setEmail] = useState("");
  const [check, setCheck] = useState<CheckState>({ phase: "idle" });
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleCheck(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setCheck({ phase: "checking" });
    try {
      const res = await checkFn({ data: { email: email.trim() } });
      if (!res.found) {
        setCheck({
          phase: "error",
          message:
            "Não encontramos esse email na waitlist. Entre na lista de espera primeiro.",
        });
        return;
      }
      if (res.alreadyClaimed) {
        setCheck({
          phase: "login",
          suggestedTeamName: res.suggestedTeamName ?? null,
        });
        return;
      }
      if (!res.approved) {
        setCheck({
          phase: "error",
          message:
            "Seu acesso ainda não foi aprovado. Avisaremos por email assim que liberarmos.",
        });
        return;
      }
      setCheck({ phase: "ok", suggestedTeamName: res.suggestedTeamName });
    } catch (err: any) {
      setCheck({
        phase: "error",
        message: err?.message ?? "Erro ao verificar email.",
      });
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (check.phase !== "ok") return;
    if (password.length < 8) {
      toast.error("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    setSubmitting(true);
    try {
      await signupFn({
        data: {
          email: email.trim(),
          password,
          display_name: name.trim(),
        },
      });
      // Auto-login
      const { error: loginErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (loginErr) throw loginErr;
      toast.success("Conta criada! Vamos configurar sua equipe.");
      try {
        localStorage.removeItem("active-team-id");
      } catch {}
      navigate({ to: "/onboarding" });
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao criar conta.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (check.phase !== "login") return;
    if (!password) {
      toast.error("Digite sua senha.");
      return;
    }
    setSubmitting(true);
    try {
      const { data: signIn, error: loginErr } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
      if (loginErr) throw loginErr;
      const userId = signIn.user?.id;
      // Check if user already has a team
      let hasTeam = false;
      if (userId) {
        const { data: tm } = await supabase
          .from("team_memberships")
          .select("team_id")
          .eq("user_id", userId)
          .limit(1);
        hasTeam = !!(tm && tm.length > 0);
      }
      try {
        localStorage.removeItem("active-team-id");
      } catch {}
      if (hasTeam) {
        toast.success("Bem-vindo de volta!");
        navigate({ to: "/dashboard" });
      } else {
        toast.success("Login efetuado. Vamos configurar sua equipe.");
        navigate({ to: "/onboarding" });
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Email ou senha inválidos.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="gymly-auth min-h-screen w-full bg-[#0a0a1a] text-white antialiased relative overflow-hidden"
      style={{ fontFamily: '"Manrope", system-ui, sans-serif' }}
    >
      <style>{`
        .gymly-auth h1, .gymly-auth h2, .gymly-auth h3 {
          font-family: "Sora", system-ui, sans-serif;
          letter-spacing: -0.02em;
        }
        .gymly-auth { color-scheme: dark; }
      `}</style>

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-indigo-500/10 blur-[100px]" />
      </div>

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 h-16">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-[0_0_20px_rgba(79,70,229,0.5)]">
            <Zap className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-xl tracking-tight text-white">
            Gym<span className="text-indigo-400">Ly</span>
          </span>
        </Link>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar ao site
        </Link>
      </header>

      <main className="relative z-10 mx-auto flex max-w-md flex-col items-center px-6 pt-12 pb-20">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-[0_0_40px_rgba(79,70,229,0.6)] mb-5">
            <Zap className="h-8 w-8 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Criar sua conta</h1>
          <p className="mt-2 text-sm text-slate-400 max-w-xs">
            Foi aprovado na waitlist? Use o mesmo email aqui para liberar o acesso.
          </p>
        </div>

        <div className="w-full rounded-2xl border border-indigo-500/20 bg-[#141432]/80 backdrop-blur-xl p-7 shadow-[0_20px_60px_-20px_rgba(79,70,229,0.4)]">
          {check.phase === "ok" ? null : check.phase === "login" ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="flex items-start gap-2 rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-3 text-xs text-indigo-100">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Este email já tem uma conta. Digite sua senha para entrar.
                </span>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-300">Email</Label>
                <Input
                  value={email}
                  disabled
                  className="bg-[#0a0a1a]/60 border-indigo-500/10 text-slate-400 h-11"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="li-pass" className="text-xs font-medium text-slate-300">
                  Senha
                </Label>
                <Input
                  id="li-pass"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-[#0a0a1a]/60 border-indigo-500/20 text-white placeholder:text-slate-500 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/30 h-11"
                />
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:shadow-[0_0_30px_rgba(79,70,229,0.7)] transition-all"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>

              <button
                type="button"
                onClick={() => {
                  setPassword("");
                  setCheck({ phase: "idle" });
                }}
                className="w-full text-xs text-slate-400 hover:text-white transition-colors"
              >
                Usar outro email
              </button>
            </form>
          ) : (
            <form onSubmit={handleCheck} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="ck-email" className="text-xs font-medium text-slate-300">
                  Email cadastrado na waitlist
                </Label>
                <Input
                  id="ck-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (check.phase !== "idle") setCheck({ phase: "idle" });
                  }}
                  placeholder="voce@time.gg"
                  className="bg-[#0a0a1a]/60 border-indigo-500/20 text-white placeholder:text-slate-500 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/30 h-11"
                />
              </div>

              {check.phase === "error" && (
                <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
                  <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{check.message}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={check.phase === "checking"}
                className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:shadow-[0_0_30px_rgba(79,70,229,0.7)] transition-all"
              >
                {check.phase === "checking" ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  "Verificar acesso"
                )}
              </Button>
            </form>
          )}

          {check.phase === "ok" ? (
            <form onSubmit={handleSignup} className="space-y-5">
              <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Acesso aprovado! Crie sua senha para continuar.</span>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-300">Email</Label>
                <Input
                  value={email}
                  disabled
                  className="bg-[#0a0a1a]/60 border-indigo-500/10 text-slate-400 h-11"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="su-name" className="text-xs font-medium text-slate-300">
                  Seu nome
                </Label>
                <Input
                  id="su-name"
                  required
                  minLength={1}
                  maxLength={80}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Como podemos te chamar?"
                  className="bg-[#0a0a1a]/60 border-indigo-500/20 text-white placeholder:text-slate-500 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/30 h-11"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="su-pass" className="text-xs font-medium text-slate-300">
                  Senha (mínimo 8 caracteres)
                </Label>
                <Input
                  id="su-pass"
                  type="password"
                  required
                  minLength={8}
                  maxLength={72}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-[#0a0a1a]/60 border-indigo-500/20 text-white placeholder:text-slate-500 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/30 h-11"
                />
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:shadow-[0_0_30px_rgba(79,70,229,0.7)] transition-all"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Criando conta...
                  </>
                ) : (
                  "Criar conta e continuar"
                )}
              </Button>
            </form>
          )}

          <div className="mt-6 pt-5 border-t border-indigo-500/10">
            <p className="text-xs text-slate-400 text-center leading-relaxed">
              Já tem conta?{" "}
              <Link to="/auth" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                Entrar →
              </Link>
            </p>
          </div>
        </div>

        <p className="mt-6 text-[11px] text-slate-500 uppercase tracking-[0.2em]">
          GymLy · Esports Operations Platform
        </p>
      </main>
    </div>
  );
}
