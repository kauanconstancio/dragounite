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
import { Plus, Trash2, Pencil, Sparkles } from "lucide-react";
import { POKEMON_LIST } from "@/lib/pokemon";
import { toast } from "sonner";
import { motion } from "framer-motion";

export const Route = createFileRoute("/composicoes")({
  head: () => ({
    meta: [
      { title: "Composições — Battle Arena" },
      { name: "description", content: "Comps planejadas pelo coach." },
    ],
  }),
  component: CompsPage,
});

type Comp = {
  id: string;
  name: string;
  strategy: string | null;
  top_pokemon: string | null;
  jungle_pokemon: string | null;
  mid_pokemon: string | null;
  bot_pokemon: string | null;
  support_pokemon: string | null;
  tier: string | null;
  notes: string | null;
};

const TIER_COLORS: Record<string, string> = {
  S: "bg-gold/20 text-gold border-gold/40",
  A: "bg-primary/20 text-primary border-primary/40",
  B: "bg-accent text-foreground border-border",
  C: "bg-muted text-muted-foreground border-border",
};

const LANES: { key: keyof Comp; label: string }[] = [
  { key: "top_pokemon", label: "Top" },
  { key: "jungle_pokemon", label: "Jungle" },
  { key: "mid_pokemon", label: "Mid" },
  { key: "bot_pokemon", label: "Bot" },
  { key: "support_pokemon", label: "Support" },
];

function CompsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Comp | null>(null);

  const { data: comps = [], isLoading } = useQuery({
    queryKey: ["compositions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("compositions").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Comp[];
    },
  });

  const save = useMutation({
    mutationFn: async (c: Partial<Comp>) => {
      if (editing) {
        const { error } = await supabase.from("compositions").update(c).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("compositions").insert(c as any);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["compositions"] }); setOpen(false); setEditing(null); toast.success("Salvo"); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("compositions").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["compositions"] }); toast.success("Removido"); },
  });

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-5xl tracking-wider">
            COMPOSIÇÕES <span className="text-gold">DO TIME</span>
          </h1>
          <p className="mt-2 text-muted-foreground uppercase tracking-widest text-xs">
            {comps.length} comps registradas
          </p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button size="lg" className="bg-gradient-primary shadow-glow uppercase tracking-wider">
              <Plus className="mr-2 h-4 w-4" /> Nova comp
            </Button>
          </DialogTrigger>
          <CompDialog editing={editing} onSave={(c) => save.mutate(c)} saving={save.isPending} />
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-20">Carregando...</div>
      ) : comps.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg py-16 text-center">
          <Sparkles className="h-10 w-10 text-gold mx-auto mb-3 opacity-60" />
          <p className="text-muted-foreground">Nenhuma composição ainda. Crie a primeira!</p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {comps.map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Card className="p-6 border-border hover:border-primary/50 shadow-card group h-full">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display text-2xl tracking-wider">{c.name}</h3>
                      {c.tier && <Badge variant="outline" className={`font-display text-base ${TIER_COLORS[c.tier] || TIER_COLORS.B}`}>{c.tier}</Badge>}
                    </div>
                    {c.strategy && <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">{c.strategy}</p>}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(c); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="hover:text-destructive" onClick={() => { if (confirm("Remover?")) remove.mutate(c.id); }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-5 gap-2">
                  {LANES.map((lane) => {
                    const pkm = c[lane.key] as string | null;
                    return (
                      <div key={lane.key} className="text-center">
                        <div className="aspect-square rounded-md bg-gradient-primary/30 border border-border flex items-center justify-center p-1 mb-1.5 shadow-card">
                          <span className="font-display text-[10px] leading-tight text-center">{pkm || "—"}</span>
                        </div>
                        <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{lane.label}</div>
                      </div>
                    );
                  })}
                </div>

                {c.notes && <p className="mt-4 text-sm text-muted-foreground italic border-t border-border pt-3">{c.notes}</p>}
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function CompDialog({ editing, onSave, saving }: { editing: Comp | null; onSave: (c: Partial<Comp>) => void; saving: boolean }) {
  const [form, setForm] = useState<any>(editing ?? { tier: "B" });
  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle className="font-display text-2xl tracking-wider">{editing ? "Editar comp" : "Nova comp"}</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Nome</Label><Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Dive Comp" /></div>
          <div>
            <Label>Tier</Label>
            <Select value={form.tier ?? "B"} onValueChange={(v) => setForm({ ...form, tier: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["S", "A", "B", "C"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div><Label>Estratégia</Label><Input value={form.strategy ?? ""} onChange={(e) => setForm({ ...form, strategy: e.target.value })} placeholder="Ex: Snowball early" /></div>

        <div className="grid grid-cols-2 gap-3">
          {LANES.map((lane) => (
            <div key={lane.key}>
              <Label>{lane.label}</Label>
              <Select value={(form[lane.key] as string) ?? ""} onValueChange={(v) => setForm({ ...form, [lane.key]: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {POKEMON_LIST.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        <div><Label>Notas</Label><Textarea value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} /></div>
      </div>
      <DialogFooter>
        <Button
          className="bg-gradient-primary shadow-glow uppercase tracking-wider"
          disabled={!form.name || saving}
          onClick={() => onSave(form)}
        >
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
