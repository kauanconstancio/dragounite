import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Save, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { PokemonPicker } from "@/components/PokemonPicker";

type OppPerf = {
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

type Opponent = {
  id: string;
  name: string;
  known_players: any[] | null;
};

function emptyRow(scrimId: string, opponentId: string | null, game: number): OppPerf {
  return {
    scrim_id: scrimId,
    opponent_id: opponentId,
    game_number: game,
    player_name: "",
    pokemon: null,
    kills: 0,
    assists: 0,
    score: 0,
    damage_dealt: 0,
    damage_taken: 0,
    healing: 0,
    rating: null,
    notes: null,
  };
}

export function OpponentPerformanceSection({
  scrimId,
  opponentId,
  opponentName,
  game,
}: {
  scrimId: string;
  opponentId: string | null;
  opponentName: string;
  game: number;
}) {
  const qc = useQueryClient();
  const [rows, setRows] = useState<OppPerf[]>([]);

  const { data: opponent } = useQuery({
    queryKey: ["opponent-detail", opponentId],
    queryFn: async () => {
      if (!opponentId) return null;
      const { data, error } = await supabase.from("opponents").select("id, name, known_players").eq("id", opponentId).maybeSingle();
      if (error) throw error;
      return data as Opponent | null;
    },
    enabled: !!opponentId,
  });

  const { data: existing = [] } = useQuery({
    queryKey: ["opp-perfs-scrim", scrimId],
    queryFn: async () => {
      const { data, error } = await supabase.from("opponent_performances").select("*").eq("scrim_id", scrimId).order("game_number");
      if (error) throw error;
      return data as OppPerf[];
    },
  });

  useEffect(() => {
    const forGame = existing.filter((e) => e.game_number === game);
    setRows(forGame.length ? forGame : []);
  }, [game, existing]);

  const knownPlayers: string[] = Array.isArray(opponent?.known_players)
    ? (opponent!.known_players as any[]).map((p) => (typeof p === "string" ? p : p?.name)).filter(Boolean)
    : [];

  const save = useMutation({
    mutationFn: async (toSave: OppPerf[]) => {
      const valid = toSave.filter((r) => r.player_name.trim());
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["opp-perfs-scrim", scrimId] });
      toast.success("Performances dos oponentes salvas");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("opponent_performances").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["opp-perfs-scrim", scrimId] }),
  });

  function addRow() {
    setRows((r) => [...r, emptyRow(scrimId, opponentId, game)]);
  }
  function update(i: number, patch: Partial<OppPerf>) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }
  function removeRow(i: number) {
    const row = rows[i];
    if (row.id) remove.mutate(row.id);
    setRows((r) => r.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-destructive" />
          <h4 className="font-display text-lg tracking-wider">
            OPONENTE: <span className="text-destructive">{opponentName || "—"}</span>
          </h4>
        </div>
        {!opponentId && (
          <p className="text-xs text-muted-foreground italic">
            Vincule este amistoso a um oponente cadastrado para registrar stats.
          </p>
        )}
      </div>

      {rows.length === 0 && (
        <Card className="p-6 border-dashed text-center text-sm text-muted-foreground">
          Nenhuma performance de oponente neste jogo. Adicione abaixo.
        </Card>
      )}

      {rows.map((row, i) => (
        <Card key={i} className="p-3 border-border">
          <div className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-3">
              <Label className="text-[10px] uppercase tracking-widest">Jogador</Label>
              {knownPlayers.length > 0 ? (
                <Select
                  value={row.player_name || "__custom"}
                  onValueChange={(v) => update(i, { player_name: v === "__custom" ? "" : v })}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {knownPlayers.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                    <SelectItem value="__custom">Outro (digitar)</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={row.player_name}
                  onChange={(e) => update(i, { player_name: e.target.value })}
                  placeholder="Nome do jogador"
                />
              )}
              {knownPlayers.length > 0 && !knownPlayers.includes(row.player_name) && (
                <Input
                  className="mt-1"
                  value={row.player_name}
                  onChange={(e) => update(i, { player_name: e.target.value })}
                  placeholder="Nome do jogador"
                />
              )}
            </div>
            <div className="col-span-3">
              <Label className="text-[10px] uppercase tracking-widest">Pokémon</Label>
              <PokemonPicker value={row.pokemon} onChange={(name) => update(i, { pokemon: name })} />
            </div>
            <NumField label="K" value={row.kills} onChange={(n) => update(i, { kills: n })} />
            <NumField label="A" value={row.assists} onChange={(n) => update(i, { assists: n })} />
            <NumField label="Score" value={row.score} onChange={(n) => update(i, { score: n })} colSpan={2} />
            <div className="col-span-1">
              <Label className="text-[10px] uppercase tracking-widest">Nota</Label>
              <Input
                type="number"
                min={0}
                max={10}
                step={0.1}
                value={row.rating ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  update(i, { rating: v === "" ? null : Math.max(0, Math.min(10, Number(v))) });
                }}
              />
            </div>
            <div className="col-span-1 flex justify-end">
              <Button size="icon" variant="ghost" onClick={() => removeRow(i)} className="hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-12 gap-2 mt-2">
            <NumField label="Dano causado" value={row.damage_dealt} onChange={(n) => update(i, { damage_dealt: n })} colSpan={3} />
            <NumField label="Dano sofrido" value={row.damage_taken} onChange={(n) => update(i, { damage_taken: n })} colSpan={3} />
            <NumField label="Cura" value={row.healing} onChange={(n) => update(i, { healing: n })} colSpan={3} />
            <div className="col-span-3">
              <Label className="text-[10px] uppercase tracking-widest">Notas</Label>
              <Input
                value={row.notes ?? ""}
                onChange={(e) => update(i, { notes: e.target.value || null })}
                placeholder="Observações"
              />
            </div>
          </div>
        </Card>
      ))}

      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" onClick={addRow}>
          <Plus className="h-4 w-4 mr-2" /> Adicionar oponente
        </Button>
        <Button onClick={() => save.mutate(rows)} disabled={save.isPending} className="bg-destructive/80 hover:bg-destructive uppercase tracking-wider">
          <Save className="h-4 w-4 mr-2" /> {save.isPending ? "Salvando..." : "Salvar oponentes"}
        </Button>
      </div>
    </div>
  );
}

function NumField({ label, value, onChange, colSpan = 1 }: { label: string; value: number; onChange: (n: number) => void; colSpan?: number }) {
  return (
    <div className={`col-span-${colSpan}`}>
      <Label className="text-[10px] uppercase tracking-widest">{label}</Label>
      <Input
        type="number"
        min={0}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          onChange(Number.isFinite(n) ? n : 0);
        }}
      />
    </div>
  );
}
