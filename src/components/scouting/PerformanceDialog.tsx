import { useEffect, useState } from "react";
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
import { Plus, Save, Trash2, Star, Shield, Swords } from "lucide-react";
import { toast } from "sonner";
import { kdaRatio, type PerfRow } from "@/lib/player-stats";
import { PokemonPicker } from "@/components/PokemonPicker";
import { OpponentPerformanceSection } from "@/components/scouting/OpponentPerformanceSection";

type Member = { id: string; name: string; ign: string | null; role: string };

type Form = {
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

function emptyRow(game = 1): Form {
  return {
    member_id: "",
    game_number: game,
    pokemon: "",
    kills: 0,
    deaths: 0,
    assists: 0,
    score: 0,
    damage_dealt: 0,
    damage_taken: 0,
    healing: 0,
    is_mvp: false,
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
  const [rows, setRows] = useState<Form[]>([]);
  const [game, setGame] = useState(1);

  const { data: members = [] } = useQuery({
    queryKey: ["members-min"],
    queryFn: async () => {
      const { data, error } = await supabase.from("members").select("id, name, ign, role").in("role", ["player", "substitute"]).order("name");
      if (error) throw error;
      return data as Member[];
    },
    enabled: open,
  });

  const { data: existing = [] } = useQuery({
    queryKey: ["perfs-scrim", scrimId],
    queryFn: async () => {
      const { data, error } = await supabase.from("match_performances").select("*").eq("scrim_id", scrimId).order("game_number");
      if (error) throw error;
      return data as PerfRow[];
    },
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    const forGame = existing.filter((e) => e.game_number === game);
    setRows(forGame.length ? forGame.map((e) => ({
      id: e.id,
      member_id: e.member_id,
      game_number: e.game_number,
      pokemon: e.pokemon ?? "",
      kills: e.kills, deaths: e.deaths, assists: e.assists,
      score: e.score, damage_dealt: e.damage_dealt, damage_taken: e.damage_taken,
      healing: e.healing, is_mvp: e.is_mvp,
    })) : []);
  }, [game, existing, open]);

  const save = useMutation({
    mutationFn: async (toSave: Form[]) => {
      const valid = toSave.filter((r) => r.member_id);
      const payload = valid.map((r) => ({
        ...r,
        scrim_id: scrimId,
        pokemon: r.pokemon || null,
      }));
      // upsert by unique key (scrim_id, member_id, game_number)
      const { error } = await supabase.from("match_performances").upsert(payload, {
        onConflict: "scrim_id,member_id,game_number",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["perfs-scrim", scrimId] });
      qc.invalidateQueries({ queryKey: ["perfs"] });
      toast.success("Performances salvas");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("match_performances").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["perfs-scrim", scrimId] });
      qc.invalidateQueries({ queryKey: ["perfs"] });
    },
  });

  function addRow() {
    setRows((r) => [...r, emptyRow(game)]);
  }
  function update(i: number, patch: Partial<Form>) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }
  function removeRow(i: number) {
    const row = rows[i];
    if (row.id) remove.mutate(row.id);
    setRows((r) => r.filter((_, idx) => idx !== i));
  }

  const games = Array.from({ length: bestOf }, (_, i) => i + 1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-wider">Performances · KDA por jogo</DialogTitle>
          <DialogDescription>Registre kills, assists, score e MVP de cada jogador por jogo do BO.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 flex-wrap mb-3">
          {games.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGame(g)}
              className={`px-3 py-1.5 text-xs uppercase tracking-wider rounded-md border ${
                game === g ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              Jogo {g}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {rows.length === 0 && (
            <Card className="p-6 border-dashed text-center text-sm text-muted-foreground">
              Nenhuma performance neste jogo. Adicione abaixo.
            </Card>
          )}
          {rows.map((row, i) => (
            <Card key={i} className="p-3 border-border">
              <div className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-3">
                  <Label className="text-[10px] uppercase tracking-widest">Jogador</Label>
                  <Select value={row.member_id} onValueChange={(v) => update(i, { member_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {members.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.name}{m.ign ? ` (${m.ign})` : ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-3">
                  <Label className="text-[10px] uppercase tracking-widest">Pokémon</Label>
                  <PokemonPicker value={row.pokemon || null} onChange={(name) => update(i, { pokemon: name ?? "" })} />
                </div>
                <NumField label="K" value={row.kills} onChange={(n) => update(i, { kills: n })} />
                <NumField label="A" value={row.assists} onChange={(n) => update(i, { assists: n })} />
                <NumField label="Score" value={row.score} onChange={(n) => update(i, { score: n })} colSpan={2} />
                <div className="col-span-1 flex flex-col items-center gap-1">
                  <Label className="text-[10px] uppercase tracking-widest">MVP</Label>
                  <Checkbox checked={row.is_mvp} onCheckedChange={(v) => update(i, { is_mvp: !!v })} />
                </div>
                <div className="col-span-1 flex justify-end">
                  <Button size="icon" variant="ghost" onClick={() => removeRow(i)} className="hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-12 gap-2 mt-2">
                <NumField label="Dano" value={row.damage_dealt} onChange={(n) => update(i, { damage_dealt: n })} colSpan={3} />
                <NumField label="Dano sofrido" value={row.damage_taken} onChange={(n) => update(i, { damage_taken: n })} colSpan={3} />
                <NumField label="Cura" value={row.healing} onChange={(n) => update(i, { healing: n })} colSpan={3} />
                <div className="col-span-3 text-right text-xs text-muted-foreground self-end">
                  KDA: <span className="text-gold font-display text-base">{kdaRatio(row.kills, row.deaths, row.assists)}</span>
                  {row.is_mvp && <Star className="inline h-3 w-3 ml-1 text-gold" />}
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="flex items-center justify-between mt-4">
          <Button type="button" variant="outline" onClick={addRow}>
            <Plus className="h-4 w-4 mr-2" /> Adicionar jogador
          </Button>
          <Button onClick={() => save.mutate(rows)} disabled={save.isPending} className="bg-gradient-primary shadow-glow uppercase tracking-wider">
            <Save className="h-4 w-4 mr-2" /> {save.isPending ? "Salvando..." : "Salvar jogo"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
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
