import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Pencil, Sparkles, Target } from "lucide-react";
import { PokemonImage } from "@/components/PokemonImage";
import { PokemonPicker } from "@/components/PokemonPicker";
import { PresentationToggle } from "@/components/shared/PresentationMode";
import { ExportPdfButton } from "@/components/shared/ExportPdfButton";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useCurrentTeam } from "@/hooks/useCurrentTeam";

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
  linked_opponent_id: string | null;
};

type Opponent = { id: string; name: string; tag: string | null };

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
  const { team } = useCurrentTeam();
  const teamId = team?.id;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Comp | null>(null);
  const [presenting, setPresenting] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const { data: comps = [], isLoading } = useQuery({
    queryKey: ["compositions", teamId],
    queryFn: async () => {
      if (!teamId) return [] as Comp[];
      const { data, error } = await supabase.from("compositions").select("*").eq("team_id", teamId).order("created_at", { ascending: false });
      if (error) throw error;
      return data as Comp[];
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
    mutationFn: async (c: Partial<Comp>) => {
      if (!teamId) throw new Error("Selecione uma equipe");
      if (editing) {
        const { error } = await supabase.from("compositions").update(c).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("compositions").insert({ ...c, team_id: teamId } as any);
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
        <div className="flex gap-2 presentation-hide">
          <ExportPdfButton targetRef={exportRef} filename="composicoes.pdf" />
          <PresentationToggle active={presenting} onToggle={() => setPresenting((p) => !p)} />
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
            <DialogTrigger asChild>
              <Button size="lg" className="bg-gradient-primary shadow-glow uppercase tracking-wider">
                <Plus className="mr-2 h-4 w-4" /> Nova comp
              </Button>
            </DialogTrigger>
            <CompDialog key={editing?.id ?? "new"} editing={editing} opponents={opponents} onSave={(c) => save.mutate(c)} saving={save.isPending} />
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-20">Carregando...</div>
      ) : comps.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg py-16 text-center">
          <Sparkles className="h-10 w-10 text-gold mx-auto mb-3 opacity-60" />
          <p className="text-muted-foreground">Nenhuma composição ainda. Crie a primeira!</p>
        </div>
      ) : (
        <div ref={exportRef} className="grid gap-5 md:grid-cols-2">
          {comps.map((c, i) => {
            const opp = c.linked_opponent_id ? opponentMap.get(c.linked_opponent_id) : null;
            return (
              <motion.div key={c.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card className="p-6 border-border hover:border-primary/50 shadow-card group h-full">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-display text-2xl tracking-wider">{c.name}</h3>
                        {c.tier && <Badge variant="outline" className={`font-display text-base ${TIER_COLORS[c.tier] || TIER_COLORS.B}`}>{c.tier}</Badge>}
                        {opp && (
                          <Badge variant="outline" className="text-[10px] uppercase tracking-wider border-primary/40 text-primary">
                            <Target className="h-2.5 w-2.5 mr-1" /> vs {opp.name}
                          </Badge>
                        )}
                      </div>
                      {c.strategy && <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">{c.strategy}</p>}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity presentation-hide">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(c); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="hover:text-destructive" onClick={() => { if (confirm("Remover?")) remove.mutate(c.id); }}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-5 gap-2">
                    {LANES.map((lane) => {
                      const pkm = c[lane.key] as string | null;
                      return (
                        <div key={lane.key} className="text-center">
                          <div className="aspect-square mb-1.5" title={pkm ?? undefined}>
                            {pkm ? (
                              <PokemonImage name={pkm} withRoleBg />
                            ) : (
                              <div className="w-full h-full rounded-md bg-muted/30 border border-dashed border-border flex items-center justify-center">
                                <span className="font-display text-xs text-muted-foreground">—</span>
                              </div>
                            )}
                          </div>
                          <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{lane.label}</div>
                          {pkm && <div className="text-[9px] leading-tight mt-0.5 truncate">{pkm}</div>}
                        </div>
                      );
                    })}
                  </div>

                  {c.notes && <p className="mt-4 text-sm text-muted-foreground italic border-t border-border pt-3">{c.notes}</p>}
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

type CompForm = {
  name: string;
  tier: string;
  strategy: string;
  top_pokemon: string | null;
  jungle_pokemon: string | null;
  mid_pokemon: string | null;
  bot_pokemon: string | null;
  support_pokemon: string | null;
  notes: string;
  linked_opponent_id: string | null;
};

function emptyForm(): CompForm {
  return {
    name: "",
    tier: "B",
    strategy: "",
    top_pokemon: null,
    jungle_pokemon: null,
    mid_pokemon: null,
    bot_pokemon: null,
    support_pokemon: null,
    notes: "",
    linked_opponent_id: null,
  };
}

function fromComp(c: Comp): CompForm {
  return {
    name: c.name,
    tier: c.tier ?? "B",
    strategy: c.strategy ?? "",
    top_pokemon: c.top_pokemon,
    jungle_pokemon: c.jungle_pokemon,
    mid_pokemon: c.mid_pokemon,
    bot_pokemon: c.bot_pokemon,
    support_pokemon: c.support_pokemon,
    notes: c.notes ?? "",
    linked_opponent_id: c.linked_opponent_id,
  };
}

function CompDialog({ editing, opponents, onSave, saving }: { editing: Comp | null; opponents: Opponent[]; onSave: (c: Partial<Comp>) => void; saving: boolean }) {
  const [form, setForm] = useState<CompForm>(() => editing ? fromComp(editing) : emptyForm());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave({
      name: form.name.trim(),
      tier: form.tier,
      strategy: form.strategy.trim() || null,
      top_pokemon: form.top_pokemon,
      jungle_pokemon: form.jungle_pokemon,
      mid_pokemon: form.mid_pokemon,
      bot_pokemon: form.bot_pokemon,
      support_pokemon: form.support_pokemon,
      notes: form.notes.trim() || null,
      linked_opponent_id: form.linked_opponent_id,
    });
  };

  return (
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="font-display text-2xl tracking-wider">{editing ? "Editar comp" : "Nova comp"}</DialogTitle>
        <DialogDescription>Defina lanes, tier e oponente alvo (opcional).</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="comp-name">Nome</Label>
            <Input id="comp-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex: Dive Comp" required />
          </div>
          <div>
            <Label htmlFor="comp-tier">Tier</Label>
            <Select value={form.tier} onValueChange={(v) => setForm((f) => ({ ...f, tier: v }))}>
              <SelectTrigger id="comp-tier"><SelectValue /></SelectTrigger>
              <SelectContent>{["S", "A", "B", "C"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label htmlFor="comp-strategy">Estratégia</Label>
          <Input id="comp-strategy" value={form.strategy} onChange={(e) => setForm((f) => ({ ...f, strategy: e.target.value }))} placeholder="Ex: Snowball early" />
        </div>

        <div>
          <Label htmlFor="comp-opp">Linkar a oponente (opcional)</Label>
          <Select
            value={form.linked_opponent_id ?? "none"}
            onValueChange={(v) => setForm((f) => ({ ...f, linked_opponent_id: v === "none" ? null : v }))}
          >
            <SelectTrigger id="comp-opp"><SelectValue placeholder="Nenhum" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum</SelectItem>
              {opponents.map((o) => (
                <SelectItem key={o.id} value={o.id}>{o.name}{o.tag ? ` [${o.tag}]` : ""}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {LANES.map((lane) => (
            <div key={lane.key}>
              <Label>{lane.label}</Label>
              <PokemonPicker
                value={form[lane.key as keyof CompForm] as string | null}
                onChange={(v) => setForm((f) => ({ ...f, [lane.key]: v }))}
              />
            </div>
          ))}
        </div>

        <div>
          <Label htmlFor="comp-notes">Notas</Label>
          <Textarea id="comp-notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={3} />
        </div>

        <DialogFooter>
          <Button type="submit" className="bg-gradient-primary shadow-glow uppercase tracking-wider" disabled={!form.name.trim() || saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
