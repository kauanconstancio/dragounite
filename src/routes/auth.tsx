import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Zap, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Entrar — GymLy" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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

      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-indigo-500/10 blur-[100px]" />
      </div>

      {/* Top bar */}
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 h-16">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-[0_0_20px_rgba(79,70,229,0.5)] group-hover:shadow-[0_0_30px_rgba(79,70,229,0.8)] transition-shadow">
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

      {/* Card */}
      <main className="relative z-10 mx-auto flex max-w-md flex-col items-center px-6 pt-12 pb-20">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-[0_0_40px_rgba(79,70,229,0.6)] mb-5">
            <Zap className="h-8 w-8 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Bem-vindo de volta</h1>
          <p className="mt-2 text-sm text-slate-400 max-w-xs">
            Entre na sua conta GymLy para acessar o painel da sua equipe.
          </p>
        </div>

        <div className="w-full rounded-2xl border border-indigo-500/20 bg-[#141432]/80 backdrop-blur-xl p-7 shadow-[0_20px_60px_-20px_rgba(79,70,229,0.4)]">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="li-email" className="text-xs font-medium text-slate-300">
                Email
              </Label>
              <Input
                id="li-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@time.gg"
                className="bg-[#0a0a1a]/60 border-indigo-500/20 text-white placeholder:text-slate-500 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/30 h-11"
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
              disabled={loading}
              className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:shadow-[0_0_30px_rgba(79,70,229,0.7)] transition-all"
            >
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-indigo-500/10 space-y-2 text-center">
            <p className="text-xs text-slate-400 leading-relaxed">
              Já foi aprovado na waitlist?{" "}
              <Link to="/cadastro" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                Criar conta →
              </Link>
            </p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Ainda não está na lista?{" "}
              <Link to="/" className="text-indigo-400/80 hover:text-indigo-300 transition-colors">
                Entre na waitlist
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
