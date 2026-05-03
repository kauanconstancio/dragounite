import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/shared/ConfirmButton";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Pencil, Swords, Trophy, Video, BarChart3, CheckCircle2, Repeat, Sparkles } from "lucide-react";
import { format, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { VodEmbed } from "@/components/scouting/VodEmbed";
import { PerformanceDialog } from "@/components/scouting/PerformanceDialog";
import { RequireRole } from "@/components/auth/RequireRole";
import { useCurrentTeam } from "@/hooks/useCurrentTeam";
import {
  RecurrenceField,
  emptyRecurrence,
  toRecurrenceRule,
  type RecurrenceState,
} from "@/components/shared/RecurrenceField";
import { expandRecurrence, describeRule, type RecurrenceRule } from "@/lib/recurrence";

export const Route = createFileRoute("/amistosos")({
  head: () => ({
    meta: [
      { title: "Amistosos — Battle Arena" },
      { name: "description", content: "Scrims e amistosos do time." },
    ],
  }),
  component: ScrimsPage,
});

type Scrim = {
  id: string;
  opponent: string;
  opponent_id: string | null;
  scheduled_at: string;
  best_of: number;
  result: "pending" | "win" | "loss" | "draw";
  score_us: number;
  score_them: number;
  status: "scheduled" | "completed" | "cancelled";
  notes: string | null;
  vod_url: string | null;
  vod_notes: string | null;
  recurrence_group_id: string | null;
  recurrence_rule: RecurrenceRule | null;
};

type Opponent = { id: string; name: string; tag: string | null };

const RESULT_STYLES: Record<string, string> = {
  win: "bg-gold/20 text-gold border-gold/40",
  loss: "bg-destructive/20 text-destructive border-destructive/40",
  draw: "bg-muted text-muted-foreground border-border",
  pending: "bg-primary/20 text-primary border-primary/40",
};
const RESULT_LABEL: Record<string, string> = { win: "Vitória", loss: "Derrota", draw: "Empate", pending: "Pendente" };

function ScrimsPage() {
  const qc = useQueryClient();
  const { team } = useCurrentTeam();
  const teamId = team?.id;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Scrim | null>(null);

  const { data: scrims = [], isLoading } = useQuery({
    queryKey: ["scrims", teamId],
    queryFn: async () => {
      if (!teamId) return [] as Scrim[];
      const { data, error } = await supabase.from("scrims").select("*").eq("team_id", teamId).order("scheduled_at", { ascending: false });
      if (error) throw error;
      return data as Scrim[];
    },
    enabled: !!teamId,
  });

  const { data: opponents = [] } = useQuery({
    queryKey: ["opponents-min", teamId],
    queryFn: async () => {
      if (!teamId) return [] as Opponent[];
      const { data, error } = await supabase.from("opponents").select("id, name, tag").eq("team_id", teamId).order("name");
      if (error) throw error;
      return data as Opponent[];
    },
    enabled: !!teamId,
  });

  const opponentMap = new Map(opponents.map((o) => [o.id, o]));

  const save = useMutation({
    mutationFn: async (payload: { values: Partial<Scrim>; recurrence: RecurrenceRule | null }) => {
      if (!teamId) throw new Error("Selecione uma equipe");
      const { values, recurrence } = payload;
      if (editing) {
        const { error } = await supabase.from("scrims").update(values).eq("id", editing.id);
        if (error) throw error;
        return { count: 1 };
      }
      const baseISO = values.scheduled_at as string;
      const dates = recurrence ? expandRecurrence(baseISO, recurrence) : [new Date(baseISO)];
      const groupId = recurrence ? crypto.randomUUID() : null;
      const rows = dates.map((d) => ({
        ...values,
        team_id: teamId,
        scheduled_at: d.toISOString(),
        recurrence_group_id: groupId,
        recurrence_rule: recurrence ?? null,
      }));
      const { error } = await supabase.from("scrims").insert(rows as any);
      if (error) throw error;
      return { count: rows.length };
    },
    onSuccess: ({ count }) => {
      qc.invalidateQueries({ queryKey: ["scrims"] });
      setOpen(false);
      setEditing(null);
      toast.success(count > 1 ? `${count} amistosos criados` : "Salvo");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("scrims").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["scrims"] }); toast.success("Removido"); },
  });

  const removeSeries = useMutation({
    mutationFn: async (groupId: string) => {
      if (!teamId) return;
      const { error } = await supabase
        .from("scrims")
        .delete()
        .eq("team_id", teamId)
        .eq("recurrence_group_id", groupId)
        .gte("scheduled_at", new Date().toISOString());
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["scrims"] }); toast.success("Série removida"); },
    onError: (e: any) => toast.error(e.message),
  });

  const complete = useMutation({
    mutationFn: async (s: Scrim) => {
      const result: Scrim["result"] =
        s.score_us > s.score_them ? "win" : s.score_them > s.score_us ? "loss" : "draw";
      const { error } = await supabase
        .from("scrims")
        .update({ status: "completed", result })
        .eq("id", s.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["scrims"] }); toast.success("Scrim concluída"); },
    onError: (e: any) => toast.error(e.message),
  });

  const wins = scrims.filter((s) => s.result === "win").length;
  const losses = scrims.filter((s) => s.result === "loss").length;
  const upcoming = scrims.filter((s) => !isPast(new Date(s.scheduled_at)) && s.status === "scheduled");
  const past = scrims.filter((s) => isPast(new Date(s.scheduled_at)) || s.status !== "scheduled");

  return (
    <div className="space-y-10">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-5xl tracking-wider">
            AMISTOSOS & <span className="text-gold">SCRIMS</span>
          </h1>
          <p className="mt-2 text-muted-foreground uppercase tracking-widest text-xs">
            {wins}V · {losses}D · {upcoming.length} agendados
          </p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <RequireRole roles={["coach"]}>
            <DialogTrigger asChild>
              <Button size="lg" className="bg-gradient-primary shadow-glow uppercase tracking-wider">
                <Plus className="mr-2 h-4 w-4" /> Novo amistoso
              </Button>
            </DialogTrigger>
          </RequireRole>
          <ScrimDialog editing={editing} opponents={opponents} onSave={(values, recurrence) => save.mutate({ values, recurrence })} saving={save.isPending} />
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Vitórias" value={wins} accent="gold" icon={Trophy} />
        <StatCard label="Derrotas" value={losses} accent="primary" icon={Swords} />
        <StatCard label="Win rate" value={scrims.filter(s => s.result !== "pending").length > 0 ? `${Math.round((wins / scrims.filter(s => s.result !== "pending").length) * 100)}%` : "—"} accent="gold" icon={Trophy} />
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-20">Carregando...</div>
      ) : (
        <>
          <ScrimList title="Próximos" items={upcoming} opponentMap={opponentMap} onEdit={(s) => { setEditing(s); setOpen(true); }} onDelete={(id) => remove.mutate(id)} onDeleteSeries={(gid) => removeSeries.mutate(gid)} onComplete={(s) => complete.mutate(s)} />
          <ScrimList title="Histórico" items={past} opponentMap={opponentMap} onEdit={(s) => { setEditing(s); setOpen(true); }} onDelete={(id) => remove.mutate(id)} onDeleteSeries={(gid) => removeSeries.mutate(gid)} onComplete={(s) => complete.mutate(s)} muted />
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, accent, icon: Icon }: any) {
  return (
    <Card className="p-5 border-border shadow-card">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
          <div className={`font-display text-4xl mt-1 ${accent === "gold" ? "text-gold" : "text-primary"}`}>{value}</div>
        </div>
        <Icon className={`h-8 w-8 ${accent === "gold" ? "text-gold" : "text-primary"} opacity-50`} />
      </div>
    </Card>
  );
}

function ScrimList({ title, items, opponentMap, onEdit, onDelete, onDeleteSeries, onComplete, muted }: { title: string; items: Scrim[]; opponentMap: Map<string, Opponent>; onEdit: (s: Scrim) => void; onDelete: (id: string) => void; onDeleteSeries: (groupId: string) => void; onComplete: (s: Scrim) => void; muted?: boolean }) {
  const [perfFor, setPerfFor] = useState<Scrim | null>(null);
  return (
    <section>
      <div className="flex items-center gap-3 mb-5">
        <h2 className="font-display text-2xl tracking-wider">{title}</h2>
        <div className="flex-1 h-px bg-border" />
        <Badge variant="outline">{items.length}</Badge>
      </div>
      {items.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg py-8 text-center text-sm text-muted-foreground">Nada aqui.</div>
      ) : (
        <div className="grid gap-3">
          {items.map((s, i) => (
            <motion.div key={s.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className={`p-5 border-border hover:border-primary/50 shadow-card group ${muted ? "opacity-70" : ""}`}>
                <div className="flex items-center gap-5 flex-wrap">
                  <div className="text-center shrink-0">
                    <div className="font-display text-3xl text-gold leading-none">{s.score_us}</div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Nós</div>
                  </div>
                  <div className="text-muted-foreground font-display text-xl">VS</div>
                  <div className="text-center shrink-0">
                    <div className="font-display text-3xl text-foreground leading-none">{s.score_them}</div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Eles</div>
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display text-xl tracking-wider">
                        {s.opponent_id && opponentMap.get(s.opponent_id)?.name ? opponentMap.get(s.opponent_id)!.name : s.opponent}
                      </h3>
                      <Badge variant="outline" className={`text-[10px] uppercase tracking-wider ${RESULT_STYLES[s.result]}`}>{RESULT_LABEL[s.result]}</Badge>
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wider border-border">BO{s.best_of}</Badge>
                      {s.vod_url && (
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wider border-primary/40 text-primary">
                          <Video className="h-2.5 w-2.5 mr-1" /> VOD
                        </Badge>
                      )}
                      {s.recurrence_group_id && (
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wider border-primary/40 text-primary">
                          <Repeat className="h-2.5 w-2.5 mr-1" />
                          {describeRule(s.recurrence_rule)}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {format(new Date(s.scheduled_at), "EEE, dd MMM · HH:mm", { locale: ptBR })}
                    </div>
                    {s.notes && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{s.notes}</p>}
                    {s.vod_url && (
                      <div className="mt-3"><VodEmbed url={s.vod_url} /></div>
                    )}
                    {s.vod_notes && <p className="mt-2 text-xs text-muted-foreground italic whitespace-pre-wrap">{s.vod_notes}</p>}
                  </div>
                  <div className="flex gap-1 items-center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPerfFor(s)}
                      className="border-primary/40 text-primary hover:bg-primary/10 uppercase tracking-wider text-xs"
                    >
                      <BarChart3 className="h-4 w-4 mr-1.5" /> Stats
                    </Button>
                    <RequireRole roles={["coach"]}>
                      {s.status !== "completed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onComplete(s)}
                          className="border-gold/40 text-gold hover:bg-gold/10 uppercase tracking-wider text-xs"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1.5" /> Concluir
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" onClick={() => onEdit(s)}><Pencil className="h-4 w-4" /></Button>
                      {s.recurrence_group_id && (
                        <ConfirmButton size="icon" variant="ghost" className="hover:text-destructive" title="Remover toda a série?" description="Apaga este amistoso e todas as próximas ocorrências futuras desta recorrência." confirmLabel="Remover série" onConfirm={() => onDeleteSeries(s.recurrence_group_id!)}>
                          <Repeat className="h-4 w-4" />
                        </ConfirmButton>
                      )}
                      <ConfirmButton size="icon" variant="ghost" className="hover:text-destructive" title="Remover amistoso?" description="Esta ação não pode ser desfeita." confirmLabel="Remover" onConfirm={() => onDelete(s.id)}><Trash2 className="h-4 w-4" /></ConfirmButton>
                    </RequireRole>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
      {perfFor && (
        <PerformanceDialog
          scrimId={perfFor.id}
          bestOf={perfFor.best_of}
          opponentId={perfFor.opponent_id}
          opponentName={perfFor.opponent_id && opponentMap.get(perfFor.opponent_id)?.name ? opponentMap.get(perfFor.opponent_id)!.name : perfFor.opponent}
          status={perfFor.status}
          open={!!perfFor}
          onOpenChange={(v) => { if (!v) setPerfFor(null); }}
        />
      )}
    </section>
  );
}

function toLocalInput(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

type ScrimForm = {
  opponent: string;
  opponent_id: string | null;
  scheduled_at: string;
  best_of: number;
  result: "pending" | "win" | "loss" | "draw";
  score_us: number;
  score_them: number;
  status: "scheduled" | "completed" | "cancelled";
  notes: string;
  vod_url: string;
  vod_notes: string;
};

function emptyScrimForm(): ScrimForm {
  return {
    opponent: "",
    opponent_id: null,
    scheduled_at: toLocalInput(new Date().toISOString()),
    best_of: 3,
    result: "pending",
    score_us: 0,
    score_them: 0,
    status: "scheduled",
    notes: "",
    vod_url: "",
    vod_notes: "",
  };
}

function fromScrim(editing: Scrim): ScrimForm {
  return {
    opponent: editing.opponent,
    opponent_id: editing.opponent_id,
    scheduled_at: toLocalInput(editing.scheduled_at),
    best_of: editing.best_of,
    result: editing.result,
    score_us: editing.score_us,
    score_them: editing.score_them,
    status: editing.status,
    notes: editing.notes ?? "",
    vod_url: editing.vod_url ?? "",
    vod_notes: editing.vod_notes ?? "",
  };
}

function ScrimDialog({
  editing,
  opponents,
  onSave,
  saving,
}: {
  editing: Scrim | null;
  opponents: Opponent[];
  onSave: (values: Partial<Scrim>, recurrence: RecurrenceRule | null) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<ScrimForm>(() =>
    editing ? fromScrim(editing) : emptyScrimForm(),
  );
  const [recurrence, setRecurrence] = useState<RecurrenceState>(() => emptyRecurrence());

  useEffect(() => {
    setForm(editing ? fromScrim(editing) : emptyScrimForm());
    setRecurrence(emptyRecurrence());
  }, [editing]);

  const canSave =
    form.opponent.trim().length > 0 && !!form.scheduled_at && !saving;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    const parsed = new Date(form.scheduled_at);
    if (Number.isNaN(parsed.getTime())) {
      toast.error("Data inválida");
      return;
    }
    onSave(
      {
        opponent: form.opponent.trim(),
        opponent_id: form.opponent_id,
        scheduled_at: parsed.toISOString(),
        best_of: form.best_of,
        result: form.result,
        score_us: Math.max(0, Math.round(form.score_us) || 0),
        score_them: Math.max(0, Math.round(form.score_them) || 0),
        status: form.status,
        notes: form.notes.trim() || null,
        vod_url: form.vod_url.trim() || null,
        vod_notes: form.vod_notes.trim() || null,
      },
      editing ? null : toRecurrenceRule(recurrence),
    );
  };

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="font-display text-2xl tracking-wider">
          {editing ? "Editar amistoso" : "Novo amistoso"}
        </DialogTitle>
        <DialogDescription>
          Registre oponente, formato BO, placar, resultado e VOD do scrim.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="sc-opp-link">Oponente cadastrado (opcional)</Label>
          <Select
            value={form.opponent_id ?? "none"}
            onValueChange={(v) => {
              if (v === "none") {
                setForm((f) => ({ ...f, opponent_id: null }));
              } else {
                const o = opponents.find((x) => x.id === v);
                setForm((f) => ({ ...f, opponent_id: v, opponent: o?.name ?? f.opponent }));
              }
            }}
          >
            <SelectTrigger id="sc-opp-link"><SelectValue placeholder="Texto livre" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Texto livre —</SelectItem>
              {opponents.map((o) => (
                <SelectItem key={o.id} value={o.id}>{o.name}{o.tag ? ` [${o.tag}]` : ""}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="sc-opp">Nome do oponente</Label>
          <Input
            id="sc-opp"
            value={form.opponent}
            onChange={(e) => setForm((f) => ({ ...f, opponent: e.target.value }))}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="sc-when">Data e hora</Label>
            <Input
              id="sc-when"
              type="datetime-local"
              value={form.scheduled_at}
              onChange={(e) => setForm((f) => ({ ...f, scheduled_at: e.target.value }))}
              required
            />
          </div>
          <div>
            <Label>Best of</Label>
            <Select
              value={String(form.best_of)}
              onValueChange={(v) => setForm((f) => ({ ...f, best_of: Number(v) }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1, 3, 5, 7].map((n) => (
                  <SelectItem key={n} value={String(n)}>BO{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label htmlFor="sc-us">Nós</Label>
            <Input
              id="sc-us"
              type="number"
              min={0}
              value={form.score_us}
              onChange={(e) => {
                const n = Number(e.target.value);
                setForm((f) => ({ ...f, score_us: Number.isFinite(n) ? n : 0 }));
              }}
            />
          </div>
          <div>
            <Label htmlFor="sc-them">Eles</Label>
            <Input
              id="sc-them"
              type="number"
              min={0}
              value={form.score_them}
              onChange={(e) => {
                const n = Number(e.target.value);
                setForm((f) => ({ ...f, score_them: Number.isFinite(n) ? n : 0 }));
              }}
            />
          </div>
          <div>
            <Label>Resultado</Label>
            <Select
              value={form.result}
              onValueChange={(v) => setForm((f) => ({ ...f, result: v as ScrimForm["result"] }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="win">Vitória</SelectItem>
                <SelectItem value="loss">Derrota</SelectItem>
                <SelectItem value="draw">Empate</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label>Status</Label>
          <Select
            value={form.status}
            onValueChange={(v) => setForm((f) => ({ ...f, status: v as ScrimForm["status"] }))}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="scheduled">Agendado</SelectItem>
              <SelectItem value="completed">Concluído</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="sc-notes">Notas</Label>
          <Textarea
            id="sc-notes"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            rows={3}
          />
        </div>
        <div>
          <Label htmlFor="sc-vod">VOD URL (YouTube ou Drive)</Label>
          <Input
            id="sc-vod"
            type="url"
            placeholder="https://youtube.com/watch?v=..."
            value={form.vod_url}
            onChange={(e) => setForm((f) => ({ ...f, vod_url: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="sc-vod-notes">Notas do VOD (timestamps)</Label>
          <Textarea
            id="sc-vod-notes"
            placeholder="0:30 — bug do regis | 4:12 — rotação top"
            value={form.vod_notes}
            onChange={(e) => setForm((f) => ({ ...f, vod_notes: e.target.value }))}
            rows={3}
          />
        </div>
        {!editing && (
          <RecurrenceField
            baseDateISO={form.scheduled_at ? new Date(form.scheduled_at).toISOString() : ""}
            state={recurrence}
            onChange={setRecurrence}
          />
        )}
        <DialogFooter>
          <Button
            type="submit"
            className="bg-gradient-primary shadow-glow uppercase tracking-wider"
            disabled={!canSave}
          >
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
