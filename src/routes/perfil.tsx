import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { PokemonPicker } from "@/components/PokemonPicker";
import { LANE_LABEL } from "@/lib/pokemon";
import { UserCircle, Save, Pencil } from "lucide-react";
import { toast } from "sonner";
import { PlayerProfileView, type PlayerProfileMember } from "@/components/player/PlayerProfileView";
import type { PerfRow } from "@/lib/player-stats";

export const Route = createFileRoute("/perfil")({
  head: () => ({ meta: [{ title: "Perfil — Battle Arena" }] }),
  component: PerfilPage,
});

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
      const { data, error } = await supabase.from("members").select("*").eq("id", memberId).maybeSingle();
      if (error) throw error;
      return data as PlayerProfileMember | null;
    },
    enabled: !!memberId,
  });

  const perfsQ = useQuery({
    queryKey: ["my-perfs", memberId],
    queryFn: async () => {
      if (!memberId) return [] as PerfRow[];
      const { data, error } = await supabase.from("match_performances").select("*").eq("member_id", memberId);
      if (error) throw error;
      return (data ?? []) as PerfRow[];
    },
    enabled: !!memberId,
  });

  const scrimsQ = useQuery({
    queryKey: ["scrims-for-perfil", memberId],
    queryFn: async () => {
      if (!memberId) return [];
      const { data, error } = await supabase.from("scrims").select("id, scheduled_at, result, opponent, best_of, opponent_id, status");
      if (error) throw error;
      return data as { id: string; scheduled_at: string; result: "win" | "loss" | "draw" | "pending"; opponent: string; best_of: number; opponent_id: string | null; status: "scheduled" | "completed" | "cancelled" }[];
    },
    enabled: !!memberId,
  });

  const [form, setForm] = useState<Partial<PlayerProfileMember>>({});
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (memberQ.data) setForm(memberQ.data);
  }, [memberQ.data]);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!memberId) throw new Error("Sem vínculo com o roster.");
      const displayName = (form.name ?? "").trim();
      if (!displayName) throw new Error("Nome de exibição é obrigatório.");
      const payload = {
        name: displayName,
        ign: form.ign?.trim() || null,
        game_id: form.game_id?.trim() || null,
        discord: form.discord?.trim() || null,
        main_pokemon: form.main_pokemon ?? null,
        lane: form.lane ?? null,
        notes: form.notes?.trim() || null,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("members").update(payload).eq("id", memberId);
      if (error) throw error;
      if (user) {
        const { error: pErr } = await supabase
          .from("profiles")
          .update({ display_name: displayName, updated_at: new Date().toISOString() })
          .eq("user_id", user.id);
        if (pErr) throw pErr;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-member", memberId] });
      qc.invalidateQueries({ queryKey: ["my-profile", user?.id] });
      qc.invalidateQueries({ queryKey: ["members"] });
      qc.invalidateQueries({ queryKey: ["profile-complete-check"] });
      toast.success("Perfil atualizado");
      setEditOpen(false);
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
          <Button asChild className="mt-6"><Link to="/dashboard">Voltar ao Dashboard</Link></Button>
        </Card>
      </div>
    );
  }

  const m = memberQ.data;
  const isIncomplete = !m.ign || !m.lane || !m.main_pokemon;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {isIncomplete && (
        <Card className="p-4 border-gold/40 bg-gold/5 flex items-start gap-3">
          <UserCircle className="h-5 w-5 text-gold shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-display text-sm tracking-wider text-gold uppercase">Complete seu perfil</div>
            <p className="text-xs text-muted-foreground mt-1">
              Preencha seu <strong className="text-foreground">IGN</strong>,{" "}
              <strong className="text-foreground">rota preferida</strong> e{" "}
              <strong className="text-foreground">Pokémon main</strong> para o time.
            </p>
          </div>
          <Button size="sm" onClick={() => setEditOpen(true)} className="bg-gradient-primary shadow-glow uppercase tracking-wider">
            <Pencil className="h-3.5 w-3.5 mr-1.5" /> Editar
          </Button>
        </Card>
      )}

      <PlayerProfileView
        member={m}
        perfs={perfsQ.data ?? []}
        scrims={scrimsQ.data ?? []}
        email={user?.email}
        headerEyebrow="Meu perfil · DU · Dragounite"
        headerAction={
          <Button
            onClick={() => setEditOpen(true)}
            className="bg-gradient-primary shadow-glow uppercase tracking-wider w-full sm:w-auto"
          >
            <Pencil className="h-4 w-4 mr-2" /> Editar perfil
          </Button>
        }
      />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl tracking-wider uppercase">
              Editar <span className="text-gold">Perfil</span>
            </DialogTitle>
            <DialogDescription>
              Suas informações aparecem no Roster e em todo o sistema.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Nome de exibição</Label>
              <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Pikachu" />
            </div>
            <div>
              <Label>IGN (Nick no jogo)</Label>
              <Input value={form.ign ?? ""} onChange={(e) => setForm({ ...form, ign: e.target.value })} placeholder="Ex: Nkyy!" />
            </div>
            <div>
              <Label>ID da conta no jogo</Label>
              <Input
                value={form.game_id ?? ""}
                onChange={(e) => setForm({ ...form, game_id: e.target.value })}
                placeholder="Ex: 1234-5678-9012"
                maxLength={64}
              />
            </div>
            <div>
              <Label>Discord</Label>
              <Input value={form.discord ?? ""} onChange={(e) => setForm({ ...form, discord: e.target.value })} placeholder="Ex: nkyy#0001" />
            </div>
            <div>
              <Label>Rota preferida</Label>
              <Select value={form.lane ?? "flex"} onValueChange={(v) => setForm({ ...form, lane: v as PlayerProfileMember["lane"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(LANE_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Pokémon Main</Label>
              <PokemonPicker value={form.main_pokemon ?? null} onChange={(v) => setForm({ ...form, main_pokemon: v })} />
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

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setForm(m); setEditOpen(false); }}>
              Cancelar
            </Button>
            <Button
              onClick={() => saveMut.mutate()}
              disabled={saveMut.isPending}
              className="bg-gradient-primary shadow-glow uppercase tracking-wider"
            >
              <Save className="h-4 w-4 mr-2" />
              {saveMut.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
