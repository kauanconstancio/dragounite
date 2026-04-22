import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2, Pencil, Target, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export const Route = createFileRoute("/oponentes")({
  head: () => ({
    meta: [
      { title: "Oponentes — Battle Arena" },
      { name: "description", content: "Banco de adversários, scouting e histórico de confrontos." },
    ],
  }),
  component: OpponentsPage,
});

type Opponent = {
  id: string;
  name: string;
  tag: string | null;
  region: string | null;
  notes: string | null;
  recurring_picks: string[] | null;
  known_players: any[] | null;
  created_at: string;
};

type ScrimLite = {
  id: string;
  opponent_id: string | null;
  opponent: string;
  result: "pending" | "win" | "loss" | "draw";
  score_us: number;
  score_them: number;
  scheduled_at: string;
};

function OpponentsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Opponent | null>(null);

  const { data: opponents = [] } = useQuery({
    queryKey: ["opponents"],
    queryFn: async () => {
      const { data, error } = await supabase.from("opponents").select("*").order("name");
      if (error) throw error;
      return data as Opponent[];
    },
  });

  const { data: scrims = [] } = useQuery({
    queryKey: ["scrims"],
    queryFn: async () => {
      const { data, error } = await supabase.from("scrims").select("id, opponent, opponent_id, result, score_us, score_them, scheduled_at");
      if (error) throw error;
      return data as ScrimLite[];
    },
  });

  const save = useMutation({
    mutationFn: async (o: Partial<Opponent>) => {
      const payload: any = {
        name: o.name?.trim(),
        tag: o.tag?.trim() || null,
        region: o.region?.trim() || null,
        notes: o.notes?.trim() || null,
        recurring_picks: o.recurring_picks ?? [],
        known_players: o.known_players ?? [],
      };
      if (editing) {
        const { error } = await supabase.from("opponents").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("opponents").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["opponents"] });
      setOpen(false);
      setEditing(null);
      toast.success("Salvo");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("opponents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["opponents"] });
      toast.success("Removido");
    },
  });

  function statsFor(opp: Opponent) {
    const matches = scrims.filter(
      (s) => s.opponent_id === opp.id || s.opponent.toLowerCase() === opp.name.toLowerCase(),
    );
    const finished = matches.filter((m) => m.result === "win" || m.result === "loss");
    const wins = finished.filter((m) => m.result === "win").length;
    return {
      total: matches.length,
      wins,
      losses: finished.length - wins,
      rate: finished.length ? Math.round((wins / finished.length) * 100) : null,
    };
  }

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-5xl tracking-wider">
            BANCO DE <span className="text-gold">OPONENTES</span>
          </h1>
          <p className="mt-2 text-muted-foreground uppercase tracking-widest text-xs">
            {opponents.length} times catalogados
          </p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button size="lg" className="bg-gradient-primary shadow-glow uppercase tracking-wider">
              <Plus className="mr-2 h-4 w-4" /> Novo oponente
            </Button>
          </DialogTrigger>
          <OpponentDialog editing={editing} onSave={(o) => save.mutate(o)} saving={save.isPending} />
        </Dialog>
      </div>

      {opponents.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg py-16 text-center">
          <Target className="h-10 w-10 text-gold mx-auto mb-3 opacity-60" />
          <p className="text-muted-foreground">Nenhum oponente catalogado ainda.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {opponents.map((o, i) => {
            const stats = statsFor(o);
            return (
              <motion.div
                key={o.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card className="p-5 border-border hover:border-primary/50 shadow-card group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-display text-2xl tracking-wider">{o.name}</h3>
                        {o.tag && (
                          <Badge variant="outline" className="border-gold/40 text-gold text-[10px] uppercase">
                            {o.tag}
                          </Badge>
                        )}
                        {o.region && (
                          <Badge variant="outline" className="border-border text-[10px] uppercase">
                            {o.region}
                          </Badge>
                        )}
                      </div>
                      <div className="mt-3 flex gap-4 text-xs uppercase tracking-widest">
                        <div>
                          <div className="text-muted-foreground">Partidas</div>
                          <div className="font-display text-xl text-foreground">{stats.total}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">V-D</div>
                          <div className="font-display text-xl">
                            <span className="text-gold">{stats.wins}</span>
                            <span className="text-muted-foreground">-</span>
                            <span className="text-destructive">{stats.losses}</span>
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Winrate</div>
                          <div className="font-display text-xl text-gold">
                            {stats.rate !== null ? `${stats.rate}%` : "—"}
                          </div>
                        </div>
                      </div>
                      {o.recurring_picks && o.recurring_picks.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {o.recurring_picks.slice(0, 6).map((p) => (
                            <Badge key={p} variant="outline" className="text-[9px] uppercase border-border">
                              {p}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {Array.isArray(o.known_players) && o.known_players.length > 0 && (
                        <div className="mt-2">
                          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Jogadores</div>
                          <div className="flex flex-wrap gap-1">
                            {(o.known_players as any[]).slice(0, 8).map((p: any, idx: number) => {
                              const name = typeof p === "string" ? p : p?.name;
                              if (!name) return null;
                              return (
                                <Badge key={`${name}-${idx}`} variant="outline" className="text-[10px] border-primary/40 text-primary">
                                  {name}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {o.notes && (
                        <p className="mt-3 text-xs text-muted-foreground italic line-clamp-2">{o.notes}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(o); setOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="hover:text-destructive"
                        onClick={() => { if (confirm(`Remover ${o.name}?`)) remove.mutate(o.id); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <Link
                    to="/amistosos"
                    className="mt-3 flex items-center gap-1 text-xs uppercase tracking-widest text-primary hover:text-gold transition-colors"
                  >
                    Ver histórico <ChevronRight className="h-3 w-3" />
                  </Link>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

type Form = {
  name: string;
  tag: string;
  region: string;
  notes: string;
  recurring_picks_text: string;
  players: { name: string; role: string; notes: string }[];
};

function OpponentDialog({ editing, onSave, saving }: { editing: Opponent | null; onSave: (o: Partial<Opponent>) => void; saving: boolean }) {
  const [form, setForm] = useState<Form>(() => ({
    name: editing?.name ?? "",
    tag: editing?.tag ?? "",
    region: editing?.region ?? "",
    notes: editing?.notes ?? "",
    recurring_picks_text: editing?.recurring_picks?.join(", ") ?? "",
    players: Array.isArray(editing?.known_players)
      ? (editing!.known_players as any[]).map((p) => ({
          name: typeof p === "string" ? p : (p?.name ?? ""),
          role: typeof p === "object" ? (p?.role ?? "") : "",
          notes: typeof p === "object" ? (p?.notes ?? "") : "",
        }))
      : [],
  }));

  const addPlayer = () => setForm((f) => ({ ...f, players: [...f.players, { name: "", role: "", notes: "" }] }));
  const updatePlayer = (i: number, patch: Partial<{ name: string; role: string; notes: string }>) =>
    setForm((f) => ({ ...f, players: f.players.map((p, idx) => (idx === i ? { ...p, ...patch } : p)) }));
  const removePlayer = (i: number) =>
    setForm((f) => ({ ...f, players: f.players.filter((_, idx) => idx !== i) }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave({
      name: form.name,
      tag: form.tag,
      region: form.region,
      notes: form.notes,
      recurring_picks: form.recurring_picks_text
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      known_players: form.players
        .map((p) => ({ name: p.name.trim(), role: p.role.trim(), notes: p.notes.trim() }))
        .filter((p) => p.name),
    });
  };

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="font-display text-2xl tracking-wider">
          {editing ? "Editar oponente" : "Novo oponente"}
        </DialogTitle>
        <DialogDescription>
          Nome, tag, região, picks recorrentes, jogadores e notas de scouting.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="op-name">Nome</Label>
            <Input id="op-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <Label htmlFor="op-tag">Tag</Label>
            <Input id="op-tag" value={form.tag} onChange={(e) => setForm((f) => ({ ...f, tag: e.target.value }))} placeholder="Ex: BA" />
          </div>
        </div>
        <div>
          <Label htmlFor="op-region">Região</Label>
          <Input id="op-region" value={form.region} onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))} placeholder="Ex: BR / LATAM" />
        </div>
        <div>
          <Label htmlFor="op-picks">Picks recorrentes (separados por vírgula)</Label>
          <Input
            id="op-picks"
            value={form.recurring_picks_text}
            onChange={(e) => setForm((f) => ({ ...f, recurring_picks_text: e.target.value }))}
            placeholder="Ex: Mewtwo Y, Comfey, Zacian"
          />
        </div>

        <div className="space-y-2 border-t border-border pt-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs uppercase tracking-widest">Jogadores do time oponente</Label>
            <Button type="button" size="sm" variant="outline" onClick={addPlayer}>
              <Plus className="h-3 w-3 mr-1" /> Adicionar
            </Button>
          </div>
          {form.players.length === 0 && (
            <p className="text-xs text-muted-foreground italic">Nenhum jogador cadastrado.</p>
          )}
          {form.players.map((p, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-4">
                <Label className="text-[10px] uppercase tracking-widest">Nome / IGN</Label>
                <Input value={p.name} onChange={(e) => updatePlayer(i, { name: e.target.value })} placeholder="IGN" />
              </div>
              <div className="col-span-3">
                <Label className="text-[10px] uppercase tracking-widest">Lane / Função</Label>
                <Input value={p.role} onChange={(e) => updatePlayer(i, { role: e.target.value })} placeholder="Ex: Jungle" />
              </div>
              <div className="col-span-4">
                <Label className="text-[10px] uppercase tracking-widest">Notas</Label>
                <Input value={p.notes} onChange={(e) => updatePlayer(i, { notes: e.target.value })} placeholder="Mains, estilo..." />
              </div>
              <div className="col-span-1 flex justify-end">
                <Button type="button" size="icon" variant="ghost" onClick={() => removePlayer(i)} className="hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div>
          <Label htmlFor="op-notes">Notas de scouting</Label>
          <Textarea id="op-notes" rows={4} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={!form.name.trim() || saving} className="bg-gradient-primary shadow-glow uppercase tracking-wider">
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
