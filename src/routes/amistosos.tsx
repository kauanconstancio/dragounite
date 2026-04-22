import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Pencil, Swords, Trophy } from "lucide-react";
import { format, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { motion } from "framer-motion";

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
  scheduled_at: string;
  best_of: number;
  result: "pending" | "win" | "loss" | "draw";
  score_us: number;
  score_them: number;
  status: "scheduled" | "completed" | "cancelled";
  notes: string | null;
};

const RESULT_STYLES: Record<string, string> = {
  win: "bg-gold/20 text-gold border-gold/40",
  loss: "bg-destructive/20 text-destructive border-destructive/40",
  draw: "bg-muted text-muted-foreground border-border",
  pending: "bg-primary/20 text-primary border-primary/40",
};
const RESULT_LABEL: Record<string, string> = { win: "Vitória", loss: "Derrota", draw: "Empate", pending: "Pendente" };

function ScrimsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Scrim | null>(null);

  const { data: scrims = [], isLoading } = useQuery({
    queryKey: ["scrims"],
    queryFn: async () => {
      const { data, error } = await supabase.from("scrims").select("*").order("scheduled_at", { ascending: false });
      if (error) throw error;
      return data as Scrim[];
    },
  });

  const save = useMutation({
    mutationFn: async (s: Partial<Scrim>) => {
      if (editing) {
        const { error } = await supabase.from("scrims").update(s).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("scrims").insert(s as any);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["scrims"] }); setOpen(false); setEditing(null); toast.success("Salvo"); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("scrims").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["scrims"] }); toast.success("Removido"); },
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
          <DialogTrigger asChild>
            <Button size="lg" className="bg-gradient-primary shadow-glow uppercase tracking-wider">
              <Plus className="mr-2 h-4 w-4" /> Novo amistoso
            </Button>
          </DialogTrigger>
          <ScrimDialog editing={editing} onSave={(s) => save.mutate(s)} saving={save.isPending} />
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Vitórias" value={wins} accent="gold" icon={Trophy} />
        <StatCard label="Derrotas" value={losses} accent="primary" icon={Swords} />
        <StatCard label="Win rate" value={scrims.filter(s => s.result !== "pending").length > 0 ? `${Math.round((wins / scrims.filter(s => s.result !== "pending").length) * 100)}%` : "—"} accent="gold" icon={Trophy} />
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-20">Carregando...</div>
      ) : (
        <>
          <ScrimList title="Próximos" items={upcoming} onEdit={(s) => { setEditing(s); setOpen(true); }} onDelete={(id) => remove.mutate(id)} />
          <ScrimList title="Histórico" items={past} onEdit={(s) => { setEditing(s); setOpen(true); }} onDelete={(id) => remove.mutate(id)} muted />
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

function ScrimList({ title, items, onEdit, onDelete, muted }: { title: string; items: Scrim[]; onEdit: (s: Scrim) => void; onDelete: (id: string) => void; muted?: boolean }) {
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
                      <h3 className="font-display text-xl tracking-wider">{s.opponent}</h3>
                      <Badge variant="outline" className={`text-[10px] uppercase tracking-wider ${RESULT_STYLES[s.result]}`}>{RESULT_LABEL[s.result]}</Badge>
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wider border-border">BO{s.best_of}</Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {format(new Date(s.scheduled_at), "EEE, dd MMM · HH:mm", { locale: ptBR })}
                    </div>
                    {s.notes && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{s.notes}</p>}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" onClick={() => onEdit(s)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="hover:text-destructive" onClick={() => { if (confirm("Remover?")) onDelete(s.id); }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}

function toLocalInput(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function ScrimDialog({ editing, onSave, saving }: { editing: Scrim | null; onSave: (s: Partial<Scrim>) => void; saving: boolean }) {
  const [form, setForm] = useState<any>(
    editing
      ? { ...editing, scheduled_at: toLocalInput(editing.scheduled_at) }
      : { best_of: 3, result: "pending", status: "scheduled", score_us: 0, score_them: 0, scheduled_at: toLocalInput(new Date().toISOString()) }
  );
  return (
    <DialogContent>
      <DialogHeader><DialogTitle className="font-display text-2xl tracking-wider">{editing ? "Editar amistoso" : "Novo amistoso"}</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <div><Label>Oponente</Label><Input value={form.opponent ?? ""} onChange={(e) => setForm({ ...form, opponent: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Data e hora</Label><Input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} /></div>
          <div>
            <Label>Best of</Label>
            <Select value={String(form.best_of)} onValueChange={(v) => setForm({ ...form, best_of: Number(v) })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{[1, 3, 5, 7].map((n) => <SelectItem key={n} value={String(n)}>BO{n}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div><Label>Nós</Label><Input type="number" value={form.score_us} onChange={(e) => setForm({ ...form, score_us: Number(e.target.value) })} /></div>
          <div><Label>Eles</Label><Input type="number" value={form.score_them} onChange={(e) => setForm({ ...form, score_them: Number(e.target.value) })} /></div>
          <div>
            <Label>Resultado</Label>
            <Select value={form.result} onValueChange={(v) => setForm({ ...form, result: v })}>
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
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="scheduled">Agendado</SelectItem>
              <SelectItem value="completed">Concluído</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>Notas</Label><Textarea value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} /></div>
      </div>
      <DialogFooter>
        <Button
          className="bg-gradient-primary shadow-glow uppercase tracking-wider"
          disabled={!form.opponent || !form.scheduled_at || saving}
          onClick={() => onSave({ ...form, scheduled_at: new Date(form.scheduled_at).toISOString() })}
        >
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
