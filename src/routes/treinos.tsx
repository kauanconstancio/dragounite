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
import { Plus, Trash2, Pencil, Clock, Target, Repeat } from "lucide-react";
import { format, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useCurrentTeam } from "@/hooks/useCurrentTeam";
import {
  RecurrenceField,
  emptyRecurrence,
  toRecurrenceRule,
  type RecurrenceState,
} from "@/components/shared/RecurrenceField";
import { expandRecurrence, describeRule, type RecurrenceRule } from "@/lib/recurrence";

export const Route = createFileRoute("/treinos")({
  head: () => ({
    meta: [
      { title: "Treinos — Battle Arena" },
      { name: "description", content: "Agenda de treinos do time." },
    ],
  }),
  component: TreinosPage,
});

type Training = {
  id: string;
  title: string;
  scheduled_at: string;
  duration_min: number;
  focus: string | null;
  notes: string | null;
  status: "scheduled" | "completed" | "cancelled";
  recurrence_group_id: string | null;
  recurrence_rule: RecurrenceRule | null;
};

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Agendado",
  completed: "Concluído",
  cancelled: "Cancelado",
};

function TreinosPage() {
  const qc = useQueryClient();
  const { team } = useCurrentTeam();
  const teamId = team?.id;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Training | null>(null);

  const { data: trainings = [], isLoading } = useQuery({
    queryKey: ["trainings", teamId],
    queryFn: async () => {
      if (!teamId) return [] as Training[];
      const { data, error } = await supabase.from("trainings").select("*").eq("team_id", teamId).order("scheduled_at", { ascending: false });
      if (error) throw error;
      return data as Training[];
    },
    enabled: !!teamId,
  });

  const save = useMutation({
    mutationFn: async (payload: { values: Partial<Training>; recurrence: RecurrenceRule | null }) => {
      if (!teamId) throw new Error("Selecione uma equipe");
      const { values, recurrence } = payload;
      if (editing) {
        const { error } = await supabase.from("trainings").update(values).eq("id", editing.id);
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
      const { error } = await supabase.from("trainings").insert(rows as any);
      if (error) throw error;
      return { count: rows.length };
    },
    onSuccess: ({ count }) => {
      qc.invalidateQueries({ queryKey: ["trainings"] });
      setOpen(false); setEditing(null);
      toast.success(count > 1 ? `${count} treinos criados` : "Salvo");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("trainings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["trainings"] }); toast.success("Removido"); },
  });

  const removeSeries = useMutation({
    mutationFn: async (groupId: string) => {
      if (!teamId) return;
      const { error } = await supabase
        .from("trainings")
        .delete()
        .eq("team_id", teamId)
        .eq("recurrence_group_id", groupId)
        .gte("scheduled_at", new Date().toISOString());
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["trainings"] }); toast.success("Série removida"); },
    onError: (e: any) => toast.error(e.message),
  });

  const upcoming = trainings.filter((t) => !isPast(new Date(t.scheduled_at)) && t.status === "scheduled");
  const past = trainings.filter((t) => isPast(new Date(t.scheduled_at)) || t.status !== "scheduled");

  return (
    <div className="space-y-10">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-5xl tracking-wider">
            ROTINA DE <span className="text-gold">TREINOS</span>
          </h1>
          <p className="mt-2 text-muted-foreground uppercase tracking-widest text-xs">
            {upcoming.length} próximos · {past.length} no histórico
          </p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button size="lg" className="bg-gradient-primary shadow-glow uppercase tracking-wider">
              <Plus className="mr-2 h-4 w-4" /> Novo treino
            </Button>
          </DialogTrigger>
          <TrainingDialog editing={editing} onSave={(values, recurrence) => save.mutate({ values, recurrence })} saving={save.isPending} />
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-20">Carregando...</div>
      ) : (
        <>
          <Section title="Próximos" items={upcoming} onEdit={(t) => { setEditing(t); setOpen(true); }} onDelete={(id) => remove.mutate(id)} />
          <Section title="Histórico" items={past} onEdit={(t) => { setEditing(t); setOpen(true); }} onDelete={(id) => remove.mutate(id)} muted />
        </>
      )}
    </div>
  );
}

function Section({ title, items, onEdit, onDelete, muted }: { title: string; items: Training[]; onEdit: (t: Training) => void; onDelete: (id: string) => void; muted?: boolean }) {
  return (
    <section>
      <div className="flex items-center gap-3 mb-5">
        <h2 className="font-display text-2xl tracking-wider">{title}</h2>
        <div className="flex-1 h-px bg-border" />
        <Badge variant="outline">{items.length}</Badge>
      </div>
      {items.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg py-8 text-center text-sm text-muted-foreground">
          Nada por aqui ainda.
        </div>
      ) : (
        <div className="grid gap-3">
          {items.map((t, i) => {
            const date = new Date(t.scheduled_at);
            return (
              <motion.div key={t.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                <Card className={`p-5 border-border hover:border-primary/50 transition-all shadow-card group ${muted ? "opacity-70" : ""}`}>
                  <div className="flex items-center gap-5 flex-wrap">
                    <div className="flex flex-col items-center justify-center bg-gradient-primary text-primary-foreground rounded-md w-16 h-16 shadow-glow shrink-0">
                      <span className="font-display text-2xl leading-none">{format(date, "dd")}</span>
                      <span className="text-[10px] uppercase tracking-widest">{format(date, "MMM", { locale: ptBR })}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-display text-xl tracking-wider">{t.title}</h3>
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wider border-gold/40 text-gold">
                          {STATUS_LABEL[t.status]}
                        </Badge>
                      </div>
                      <div className="mt-1 flex gap-4 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> {format(date, "EEE, HH:mm", { locale: ptBR })} · {t.duration_min}min</span>
                        {t.focus && <span className="flex items-center gap-1.5"><Target className="h-3 w-3" /> {t.focus}</span>}
                      </div>
                      {t.notes && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{t.notes}</p>}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="ghost" onClick={() => onEdit(t)}><Pencil className="h-4 w-4" /></Button>
                      <ConfirmButton size="icon" variant="ghost" className="hover:text-destructive" title="Remover treino?" description="Esta ação não pode ser desfeita." confirmLabel="Remover" onConfirm={() => onDelete(t.id)}><Trash2 className="h-4 w-4" /></ConfirmButton>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function toLocalInput(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

type TrainingForm = {
  title: string;
  scheduled_at: string;
  duration_min: number;
  focus: string;
  notes: string;
  status: "scheduled" | "completed" | "cancelled";
};

function emptyTrainingForm(): TrainingForm {
  return {
    title: "",
    scheduled_at: toLocalInput(new Date().toISOString()),
    duration_min: 90,
    focus: "",
    notes: "",
    status: "scheduled",
  };
}

function fromTraining(editing: Training): TrainingForm {
  return {
    title: editing.title,
    scheduled_at: toLocalInput(editing.scheduled_at),
    duration_min: editing.duration_min,
    focus: editing.focus ?? "",
    notes: editing.notes ?? "",
    status: editing.status,
  };
}

function TrainingDialog({
  editing,
  onSave,
  saving,
}: {
  editing: Training | null;
  onSave: (values: Partial<Training>, recurrence: RecurrenceRule | null) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<TrainingForm>(() =>
    editing ? fromTraining(editing) : emptyTrainingForm(),
  );
  const [recurrence, setRecurrence] = useState<RecurrenceState>(() => emptyRecurrence());

  useEffect(() => {
    setForm(editing ? fromTraining(editing) : emptyTrainingForm());
    setRecurrence(emptyRecurrence());
  }, [editing]);

  const canSave =
    form.title.trim().length > 0 &&
    !!form.scheduled_at &&
    Number.isFinite(form.duration_min) &&
    form.duration_min > 0 &&
    !saving;

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
        title: form.title.trim(),
        scheduled_at: parsed.toISOString(),
        duration_min: Math.max(1, Math.round(form.duration_min)),
        focus: form.focus.trim() || null,
        notes: form.notes.trim() || null,
        status: form.status,
      },
      editing ? null : toRecurrenceRule(recurrence),
    );
  };

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="font-display text-2xl tracking-wider">
          {editing ? "Editar treino" : "Novo treino"}
        </DialogTitle>
        <DialogDescription>
          Defina título, data, duração e foco da sessão.
          {!editing && " Use recorrência para criar uma série semanal."}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="tr-title">Título</Label>
          <Input
            id="tr-title"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Ex: Treino de macro"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="tr-when">Data e hora</Label>
            <Input
              id="tr-when"
              type="datetime-local"
              value={form.scheduled_at}
              onChange={(e) => setForm((f) => ({ ...f, scheduled_at: e.target.value }))}
              required
            />
          </div>
          <div>
            <Label htmlFor="tr-dur">Duração (min)</Label>
            <Input
              id="tr-dur"
              type="number"
              min={1}
              step={5}
              value={form.duration_min}
              onChange={(e) => {
                const n = Number(e.target.value);
                setForm((f) => ({ ...f, duration_min: Number.isFinite(n) ? n : 0 }));
              }}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="tr-focus">Foco</Label>
          <Input
            id="tr-focus"
            value={form.focus}
            onChange={(e) => setForm((f) => ({ ...f, focus: e.target.value }))}
            placeholder="Ex: rotação early game"
          />
        </div>
        <div>
          <Label>Status</Label>
          <Select
            value={form.status}
            onValueChange={(v) => setForm((f) => ({ ...f, status: v as TrainingForm["status"] }))}
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
          <Label htmlFor="tr-notes">Notas</Label>
          <Textarea
            id="tr-notes"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
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
