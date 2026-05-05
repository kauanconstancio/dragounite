import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import dragouniteLogo from "@/assets/dragounite-logo.png";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Entrar — Dragounite" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [resetEmail, setResetEmail] = useState("");

  const STAFF_EMAIL = "staff@gymli.com";

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        const isStaff = data.session.user.email?.toLowerCase() === STAFF_EMAIL;
        navigate({ to: isStaff ? "/staff" : "/equipes" });
      }
    });
  }, [navigate]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    try { localStorage.removeItem("active-team-id"); } catch {}
    const isStaff = data.user?.email?.toLowerCase() === STAFF_EMAIL;
    if (isStaff) {
      toast.success("Bem-vindo, Staff. Redirecionando para o console.");
      navigate({ to: "/staff" });
    } else {
      toast.success("Bem-vindo de volta! Escolha sua equipe para continuar.");
      navigate({ to: "/equipes" });
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Link de recuperação enviado. Verifique seu email.");
    setMode("login");
    setResetEmail("");
  }

  return (
    <div className="dragounite-auth min-h-screen w-full bg-[#0f0d0e] text-zinc-100 antialiased relative overflow-hidden font-sans">
      <style>{`
        .dragounite-auth h1, .dragounite-auth h2, .dragounite-auth h3 {
          font-family: var(--font-display);
          letter-spacing: -0.02em;
        }
        .dragounite-auth { color-scheme: dark; }
      `}</style>

      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-red-600/25 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-red-700/15 blur-[100px]" />
        <div className="absolute -top-20 -right-40 w-[600px] h-[200px] rotate-[18deg] bg-gradient-to-r from-transparent via-red-600/20 to-transparent blur-2xl" />
      </div>

      {/* Top bar */}
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 h-16">
        <Link to="/" className="flex items-center gap-2.5 group">
          <img src={dragouniteLogo} alt="Dragounite" className="h-9 w-9 rounded-lg shadow-[0_0_20px_rgba(220,38,38,0.6)] group-hover:shadow-[0_0_30px_rgba(220,38,38,0.9)] transition-shadow" />
          <span className="font-black text-xl tracking-tight text-white uppercase">
            Drago<span className="text-red-500">unite</span>
          </span>
        </Link>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-zinc-400 hover:text-white transition-colors font-bold"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar ao site
        </Link>
      </header>

      {/* Card */}
      <main className="relative z-10 mx-auto flex max-w-md flex-col items-center px-6 pt-12 pb-20">
        <div className="mb-8 flex flex-col items-center text-center">
          <img src={dragouniteLogo} alt="Dragounite" className="h-20 w-20 rounded-2xl shadow-[0_0_40px_rgba(220,38,38,0.6)] mb-5" />
          <h1 className="text-4xl font-black tracking-tighter uppercase">
            {mode === "login" ? "Área do time" : "Recuperar senha"}
          </h1>
          <p className="mt-2 text-sm text-zinc-400 max-w-xs">
            {mode === "login" ? (
              <>Acesse o painel do <span className="text-white font-semibold">Dragounite</span> para gerenciar roster, scrims e estatísticas.</>
            ) : (
              <>Informe seu email cadastrado e enviaremos um link para redefinir sua senha.</>
            )}
          </p>
        </div>

        <div className="w-full rounded-2xl border border-red-600/25 bg-zinc-900/60 backdrop-blur-xl p-7 shadow-[0_20px_60px_-20px_rgba(220,38,38,0.4)]">
          {mode === "login" ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="li-email" className="text-[11px] uppercase tracking-widest font-bold text-zinc-300">
                  Email
                </Label>
                <Input
                  id="li-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@dragounite.gg"
                  className="bg-[#0f0d0e]/60 border-red-600/20 text-white placeholder:text-zinc-600 focus-visible:border-red-500 focus-visible:ring-red-500/30 h-11"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="li-pass" className="text-[11px] uppercase tracking-widest font-bold text-zinc-300">
                    Senha
                  </Label>
                  <button
                    type="button"
                    onClick={() => { setResetEmail(email); setMode("forgot"); }}
                    className="text-[11px] uppercase tracking-wider text-red-400 hover:text-red-300 font-bold transition-colors"
                  >
                    Esqueci minha senha
                  </button>
                </div>
                <Input
                  id="li-pass"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-[#0f0d0e]/60 border-red-600/20 text-white placeholder:text-zinc-600 focus-visible:border-red-500 focus-visible:ring-red-500/30 h-11"
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-wider shadow-[0_0_20px_rgba(220,38,38,0.5)] hover:shadow-[0_0_30px_rgba(220,38,38,0.8)] transition-all"
              >
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="rp-email" className="text-[11px] uppercase tracking-widest font-bold text-zinc-300">
                  Email
                </Label>
                <Input
                  id="rp-email"
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="voce@dragounite.gg"
                  className="bg-[#0f0d0e]/60 border-red-600/20 text-white placeholder:text-zinc-600 focus-visible:border-red-500 focus-visible:ring-red-500/30 h-11"
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-wider shadow-[0_0_20px_rgba(220,38,38,0.5)] hover:shadow-[0_0_30px_rgba(220,38,38,0.8)] transition-all"
              >
                {loading ? "Enviando..." : "Enviar link de recuperação"}
              </Button>
              <button
                type="button"
                onClick={() => setMode("login")}
                className="w-full text-xs uppercase tracking-wider text-zinc-400 hover:text-white font-bold transition-colors"
              >
                ← Voltar para o login
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-[11px] text-zinc-600 uppercase tracking-[0.25em] font-bold">
          Dragounite · Forjados para vencer
        </p>
      </main>
    </div>
  );
}
