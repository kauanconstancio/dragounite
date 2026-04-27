import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";

const schema = z.object({
  email: z.string().trim().email({ message: "Email inválido" }).max(255),
  team_name: z.string().trim().max(100).optional(),
});

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [teamName, setTeamName] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ email, team_name: teamName || undefined });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("waitlist").insert({
      email: parsed.data.email,
      team_name: parsed.data.team_name ?? null,
      source: "landing",
    });
    setLoading(false);
    if (error) {
      if (error.code === "23505") {
        toast.error("Esse email já está na waitlist!");
      } else {
        toast.error("Erro ao enviar. Tente novamente.");
      }
      return;
    }
    setSuccess(true);
    toast.success("Você está na lista! 🚀");
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-indigo-500/40 bg-indigo-500/10 p-10 text-center">
        <div className="mx-auto h-14 w-14 rounded-full bg-indigo-500 flex items-center justify-center mb-5 shadow-[0_0_30px_rgba(79,70,229,0.6)]">
          <Check className="h-7 w-7 text-white" strokeWidth={3} />
        </div>
        <h3 className="text-2xl font-bold text-white">Você está na lista!</h3>
        <p className="mt-2 text-slate-300">
          Vamos te avisar assim que o GymLy abrir as portas. Até lá, prepare seu time.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs uppercase tracking-widest text-slate-400 mb-2">
          Email *
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          className="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
        />
      </div>
      <div>
        <label className="block text-xs uppercase tracking-widest text-slate-400 mb-2">
          Nome do time (opcional)
        </label>
        <input
          type="text"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          placeholder="Ex: Battle Arena"
          maxLength={100}
          className="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-6 py-3.5 text-base font-semibold text-white shadow-[0_0_30px_rgba(79,70,229,0.5)] hover:shadow-[0_0_50px_rgba(79,70,229,0.8)] transition-all"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {loading ? "Enviando..." : "Garantir minha vaga"}
      </button>
      <p className="text-xs text-center text-slate-500">
        Sem spam. Avisamos só quando estiver pronto.
      </p>
    </form>
  );
}
