import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Save, Trash2, Crown, Edit3 } from "lucide-react";
import { toast } from "sonner";
import { type PerfRow } from "@/lib/player-stats";
import { PokemonPicker } from "@/components/PokemonPicker";
import { PokemonImage } from "@/components/PokemonImage";
import { cn } from "@/lib/utils";

type Member = { id: string; name: string; ign: string | null; role: string; lane: string | null; main_pokemon: string | null };
type KnownPlayer = { name: string; lane?: string | null; pokemon?: string | null; notes?: string | null };

type AllyForm = {
  id?: string;
  member_id: string;
  game_number: number;
  pokemon: string;
  kills: number;
  deaths: number;
  assists: number;
  score: number;
  damage_dealt: number;
  damage_taken: number;
  healing: number;
  is_mvp: boolean;
};

type OppForm = {
  id?: string;
  scrim_id: string;
  opponent_id: string | null;
  game_number: number;
  player_name: string;
  pokemon: string | null;
  kills: number;
  assists: number;
  score: number;
  damage_dealt: number;
  damage_taken: number;
  healing: number;
  rating: number | null;
  notes: string | null;
};

type OpponentDetail = { id: string; name: string; known_players: any[] | null };

function emptyAlly(game: number): AllyForm {
  return {
    member_id: "", game_number: game, pokemon: "",
    kills: 0, deaths: 0, assists: 0, score: 0,
    damage_dealt: 0, damage_taken: 0, healing: 0, is_mvp: false,
  };
}
function emptyOpp(scrimId: string, opponentId: string | null, game: number): OppForm {
  return {
    scrim_id: scrimId, opponent_id: opponentId, game_number: game,
    player_name: "", pokemon: null,
    kills: 0, assists: 0, score: 0,
    damage_dealt: 0, damage_taken: 0, healing: 0,
    rating: null, notes: null,
  };
}

export function PerformanceDialog({
  scrimId,
  open,
  onOpenChange,
  bestOf,
  opponentId = null,
  opponentName = "",
}: {
  scrimId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  bestOf: number;
  opponentId?: string | null;
  opponentName?: string;
}) {
  const qc = useQueryClient();
  const [allies, setAllies] = useState<AllyForm[]>([]);
  const [opps, setOpps] = useState<OppForm[]>([]);
  const [game, setGame] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingSide, setEditingSide] = useState<"ally" | "opp" | null>(null);

  const { data: members = [] } = useQuery({
    queryKey: ["members-min"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members").select("id, name, ign, role")
        .in("role", ["player", "substitute"]).order("name");
      if (error) throw error;
      return data as Member[];
    },
    enabled: open,
  });

  const { data: opponent } = useQuery({
    queryKey: ["opponent-detail", opponentId],
    queryFn: async () => {
      if (!opponentId) return null;
      const { data, error } = await supabase
        .from("opponents").select("id, name, known_players")
        .eq("id", opponentId).maybeSingle();
      if (error) throw error;
      return data as OpponentDetail | null;
    },
    enabled: open && !!opponentId,
  });

  const { data: allyExisting = [] } = useQuery({
    queryKey: ["perfs-scrim", scrimId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_performances").select("*").eq("scrim_id", scrimId).order("game_number");
      if (error) throw error;
      return data as PerfRow[];
    },
    enabled: open,
  });

  const { data: oppExisting = [] } = useQuery({
    queryKey: ["opp-perfs-scrim", scrimId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("opponent_performances").select("*").eq("scrim_id", scrimId).order("game_number");
      if (error) throw error;
      return data as OppForm[];
    },
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    setAllies(
      allyExisting.filter((e) => e.game_number === game).map((e) => ({
        id: e.id, member_id: e.member_id, game_number: e.game_number,
        pokemon: e.pokemon ?? "",
        kills: e.kills, deaths: e.deaths, assists: e.assists,
        score: e.score, damage_dealt: e.damage_dealt,
        damage_taken: e.damage_taken, healing: e.healing, is_mvp: e.is_mvp,
      })),
    );
  }, [game, allyExisting, open]);

  useEffect(() => {
    if (!open) return;
    setOpps(oppExisting.filter((e) => e.game_number === game));
  }, [game, oppExisting, open]);

  const knownPlayers: string[] = Array.isArray(opponent?.known_players)
    ? (opponent!.known_players as any[]).map((p) => (typeof p === "string" ? p : p?.name)).filter(Boolean)
    : [];

  const allyTotal = useMemo(() => allies.reduce((sum, r) => sum + (Number(r.score) || 0), 0), [allies]);
  const oppTotal = useMemo(() => opps.reduce((sum, r) => sum + (Number(r.score) || 0), 0), [opps]);
  const allyWon = allyTotal > oppTotal && (allyTotal > 0 || oppTotal > 0);
  const oppWon = oppTotal > allyTotal && (allyTotal > 0 || oppTotal > 0);

  const saveAllies = useMutation({
    mutationFn: async () => {
      const valid = allies.filter((r) => r.member_id);
      if (!valid.length) return;
      const payload = valid.map((r) => ({
        ...r, scrim_id: scrimId, pokemon: r.pokemon || null,
      }));
      const { error } = await supabase.from("match_performances").upsert(payload, {
        onConflict: "scrim_id,member_id,game_number",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["perfs-scrim", scrimId] });
      qc.invalidateQueries({ queryKey: ["perfs"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const saveOpps = useMutation({
    mutationFn: async () => {
      const valid = opps.filter((r) => r.player_name.trim());
      if (!valid.length) return;
      const inserts = valid.filter((r) => !r.id);
      const updates = valid.filter((r) => r.id);
      if (inserts.length) {
        const { error } = await supabase.from("opponent_performances").insert(
          inserts.map(({ id: _id, ...r }) => ({ ...r, opponent_id: opponentId, scrim_id: scrimId, game_number: game })),
        );
        if (error) throw error;
      }
      for (const u of updates) {
        const { id, ...rest } = u;
        const { error } = await supabase.from("opponent_performances").update(rest).eq("id", id!);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["opp-perfs-scrim", scrimId] }),
    onError: (e: any) => toast.error(e.message),
  });

  const removeAlly = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("match_performances").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["perfs-scrim", scrimId] });
      qc.invalidateQueries({ queryKey: ["perfs"] });
    },
  });
  const removeOpp = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("opponent_performances").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["opp-perfs-scrim", scrimId] }),
  });

  const games = Array.from({ length: bestOf }, (_, i) => i + 1);

  async function saveAll() {
    await Promise.all([saveAllies.mutateAsync(), saveOpps.mutateAsync()]);
    setEditingId(null);
    setEditingSide(null);
    toast.success(`Jogo ${game} salvo`);
  }

  function startEdit(side: "ally" | "opp", id: string) {
    setEditingSide(side);
    setEditingId(id);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="font-display text-2xl tracking-wider">Estatísticas da partida</DialogTitle>
          <DialogDescription>
            Pontos somados automaticamente. Edite jogador a jogador clicando no lápis.
          </DialogDescription>
        </DialogHeader>

        {/* Game selector */}
        <div className="flex items-center gap-2 flex-wrap px-6">
          {games.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => { setGame(g); setEditingId(null); setEditingSide(null); }}
              className={cn(
                "px-3 py-1.5 text-xs uppercase tracking-wider rounded-md border",
                game === g
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              Jogo {g}
            </button>
          ))}
        </div>

        {/* Score banner */}
        <div className="grid grid-cols-2 gap-px bg-border mx-6 mt-4 rounded-md overflow-hidden">
          <div className={cn(
            "px-4 py-3 flex items-center justify-between",
            allyWon ? "bg-primary/20" : "bg-card",
          )}>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Nosso time</div>
              <div className={cn("font-display text-lg tracking-wider", allyWon && "text-primary")}>
                {allyWon ? "VITÓRIA" : oppWon ? "DERROTA" : "—"}
              </div>
            </div>
            <div className="font-display text-4xl text-primary tabular-nums">{allyTotal}</div>
          </div>
          <div className={cn(
            "px-4 py-3 flex items-center justify-between",
            oppWon ? "bg-destructive/20" : "bg-card",
          )}>
            <div className="font-display text-4xl text-destructive tabular-nums">{oppTotal}</div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{opponentName || "Oponente"}</div>
              <div className={cn("font-display text-lg tracking-wider", oppWon && "text-destructive")}>
                {oppWon ? "VITÓRIA" : allyWon ? "DERROTA" : "—"}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="details" className="w-full px-6 pb-6 mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details" className="uppercase tracking-wider text-xs">Detalhes</TabsTrigger>
            <TabsTrigger value="battle" className="uppercase tracking-wider text-xs">Dados de batalha</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Ally column */}
              <SideColumn
                label="VITÓRIA"
                accent="primary"
                won={allyWon}
                addLabel="Adicionar jogador"
                onAdd={() => setAllies((r) => [...r, emptyAlly(game)])}
              >
                {allies.map((row, i) => (
                  <AllyRow
                    key={row.id ?? `new-${i}`}
                    row={row}
                    members={members}
                    isEditing={editingSide === "ally" && editingId === (row.id ?? `new-${i}`)}
                    mode="details"
                    onEdit={() => startEdit("ally", row.id ?? `new-${i}`)}
                    onChange={(patch) => setAllies((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))}
                    onRemove={() => {
                      if (row.id) removeAlly.mutate(row.id);
                      setAllies((rs) => rs.filter((_, idx) => idx !== i));
                    }}
                  />
                ))}
              </SideColumn>

              {/* Opponent column */}
              <SideColumn
                label="DERROTA"
                accent="destructive"
                won={oppWon}
                addLabel="Adicionar oponente"
                onAdd={() => setOpps((r) => [...r, emptyOpp(scrimId, opponentId, game)])}
                disabled={!opponentId && opps.length === 0 ? false : false}
                hint={!opponentId ? "Vincule este amistoso a um oponente cadastrado para sugerir jogadores." : undefined}
              >
                {opps.map((row, i) => (
                  <OppRow
                    key={row.id ?? `new-${i}`}
                    row={row}
                    knownPlayers={knownPlayers}
                    isEditing={editingSide === "opp" && editingId === (row.id ?? `new-${i}`)}
                    mode="details"
                    onEdit={() => startEdit("opp", row.id ?? `new-${i}`)}
                    onChange={(patch) => setOpps((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))}
                    onRemove={() => {
                      if (row.id) removeOpp.mutate(row.id);
                      setOpps((rs) => rs.filter((_, idx) => idx !== i));
                    }}
                  />
                ))}
              </SideColumn>
            </div>
          </TabsContent>

          <TabsContent value="battle" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <SideColumn
                label="VITÓRIA"
                accent="primary"
                won={allyWon}
                addLabel="Adicionar jogador"
                onAdd={() => setAllies((r) => [...r, emptyAlly(game)])}
              >
                {allies.map((row, i) => (
                  <AllyRow
                    key={row.id ?? `new-${i}`}
                    row={row}
                    members={members}
                    isEditing={editingSide === "ally" && editingId === (row.id ?? `new-${i}`)}
                    mode="battle"
                    onEdit={() => startEdit("ally", row.id ?? `new-${i}`)}
                    onChange={(patch) => setAllies((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))}
                    onRemove={() => {
                      if (row.id) removeAlly.mutate(row.id);
                      setAllies((rs) => rs.filter((_, idx) => idx !== i));
                    }}
                  />
                ))}
              </SideColumn>

              <SideColumn
                label="DERROTA"
                accent="destructive"
                won={oppWon}
                addLabel="Adicionar oponente"
                onAdd={() => setOpps((r) => [...r, emptyOpp(scrimId, opponentId, game)])}
              >
                {opps.map((row, i) => (
                  <OppRow
                    key={row.id ?? `new-${i}`}
                    row={row}
                    knownPlayers={knownPlayers}
                    isEditing={editingSide === "opp" && editingId === (row.id ?? `new-${i}`)}
                    mode="battle"
                    onEdit={() => startEdit("opp", row.id ?? `new-${i}`)}
                    onChange={(patch) => setOpps((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))}
                    onRemove={() => {
                      if (row.id) removeOpp.mutate(row.id);
                      setOpps((rs) => rs.filter((_, idx) => idx !== i));
                    }}
                  />
                ))}
              </SideColumn>
            </div>
          </TabsContent>
        </Tabs>

        <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-border bg-background/95 backdrop-blur px-6 py-3">
          <Button
            onClick={saveAll}
            disabled={saveAllies.isPending || saveOpps.isPending}
            className="bg-gradient-primary shadow-glow uppercase tracking-wider"
          >
            <Save className="h-4 w-4 mr-2" />
            {saveAllies.isPending || saveOpps.isPending ? "Salvando..." : `Salvar Jogo ${game}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SideColumn({
  label, accent, won, children, addLabel, onAdd, hint,
}: {
  label: string;
  accent: "primary" | "destructive";
  won: boolean;
  children: React.ReactNode;
  addLabel: string;
  onAdd: () => void;
  disabled?: boolean;
  hint?: string;
}) {
  const accentClass = accent === "primary" ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive";
  return (
    <div className="rounded-md border border-border overflow-hidden">
      <div className={cn("px-3 py-1.5 text-xs uppercase tracking-widest font-display", accentClass, won && "ring-1 ring-inset ring-current")}>
        {label}
      </div>
      <div className="p-2 space-y-2 bg-card/40">
        {hint && <p className="text-[10px] text-muted-foreground italic px-1">{hint}</p>}
        {children}
        <Button type="button" size="sm" variant="outline" className="w-full" onClick={onAdd}>
          <Plus className="h-3.5 w-3.5 mr-1.5" /> {addLabel}
        </Button>
      </div>
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="text-center">
      <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="font-display text-base tabular-nums">{value}</div>
    </div>
  );
}

function AllyRow({
  row, members, isEditing, mode, onEdit, onChange, onRemove,
}: {
  row: AllyForm;
  members: Member[];
  isEditing: boolean;
  mode: "details" | "battle";
  onEdit: () => void;
  onChange: (patch: Partial<AllyForm>) => void;
  onRemove: () => void;
}) {
  const member = members.find((m) => m.id === row.member_id);
  const displayName = member?.name ?? "Selecione";

  if (isEditing) {
    return (
      <Card className="p-3 border-primary/40 bg-card">
        <div className="grid grid-cols-12 gap-2 items-end">
          <div className="col-span-4">
            <Label className="text-[10px] uppercase tracking-widest">Jogador</Label>
            <Select value={row.member_id} onValueChange={(v) => onChange({ member_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}{m.ign ? ` (${m.ign})` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-4">
            <Label className="text-[10px] uppercase tracking-widest">Pokémon</Label>
            <PokemonPicker value={row.pokemon || null} onChange={(name) => onChange({ pokemon: name ?? "" })} />
          </div>
          <div className="col-span-3 flex items-center gap-1">
            <Checkbox checked={row.is_mvp} onCheckedChange={(v) => onChange({ is_mvp: !!v })} id={`mvp-${row.id ?? row.member_id}`} />
            <Label htmlFor={`mvp-${row.id ?? row.member_id}`} className="text-[10px] uppercase tracking-widest">MVP</Label>
          </div>
          <div className="col-span-1 flex justify-end">
            <Button size="icon" variant="ghost" onClick={onRemove} className="hover:text-destructive h-8 w-8">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-12 gap-2 mt-2">
          <NumField label="Score" value={row.score} onChange={(n) => onChange({ score: n })} colSpan={3} />
          <NumField label="K" value={row.kills} onChange={(n) => onChange({ kills: n })} colSpan={2} />
          <NumField label="A" value={row.assists} onChange={(n) => onChange({ assists: n })} colSpan={2} />
          <NumField label="Dano" value={row.damage_dealt} onChange={(n) => onChange({ damage_dealt: n })} colSpan={2} />
          <NumField label="Sofrido" value={row.damage_taken} onChange={(n) => onChange({ damage_taken: n })} colSpan={2} />
          <NumField label="Cura" value={row.healing} onChange={(n) => onChange({ healing: n })} colSpan={1} />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-2 border-border hover:border-primary/40 transition-colors">
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 shrink-0">
          <PokemonImage name={row.pokemon || null} withRoleBg />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="font-medium text-sm truncate">{displayName}</span>
            {row.is_mvp && <Crown className="h-3.5 w-3.5 text-gold shrink-0" />}
          </div>
        </div>
        {mode === "details" ? (
          <div className="grid grid-cols-4 gap-3 shrink-0">
            <StatCell label="Score" value={row.score} />
            <StatCell label="K" value={row.kills} />
            <StatCell label="A" value={row.assists} />
            <StatCell label="MVP" value={row.is_mvp ? "★" : "—"} />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 shrink-0">
            <StatCell label="Dano" value={row.damage_dealt.toLocaleString()} />
            <StatCell label="Sofrido" value={row.damage_taken.toLocaleString()} />
            <StatCell label="Cura" value={row.healing.toLocaleString()} />
          </div>
        )}
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onEdit}>
          <Edit3 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </Card>
  );
}

function OppRow({
  row, knownPlayers, isEditing, mode, onEdit, onChange, onRemove,
}: {
  row: OppForm;
  knownPlayers: string[];
  isEditing: boolean;
  mode: "details" | "battle";
  onEdit: () => void;
  onChange: (patch: Partial<OppForm>) => void;
  onRemove: () => void;
}) {
  if (isEditing) {
    return (
      <Card className="p-3 border-destructive/40 bg-card">
        <div className="grid grid-cols-12 gap-2 items-end">
          <div className="col-span-4">
            <Label className="text-[10px] uppercase tracking-widest">Jogador</Label>
            {knownPlayers.length > 0 && knownPlayers.includes(row.player_name) ? (
              <Select value={row.player_name} onValueChange={(v) => onChange({ player_name: v === "__custom" ? "" : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {knownPlayers.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  <SelectItem value="__custom">Outro...</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={row.player_name}
                onChange={(e) => onChange({ player_name: e.target.value })}
                placeholder="Nome"
                list={knownPlayers.length ? `kp-${row.id ?? "new"}` : undefined}
              />
            )}
            {knownPlayers.length > 0 && (
              <datalist id={`kp-${row.id ?? "new"}`}>
                {knownPlayers.map((p) => <option key={p} value={p} />)}
              </datalist>
            )}
          </div>
          <div className="col-span-4">
            <Label className="text-[10px] uppercase tracking-widest">Pokémon</Label>
            <PokemonPicker value={row.pokemon} onChange={(name) => onChange({ pokemon: name })} />
          </div>
          <div className="col-span-3">
            <Label className="text-[10px] uppercase tracking-widest">Nota (0-10)</Label>
            <Input
              type="number" min={0} max={10} step={0.1}
              value={row.rating ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                onChange({ rating: v === "" ? null : Math.max(0, Math.min(10, Number(v))) });
              }}
            />
          </div>
          <div className="col-span-1 flex justify-end">
            <Button size="icon" variant="ghost" onClick={onRemove} className="hover:text-destructive h-8 w-8">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-12 gap-2 mt-2">
          <NumField label="Score" value={row.score} onChange={(n) => onChange({ score: n })} colSpan={3} />
          <NumField label="K" value={row.kills} onChange={(n) => onChange({ kills: n })} colSpan={2} />
          <NumField label="A" value={row.assists} onChange={(n) => onChange({ assists: n })} colSpan={2} />
          <NumField label="Dano" value={row.damage_dealt} onChange={(n) => onChange({ damage_dealt: n })} colSpan={2} />
          <NumField label="Sofrido" value={row.damage_taken} onChange={(n) => onChange({ damage_taken: n })} colSpan={2} />
          <NumField label="Cura" value={row.healing} onChange={(n) => onChange({ healing: n })} colSpan={1} />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-2 border-border hover:border-destructive/40 transition-colors">
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 shrink-0">
          <PokemonImage name={row.pokemon} withRoleBg />
        </div>
        <div className="flex-1 min-w-0">
          <span className="font-medium text-sm truncate">{row.player_name || "Sem nome"}</span>
        </div>
        {mode === "details" ? (
          <div className="grid grid-cols-4 gap-3 shrink-0">
            <StatCell label="Score" value={row.score} />
            <StatCell label="K" value={row.kills} />
            <StatCell label="A" value={row.assists} />
            <StatCell label="Nota" value={row.rating ?? "—"} />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 shrink-0">
            <StatCell label="Dano" value={row.damage_dealt.toLocaleString()} />
            <StatCell label="Sofrido" value={row.damage_taken.toLocaleString()} />
            <StatCell label="Cura" value={row.healing.toLocaleString()} />
          </div>
        )}
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onEdit}>
          <Edit3 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </Card>
  );
}

function NumField({
  label, value, onChange, colSpan = 1,
}: { label: string; value: number; onChange: (n: number) => void; colSpan?: number }) {
  return (
    <div className={`col-span-${colSpan}`}>
      <Label className="text-[10px] uppercase tracking-widest">{label}</Label>
      <Input
        type="number" min={0} value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          onChange(Number.isFinite(n) ? n : 0);
        }}
      />
    </div>
  );
}
