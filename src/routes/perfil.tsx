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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { PokemonPicker } from "@/components/PokemonPicker";
import { PokemonImage } from "@/components/PokemonImage";
import { Badge } from "@/components/ui/badge";
import { LANE_LABEL, ROLE_COLORS, ROLE_LABEL } from "@/lib/pokemon";
import { UserCircle, Save, BarChart3, Crosshair, Trophy, Star, TrendingUp, Pencil, Gamepad2, MessageSquare, Hash, Map as MapIcon } from "lucide-react";
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
  game_id: string | null;
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
      const { data, error } = await supabase.from("scrims").select("id, scheduled_at, result");
      if (error) throw error;
      return data as { id: string; scheduled_at: string; result: "win" | "loss" | "draw" | "pending" }[];
    },
    enabled: !!memberId,
  });

  const dateMap = useMemo(() => new Map((scrimsQ.data ?? []).map((s) => [s.id, s.scheduled_at])), [scrimsQ.data]);
  const resultMap = useMemo(() => new Map((scrimsQ.data ?? []).map((s) => [s.id, s.result])), [scrimsQ.data]);
  const perfs = perfsQ.data ?? [];
  const agg = useMemo(() => aggregatePlayer(perfs), [perfs]);
  const wr = useMemo(() => playerWinRate(perfs), [perfs]);
  const top = useMemo(() => topPokemon(perfs, 3), [perfs]);
  const timeline = useMemo(() => kdaTimeline(perfs, dateMap), [perfs, dateMap]);

  const [form, setForm] = useState<Partial<Member>>({});
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

      {/* HERO CARD */}
      <Card className="relative overflow-hidden border-border bg-gradient-to-br from-card via-card to-muted/30 p-6 sm:p-8">
        <div className="absolute inset-0 -z-0 opacity-20 pointer-events-none">
          <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-primary/30 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-gold/20 blur-3xl" />
        </div>

        <div className="relative flex flex-col sm:flex-row items-start gap-6">
          {/* Avatar / Pokemon main */}
          <div className="relative shrink-0">
            {m.main_pokemon ? (
              <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-2xl overflow-hidden ring-2 ring-gold/40 shadow-glow">
                <PokemonImage name={m.main_pokemon} withRoleBg />
              </div>
            ) : (
              <div className="flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground font-display text-5xl shadow-glow ring-2 ring-gold/40">
                {m.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Identity */}
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">DU · Dragounite</div>
            <h1 className="font-display text-3xl sm:text-5xl tracking-wider leading-tight mt-1 break-words">
              {m.ign || m.name}
            </h1>
            <div className="text-sm text-muted-foreground mt-1">{m.name}</div>

            <div className="flex flex-wrap gap-2 mt-3">
              <Badge className={`uppercase tracking-wider text-[10px] ${ROLE_COLORS[m.role]}`} variant="outline">
                {ROLE_LABEL[m.role]}
              </Badge>
              {m.lane && (
                <Badge variant="outline" className="uppercase tracking-wider text-[10px] border-gold/40 text-gold">
                  <MapIcon className="h-3 w-3 mr-1" />
                  {LANE_LABEL[m.lane]}
                </Badge>
              )}
              {m.main_pokemon && (
                <Badge variant="outline" className="uppercase tracking-wider text-[10px] border-primary/40 text-primary">
                  <Star className="h-3 w-3 mr-1" />
                  Main: {m.main_pokemon}
                </Badge>
              )}
            </div>
          </div>

          <Button
            onClick={() => setEditOpen(true)}
            className="bg-gradient-primary shadow-glow uppercase tracking-wider w-full sm:w-auto"
          >
            <Pencil className="h-4 w-4 mr-2" /> Editar perfil
          </Button>
        </div>

        {/* Info grid */}
        <div className="relative mt-6 pt-6 border-t border-border/60 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <InfoItem icon={UserCircle} label="Email" value={user?.email ?? "—"} />
          <InfoItem icon={Gamepad2} label="ID do jogo" value={m.game_id || "—"} mono />
          <InfoItem icon={MessageSquare} label="Discord" value={m.discord || "—"} />
          <InfoItem icon={Hash} label="IGN" value={m.ign || "—"} />
        </div>

        {m.notes && (
          <div className="relative mt-4 pt-4 border-t border-border/60">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Notas pessoais</div>
            <p className="text-sm text-foreground/90 whitespace-pre-wrap">{m.notes}</p>
          </div>
        )}
      </Card>

      {/* EDIT DIALOG */}
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
              <Input
                value={form.name ?? ""}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Pikachu"
              />
            </div>
            <div>
              <Label>IGN (Nick no jogo)</Label>
              <Input
                value={form.ign ?? ""}
                onChange={(e) => setForm({ ...form, ign: e.target.value })}
                placeholder="Ex: Nkyy!"
              />
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
            <div className="sm:col-span-2">
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

      <section className="space-y-4">
        <div className="flex items-end justify-between flex-wrap gap-2">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Desempenho</div>
            <h2 className="font-display text-2xl tracking-wider">MINHAS <span className="text-gold">ESTATÍSTICAS</span></h2>
          </div>
          {agg.games > 0 && (
            <Link
              to="/jogadores/$memberId"
              params={{ memberId: memberId! }}
              className="text-[11px] uppercase tracking-widest text-muted-foreground hover:text-gold"
            >
              Ver perfil completo →
            </Link>
          )}
        </div>

        {perfsQ.isLoading ? (
          <Card className="p-8 text-center text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Carregando estatísticas...
          </Card>
        ) : agg.games === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <BarChart3 className="mx-auto h-8 w-8 text-muted-foreground opacity-50" />
            <div className="mt-3 text-sm text-muted-foreground">
              Você ainda não possui partidas registradas. Suas estatísticas aparecerão aqui assim que o coach lançar performances de scrims.
            </div>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MiniStat icon={TrendingUp} label="Win rate" value={`${wr.rate}%`} hint={`${wr.wins}V · ${wr.losses}D`} accent="gold" />
              <MiniStat icon={BarChart3} label="KDA médio" value={agg.kda.toFixed(2)} hint={`${agg.k} K · ${agg.a} A`} accent="gold" />
              <MiniStat icon={Star} label="MVPs" value={agg.mvp} hint={`${agg.games} jogos`} accent="gold" />
              <MiniStat icon={BarChart3} label="Score médio" value={agg.avgScore.toLocaleString()} hint={`Dano ${agg.dmg.toLocaleString()}`} accent="primary" />
              <MiniStat icon={Crosshair} label="Kills/jogo" value={agg.k} accent="gold" />
              <MiniStat icon={Trophy} label="Assists/jogo" value={agg.a} accent="primary" />
              <MiniStat icon={BarChart3} label="Jogos" value={agg.games} accent="primary" />
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
              <Card className="p-5 border-border shadow-card">
                <h3 className="font-display text-lg tracking-wider mb-3">EVOLUÇÃO DE KDA</h3>
                {timeline.length === 0 ? (
                  <div className="text-xs text-muted-foreground py-8 text-center">Sem dados.</div>
                ) : (
                  <Suspense fallback={<div className="h-64" />}>
                    <KdaChart data={timeline} />
                  </Suspense>
                )}
              </Card>

              <Card className="p-5 border-border shadow-card">
                <h3 className="font-display text-lg tracking-wider mb-3">TOP POKÉMON</h3>
                {top.length === 0 ? (
                  <div className="text-xs text-muted-foreground py-8 text-center">Sem dados.</div>
                ) : (
                  <div className="space-y-2">
                    {top.map((t) => (
                      <div key={t.pokemon} className="flex items-center gap-3 p-2 border border-border rounded-md">
                        <div className="h-10 w-10 shrink-0"><PokemonImage name={t.pokemon} withRoleBg /></div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">{t.pokemon}</div>
                          <div className="text-xs text-muted-foreground">{t.count} {t.count === 1 ? "jogo" : "jogos"} · {t.wins}V {t.losses}D</div>
                        </div>
                        {t.winrate !== null ? (
                          <Badge variant="outline" className={t.winrate >= 50 ? "border-gold/40 text-gold" : "border-destructive/40 text-destructive"}>
                            {t.winrate}% WR
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-border text-muted-foreground">—</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: any;
  label: string;
  value: string | number;
  hint?: string;
  accent: "gold" | "primary";
}) {
  const color = accent === "gold" ? "text-gold" : "text-primary";
  return (
    <Card className="p-4 border-border shadow-card">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
          <div className={`font-display text-2xl mt-1 leading-none ${color}`}>{value}</div>
          {hint && <div className="text-[10px] text-muted-foreground mt-1.5">{hint}</div>}
        </div>
        <Icon className={`h-5 w-5 opacity-50 ${color}`} />
      </div>
    </Card>
  );
}

function InfoItem({ icon: Icon, label, value, mono }: { icon: any; label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className={`mt-1 text-sm text-foreground/90 truncate ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}
