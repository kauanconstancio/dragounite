import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import dragouniteLogo from "@/assets/dragounite-logo.png";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Redefinir senha — Dragounite" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  useEffect(() => {
    // Supabase recovery sets a session via the URL hash automatically.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) return toast.error("A senha deve ter pelo menos 6 caracteres.");
    if (password !== confirm) return toast.error("As senhas não coincidem.");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Senha redefinida com sucesso!");
    navigate({ to: "/equipes" });
  }

  return (
    <div className="dragounite-auth min-h-screen w-full bg-[#0f0d0e] text-zinc-100 antialiased relative overflow-hidden font-sans">
      <style>{`
        .dragounite-auth h1 { font-family: var(--font-display); letter-spacing: -0.02em; }
        .dragounite-auth { color-scheme: dark; }
      `}</style>

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-red-600/25 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-red-700/15 blur-[100px]" />
      </div>

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 h-16">
        <Link to="/" className="flex items-center gap-2.5 group">
          <img src={dragouniteLogo} alt="Dragounite" className="h-9 w-9 rounded-lg shadow-[0_0_20px_rgba(220,38,38,0.6)]" />
          <span className="font-black text-xl tracking-tight text-white uppercase">
            Drago<span className="text-red-500">unite</span>
          </span>
        </Link>
        <Link to="/auth" className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-zinc-400 hover:text-white transition-colors font-bold">
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao login
        </Link>
      </header>

      <main className="relative z-10 mx-auto flex max-w-md flex-col items-center px-6 pt-12 pb-20">
        <div className="mb-8 flex flex-col items-center text-center">
          <img src={dragouniteLogo} alt="Dragounite" className="h-20 w-20 rounded-2xl shadow-[0_0_40px_rgba(220,38,38,0.6)] mb-5" />
          <h1 className="text-4xl font-black tracking-tighter uppercase">Redefinir senha</h1>
          <p className="mt-2 text-sm text-zinc-400 max-w-xs">
            Defina uma nova senha para acessar a sua conta.
          </p>
        </div>

        <div className="w-full rounded-2xl border border-red-600/25 bg-zinc-900/60 backdrop-blur-xl p-7 shadow-[0_20px_60px_-20px_rgba(220,38,38,0.4)]">
          {!ready ? (
            <p className="text-sm text-zinc-400 text-center py-4">
              Validando link de recuperação... Se você não chegou aqui pelo email enviado, solicite um novo link na <Link to="/auth" className="text-red-400 hover:text-red-300 font-bold">tela de login</Link>.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="np" className="text-[11px] uppercase tracking-widest font-bold text-zinc-300">Nova senha</Label>
                <Input
                  id="np" type="password" required value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-[#0f0d0e]/60 border-red-600/20 text-white placeholder:text-zinc-600 focus-visible:border-red-500 focus-visible:ring-red-500/30 h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cp" className="text-[11px] uppercase tracking-widest font-bold text-zinc-300">Confirmar senha</Label>
                <Input
                  id="cp" type="password" required value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="bg-[#0f0d0e]/60 border-red-600/20 text-white placeholder:text-zinc-600 focus-visible:border-red-500 focus-visible:ring-red-500/30 h-11"
                />
              </div>
              <Button
                type="submit" disabled={loading}
                className="w-full h-11 bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-wider shadow-[0_0_20px_rgba(220,38,38,0.5)] hover:shadow-[0_0_30px_rgba(220,38,38,0.8)] transition-all"
              >
                {loading ? "Salvando..." : "Salvar nova senha"}
              </Button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
