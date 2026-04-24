import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_TEAM_ID } from "@/lib/default-team";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Plus, Save, Trash2, Crown } from "lucide-react";
import { toast } from "sonner";
import { type PerfRow } from "@/lib/player-stats";
import { PokemonPicker } from "@/components/PokemonPicker";
import { MatchResultsView } from "@/components/scouting/MatchResultsView";
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

function emptyAlly(game: number, memberId = "", pokemon = ""): AllyForm {
  return {
    member_id: memberId, game_number: game, pokemon,
    kills: 0, deaths: 0, assists: 0, score: 0,
    damage_dealt: 0, damage_taken: 0, healing: 0, is_mvp: false,
  };
}
function emptyOpp(scrimId: string, opponentId: string | null, game: number, playerName = "", pokemon: string | null = null): OppForm {
  return {
    scrim_id: scrimId, opponent_id: opponentId, game_number: game,
    player_name: playerName, pokemon,
    kills: 0, assists: 0, score: 0,
    damage_dealt: 0, damage_taken: 0, healing: 0,
    rating: null, notes: null,
  };
}

function normalizeKnownPlayers(raw: any[] | null | undefined): KnownPlayer[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((p) => {
      if (typeof p === "string") return { name: p } as KnownPlayer;
      if (p && typeof p === "object" && p.name) {
        return { name: p.name, lane: p.lane ?? null, pokemon: p.pokemon ?? p.main_pokemon ?? null, notes: p.notes ?? null };
      }
      return null;
    })
    .filter(Boolean) as KnownPlayer[];
}

export function PerformanceDialog({
  scrimId,
  open,
  onOpenChange,
  bestOf,
  opponentId = null,
  opponentName = "",
  status = "scheduled",
}: {
  scrimId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  bestOf: number;
  opponentId?: string | null;
  opponentName?: string;
  status?: "scheduled" | "completed" | "cancelled";
}) {
  const qc = useQueryClient();
  const [allies, setAllies] = useState<AllyForm[]>([]);
  const [opps, setOpps] = useState<OppForm[]>([]);
  const [game, setGame] = useState(1);

  const { data: members = [] } = useQuery({
    queryKey: ["members-starters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members").select("id, name, ign, role, lane, main_pokemon")
        .eq("role", "player").order("name");
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

  const knownPlayers = useMemo(() => normalizeKnownPlayers(opponent?.known_players), [opponent]);
  const knownPlayerNames = useMemo(() => knownPlayers.map((p) => p.name), [knownPlayers]);

  // Auto-populate allies for the current game with starting roster if no rows exist yet.
  useEffect(() => {
    if (!open) return;
    const existing = allyExisting.filter((e) => e.game_number === game);
    if (existing.length > 0) {
      setAllies(
        existing.map((e) => ({
          id: e.id, member_id: e.member_id, game_number: e.game_number,
          pokemon: e.pokemon ?? "",
          kills: e.kills, deaths: e.deaths, assists: e.assists,
          score: e.score, damage_dealt: e.damage_dealt,
          damage_taken: e.damage_taken, healing: e.healing, is_mvp: e.is_mvp,
        })),
      );
    } else if (members.length > 0) {
      setAllies(members.map((m) => emptyAlly(game, m.id, m.main_pokemon ?? "")));
    } else {
      setAllies([]);
    }
  }, [game, allyExisting, members, open]);

  // Auto-populate opponents with known players if no rows exist yet.
  useEffect(() => {
    if (!open) return;
    const existing = oppExisting.filter((e) => e.game_number === game);
    if (existing.length > 0) {
      setOpps(existing);
    } else if (knownPlayers.length > 0) {
      setOpps(knownPlayers.map((p) => emptyOpp(scrimId, opponentId, game, p.name, p.pokemon ?? null)));
    } else {
      setOpps([]);
    }
  }, [game, oppExisting, knownPlayers, open, scrimId, opponentId]);

  const allyTotal = useMemo(() => allies.reduce((sum, r) => sum + (Number(r.score) || 0), 0), [allies]);
  const oppTotal = useMemo(() => opps.reduce((sum, r) => sum + (Number(r.score) || 0), 0), [opps]);
  const allyWon = allyTotal > oppTotal && (allyTotal > 0 || oppTotal > 0);
  const oppWon = oppTotal > allyTotal && (allyTotal > 0 || oppTotal > 0);

  const saveAllies = useMutation({
    mutationFn: async () => {
      const valid = allies.filter((r) => r.member_id);
      if (!valid.length) return;
      const payload = valid.map((r) => ({
        ...r, scrim_id: scrimId, pokemon: r.pokemon || null, team_id: DEFAULT_TEAM_ID,
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

  async function recalcScrimScore() {
    const [{ data: allyRows, error: e1 }, { data: oppRows, error: e2 }] = await Promise.all([
      supabase.from("match_performances").select("game_number, score").eq("scrim_id", scrimId),
      supabase.from("opponent_performances").select("game_number, score").eq("scrim_id", scrimId),
    ]);
    if (e1 || e2) return;
    const allyByGame = new Map<number, number>();
    const oppByGame = new Map<number, number>();
    (allyRows ?? []).forEach((r: any) => allyByGame.set(r.game_number, (allyByGame.get(r.game_number) ?? 0) + (r.score ?? 0)));
    (oppRows ?? []).forEach((r: any) => oppByGame.set(r.game_number, (oppByGame.get(r.game_number) ?? 0) + (r.score ?? 0)));
    let usWins = 0;
    let themWins = 0;
    const allGames = new Set<number>([...allyByGame.keys(), ...oppByGame.keys()]);
    const gameResults: { game: number; result: "win" | "loss" | "pending" }[] = [];
    allGames.forEach((g) => {
      const a = allyByGame.get(g) ?? 0;
      const o = oppByGame.get(g) ?? 0;
      if (a === 0 && o === 0) {
        gameResults.push({ game: g, result: "pending" });
        return;
      }
      if (a > o) { usWins += 1; gameResults.push({ game: g, result: "win" }); }
      else if (o > a) { themWins += 1; gameResults.push({ game: g, result: "loss" }); }
      else gameResults.push({ game: g, result: "pending" });
    });
    // Persistir resultado em cada match_performance do game
    await Promise.all(
      gameResults.map((gr) =>
        supabase
          .from("match_performances")
          .update({ result: gr.result })
          .eq("scrim_id", scrimId)
          .eq("game_number", gr.game),
      ),
    );
    await supabase.from("scrims").update({ score_us: usWins, score_them: themWins }).eq("id", scrimId);
    qc.invalidateQueries({ queryKey: ["scrims"] });
    qc.invalidateQueries({ queryKey: ["perfs-scrim", scrimId] });
    qc.invalidateQueries({ queryKey: ["perfs"] });
  }

  async function saveAll() {
    await Promise.all([saveAllies.mutateAsync(), saveOpps.mutateAsync()]);
    await recalcScrimScore();
    toast.success(`Jogo ${game} salvo`);
  }

  if (status === "completed") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="font-display text-2xl tracking-wider">Resultado da partida</DialogTitle>
            <DialogDescription>
              Amistoso concluído — visualização das estatísticas finais.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-6 mt-4">
            <MatchResultsView scrimId={scrimId} bestOf={bestOf} opponentName={opponentName} />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="font-display text-2xl tracking-wider">Estatísticas da partida</DialogTitle>
          <DialogDescription>
            Pontos somados automaticamente. Titulares e oponentes conhecidos são pré-preenchidos.
          </DialogDescription>
        </DialogHeader>

        {/* Game selector */}
        <div className="flex items-center gap-2 flex-wrap px-6">
          {games.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGame(g)}
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

        <div className="px-6 pb-6 mt-4 space-y-4">
          {/* Ally section */}
          <SideColumn
            label="NOSSO TIME"
            accent="primary"
            won={allyWon}
            total={allyTotal}
            addLabel="Adicionar jogador"
            onAdd={() => setAllies((r) => [...r, emptyAlly(game)])}
            hint={members.length === 0 ? "Cadastre titulares no roster para preenchimento automático." : undefined}
          >
            {allies.map((row, i) => (
              <AllyRow
                key={row.id ?? `new-${i}`}
                row={row}
                members={members}
                onChange={(patch) => setAllies((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))}
                onRemove={() => {
                  if (row.id) removeAlly.mutate(row.id);
                  setAllies((rs) => rs.filter((_, idx) => idx !== i));
                }}
              />
            ))}
          </SideColumn>

          {/* Opponent section */}
          <SideColumn
            label={(opponentName || "OPONENTE").toUpperCase()}
            accent="destructive"
            won={oppWon}
            total={oppTotal}
            addLabel="Adicionar oponente"
            onAdd={() => setOpps((r) => [...r, emptyOpp(scrimId, opponentId, game)])}
            hint={!opponentId ? "Vincule este amistoso a um oponente cadastrado para sugerir jogadores." : knownPlayers.length === 0 ? "Adicione jogadores conhecidos no cadastro do oponente para preenchimento automático." : undefined}
          >
            {opps.map((row, i) => (
              <OppRow
                key={row.id ?? `new-${i}`}
                row={row}
                knownPlayers={knownPlayerNames}
                onChange={(patch) => setOpps((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))}
                onRemove={() => {
                  if (row.id) removeOpp.mutate(row.id);
                  setOpps((rs) => rs.filter((_, idx) => idx !== i));
                }}
              />
            ))}
          </SideColumn>
        </div>

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
  label, accent, won, total, children, addLabel, onAdd, hint,
}: {
  label: string;
  accent: "primary" | "destructive";
  won: boolean;
  total: number;
  children: React.ReactNode;
  addLabel: string;
  onAdd: () => void;
  hint?: string;
}) {
  const accentClass = accent === "primary" ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive";
  return (
    <div className="rounded-md border border-border overflow-hidden">
      <div className={cn(
        "px-3 py-2 flex items-center justify-between font-display",
        accentClass,
        won && "ring-1 ring-inset ring-current",
      )}>
        <span className="text-xs uppercase tracking-widest truncate">{label}</span>
        <span className="text-xl tabular-nums">{total}</span>
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

function NumInput({
  value, onChange, placeholder,
}: { value: number; onChange: (n: number) => void; placeholder?: string }) {
  return (
    <Input
      type="number"
      inputMode="numeric"
      min={0}
      value={value || ""}
      placeholder={placeholder ?? "0"}
      onChange={(e) => {
        const v = e.target.value;
        if (v === "") return onChange(0);
        const n = Number(v);
        onChange(Number.isFinite(n) ? n : 0);
      }}
      className="h-9 text-sm tabular-nums px-2"
    />
  );
}

function StatField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <Label className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function AllyRow({
  row, members, onChange, onRemove,
}: {
  row: AllyForm;
  members: Member[];
  onChange: (patch: Partial<AllyForm>) => void;
  onRemove: () => void;
}) {
  const rowKey = row.id ?? `new-${row.member_id || Math.random()}`;
  return (
    <Card className="p-3 border-border hover:border-primary/40 transition-colors space-y-2.5">
      {/* Identity row */}
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <Select value={row.member_id} onValueChange={(v) => onChange({ member_id: v })}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Selecione jogador" />
            </SelectTrigger>
            <SelectContent>
              {members.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}{m.ign ? ` (${m.ign})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-[200px] shrink-0">
          <PokemonPicker value={row.pokemon || null} onChange={(name) => onChange({ pokemon: name ?? "" })} />
        </div>
        <label className="flex items-center gap-1.5 px-2 cursor-pointer shrink-0" htmlFor={`mvp-${rowKey}`}>
          <Checkbox
            id={`mvp-${rowKey}`}
            checked={row.is_mvp}
            onCheckedChange={(v) => onChange({ is_mvp: !!v })}
          />
          <Crown className={cn("h-4 w-4", row.is_mvp ? "text-gold" : "text-muted-foreground")} />
        </label>
        <Button size="icon" variant="ghost" onClick={onRemove} className="hover:text-destructive h-9 w-9 shrink-0">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      {/* Stats grid — all visible at once */}
      <div className="grid grid-cols-6 gap-2">
        <StatField label="Score">
          <NumInput value={row.score} onChange={(n) => onChange({ score: n })} />
        </StatField>
        <StatField label="Kills">
          <NumInput value={row.kills} onChange={(n) => onChange({ kills: n })} />
        </StatField>
        <StatField label="Assist.">
          <NumInput value={row.assists} onChange={(n) => onChange({ assists: n })} />
        </StatField>
        <StatField label="Dano">
          <NumInput value={row.damage_dealt} onChange={(n) => onChange({ damage_dealt: n })} />
        </StatField>
        <StatField label="Sofrido">
          <NumInput value={row.damage_taken} onChange={(n) => onChange({ damage_taken: n })} />
        </StatField>
        <StatField label="Cura">
          <NumInput value={row.healing} onChange={(n) => onChange({ healing: n })} />
        </StatField>
      </div>
    </Card>
  );
}

function OppRow({
  row, knownPlayers, onChange, onRemove,
}: {
  row: OppForm;
  knownPlayers: string[];
  onChange: (patch: Partial<OppForm>) => void;
  onRemove: () => void;
}) {
  const rowKey = row.id ?? `new-${row.player_name || Math.random()}`;
  return (
    <Card className="p-3 border-border hover:border-destructive/40 transition-colors space-y-2.5">
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <Input
            value={row.player_name}
            onChange={(e) => onChange({ player_name: e.target.value })}
            placeholder="Nome do oponente"
            list={knownPlayers.length ? `kp-${rowKey}` : undefined}
            className="h-9 text-sm"
          />
          {knownPlayers.length > 0 && (
            <datalist id={`kp-${rowKey}`}>
              {knownPlayers.map((p) => <option key={p} value={p} />)}
            </datalist>
          )}
        </div>
        <div className="w-[200px] shrink-0">
          <PokemonPicker value={row.pokemon} onChange={(name) => onChange({ pokemon: name })} />
        </div>
        <div className="w-[80px] shrink-0">
          <Input
            type="number" min={0} max={10} step={0.1}
            value={row.rating ?? ""}
            placeholder="Nota"
            onChange={(e) => {
              const v = e.target.value;
              onChange({ rating: v === "" ? null : Math.max(0, Math.min(10, Number(v))) });
            }}
            className="h-9 text-sm tabular-nums px-2 text-center"
          />
        </div>
        <Button size="icon" variant="ghost" onClick={onRemove} className="hover:text-destructive h-9 w-9 shrink-0">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="grid grid-cols-6 gap-2">
        <StatField label="Score">
          <NumInput value={row.score} onChange={(n) => onChange({ score: n })} />
        </StatField>
        <StatField label="Kills">
          <NumInput value={row.kills} onChange={(n) => onChange({ kills: n })} />
        </StatField>
        <StatField label="Assist.">
          <NumInput value={row.assists} onChange={(n) => onChange({ assists: n })} />
        </StatField>
        <StatField label="Dano">
          <NumInput value={row.damage_dealt} onChange={(n) => onChange({ damage_dealt: n })} />
        </StatField>
        <StatField label="Sofrido">
          <NumInput value={row.damage_taken} onChange={(n) => onChange({ damage_taken: n })} />
        </StatField>
        <StatField label="Cura">
          <NumInput value={row.healing} onChange={(n) => onChange({ healing: n })} />
        </StatField>
      </div>
    </Card>
  );
}
