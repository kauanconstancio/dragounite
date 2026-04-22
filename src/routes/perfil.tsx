import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PokemonPicker } from "@/components/PokemonPicker";
import { PokemonImage } from "@/components/PokemonImage";
import { Badge } from "@/components/ui/badge";
import { LANE_LABEL, ROLE_COLORS, ROLE_LABEL } from "@/lib/pokemon";
import { UserCircle, Save, BarChart3, Crosshair, Skull, Trophy, Star, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { aggregatePlayer, kdaTimeline, playerWinRate, topPokemon, type PerfRow } from "@/lib/player-stats";

const KdaChart = lazy(() => import("@/components/dashboard/KdaChart").then((m) => ({ default: m.KdaChart })));

export const Route = createFileRoute("/perfil")({
  head: () => ({ meta: [{ title: "Perfil — Battle Arena" }] }),
  component: PerfilPage,
});

type Member = {
  id: string;
  name: string;
  ign: string | null;
  role: "player" | "substitute" | "coach" | "manager";
  lane: "top" | "jungle" | "mid" | "bot" | "support" | "flex" | null;
  main_pokemon: string | null;
  discord: string | null;
  notes: string | null;
};

function PerfilPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const profileQ = useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("member_id, display_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const memberId = profileQ.data?.member_id ?? null;

  const memberQ = useQuery({
    queryKey: ["my-member", memberId],
    queryFn: async () => {
      if (!memberId) return null;
      const { data, error } = await supabase
        .from("members")
        .select("*")
        .eq("id", memberId)
        .maybeSingle();
      if (error) throw error;
      return data as Member | null;
    },
    enabled: !!memberId,
  });

  const [form, setForm] = useState<Partial<Member>>({});

  useEffect(() => {
    if (memberQ.data) setForm(memberQ.data);
  }, [memberQ.data]);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!memberId) throw new Error("Sem vínculo com o roster.");
      const payload = {
        ign: form.ign?.trim() || null,
        discord: form.discord?.trim() || null,
        main_pokemon: form.main_pokemon ?? null,
        lane: form.lane ?? null,
        notes: form.notes?.trim() || null,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("members").update(payload).eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-member", memberId] });
      qc.invalidateQueries({ queryKey: ["members"] });
      toast.success("Perfil atualizado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (profileQ.isLoading || memberQ.isLoading) {
    return <div className="text-center text-muted-foreground py-20 text-xs uppercase tracking-[0.3em]">Carregando perfil...</div>;
  }

  if (!memberId || !memberQ.data) {
    return (
      <div className="max-w-xl mx-auto mt-20">
        <Card className="p-8 text-center">
          <UserCircle className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="font-display text-2xl mt-4 tracking-wider">Sem vínculo no Roster</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Sua conta ainda não está vinculada a uma entrada do Roster. Peça para a gestão fazer o vínculo no painel administrativo.
          </p>
          <Button asChild className="mt-6"><Link to="/">Voltar ao Dashboard</Link></Button>
        </Card>
      </div>
    );
  }

  const m = memberQ.data;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <header>
        <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Conta</div>
        <h1 className="font-display text-4xl tracking-wider">
          MEU <span className="text-gold">PERFIL</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Edite suas informações pessoais que aparecem no Roster do time.
        </p>
      </header>

      <Card className="p-6 border-border bg-card">
        <div className="flex items-center gap-4 pb-5 border-b border-border/60">
          <div className="flex h-16 w-16 items-center justify-center rounded-md bg-gradient-primary text-primary-foreground font-display text-3xl shadow-glow">
            {m.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="font-display text-2xl tracking-wider">{m.name}</div>
            <div className="text-xs text-muted-foreground">{user?.email}</div>
            <div className="flex gap-2 mt-2">
              <Badge className={`uppercase tracking-wider text-[10px] ${ROLE_COLORS[m.role]}`} variant="outline">
                {ROLE_LABEL[m.role]}
              </Badge>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground self-center">
                Nome e função são gerenciados pela gestão
              </span>
            </div>
          </div>
          {form.main_pokemon && (
            <div className="h-20 w-20 shrink-0">
              <PokemonImage name={form.main_pokemon} withRoleBg />
            </div>
          )}
        </div>

        <div className="grid gap-4 mt-6 sm:grid-cols-2">
          <div>
            <Label>IGN (Nick no jogo)</Label>
            <Input
              value={form.ign ?? ""}
              onChange={(e) => setForm({ ...form, ign: e.target.value })}
              placeholder="Ex: Nkyy!"
            />
          </div>
          <div>
            <Label>Discord</Label>
            <Input
              value={form.discord ?? ""}
              onChange={(e) => setForm({ ...form, discord: e.target.value })}
              placeholder="Ex: nkyy#0001"
            />
          </div>
          <div>
            <Label>Rota preferida</Label>
            <Select
              value={form.lane ?? "flex"}
              onValueChange={(v) => setForm({ ...form, lane: v as Member["lane"] })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(LANE_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Pokémon Main</Label>
            <PokemonPicker
              value={form.main_pokemon ?? null}
              onChange={(v) => setForm({ ...form, main_pokemon: v })}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Notas pessoais</Label>
            <Textarea
              rows={4}
              value={form.notes ?? ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Estilo de jogo, horários, observações..."
            />
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <Button
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending}
            className="bg-gradient-primary shadow-glow uppercase tracking-wider"
          >
            <Save className="h-4 w-4 mr-2" />
            {saveMut.isPending ? "Salvando..." : "Salvar perfil"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
