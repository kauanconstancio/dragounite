import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
import { Plus, Trash2, Pencil, BookOpen } from "lucide-react";
import { PokemonImage } from "@/components/PokemonImage";
import { PokemonPicker } from "@/components/PokemonPicker";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useCurrentTeam } from "@/hooks/useCurrentTeam";

export const Route = createFileRoute("/builds")({
  head: () => ({
    meta: [
      { title: "Builds — Battle Arena" },
      { name: "description", content: "Guias de itens, batidas, emblemas e movesets por Pokémon." },
    ],
  }),
  component: BuildsPage,
});

type Build = {
  id: string;
  pokemon: string;
  name: string;
  items: string[] | null;
  battle_item: string | null;
  emblems: string | null;
  moveset: { move1?: string; move2?: string } | null;
  notes: string | null;
};

function BuildsPage() {
  const qc = useQueryClient();
  const { team } = useCurrentTeam();
  const teamId = team?.id;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Build | null>(null);

  const { data: builds = [] } = useQuery({
    queryKey: ["builds", teamId],
    queryFn: async () => {
      if (!teamId) return [] as Build[];
      const { data, error } = await supabase.from("builds").select("*").eq("team_id", teamId).order("pokemon");
      if (error) throw error;
      return data as Build[];
    },
    enabled: !!teamId,
  });

  const save = useMutation({
    mutationFn: async (b: Partial<Build>) => {
      if (!teamId) throw new Error("Selecione uma equipe");
      if (editing) {
        const { error } = await supabase.from("builds").update(b as any).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("builds").insert({ ...b, team_id: teamId } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["builds"] });
      setOpen(false);
      setEditing(null);
      toast.success("Salvo");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("builds").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["builds"] }); toast.success("Removido"); },
  });

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-5xl tracking-wider">
            BUILDS & <span className="text-gold">GUIAS</span>
          </h1>
          <p className="mt-2 text-muted-foreground uppercase tracking-widest text-xs">
            {builds.length} guias cadastrados
          </p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button size="lg" className="bg-gradient-primary shadow-glow uppercase tracking-wider">
              <Plus className="mr-2 h-4 w-4" /> Nova build
            </Button>
          </DialogTrigger>
          <BuildDialog editing={editing} onSave={(b) => save.mutate(b)} saving={save.isPending} />
        </Dialog>
      </div>

      {builds.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg py-16 text-center">
          <BookOpen className="h-10 w-10 text-gold mx-auto mb-3 opacity-60" />
          <p className="text-muted-foreground">Nenhuma build ainda.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {builds.map((b, i) => (
            <motion.div key={b.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className="p-5 border-border hover:border-primary/50 shadow-card group h-full">
                <div className="flex items-start gap-3">
                  <div className="h-16 w-16 shrink-0">
                    <PokemonImage name={b.pokemon} withRoleBg />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-lg tracking-wider truncate">{b.pokemon}</div>
                    <div className="text-xs text-gold uppercase tracking-widest truncate">{b.name}</div>
                  </div>
                  <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(b); setOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <ConfirmButton
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 hover:text-destructive"
                      title="Remover build?"
                      description="Esta ação não pode ser desfeita."
                      confirmLabel="Remover"
                      onConfirm={() => remove.mutate(b.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </ConfirmButton>
                  </div>
                </div>

                {b.items && b.items.length > 0 && (
                  <div className="mt-4">
                    <div className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1">Hold Items</div>
                    <div className="flex flex-wrap gap-1">
                      {b.items.map((it) => (
                        <Badge key={it} variant="outline" className="text-[10px] border-border">{it}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {(b.moveset?.move1 || b.moveset?.move2) && (
                  <div className="mt-3 flex gap-2 text-xs">
                    {b.moveset?.move1 && (
                      <Badge variant="outline" className="border-primary/40 text-primary text-[10px]">{b.moveset.move1}</Badge>
                    )}
                    {b.moveset?.move2 && (
                      <Badge variant="outline" className="border-primary/40 text-primary text-[10px]">{b.moveset.move2}</Badge>
                    )}
                  </div>
                )}

                <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] uppercase tracking-widest">
                  {b.battle_item && (
                    <div>
                      <div className="text-muted-foreground">Battle Item</div>
                      <div className="text-foreground">{b.battle_item}</div>
                    </div>
                  )}
                  {b.emblems && (
                    <div>
                      <div className="text-muted-foreground">Emblemas</div>
                      <div className="text-foreground truncate">{b.emblems}</div>
                    </div>
                  )}
                </div>

                {b.notes && <p className="mt-3 text-xs text-muted-foreground italic line-clamp-2 border-t border-border pt-2">{b.notes}</p>}
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function BuildDialog({ editing, onSave, saving }: { editing: Build | null; onSave: (b: Partial<Build>) => void; saving: boolean }) {
  const [form, setForm] = useState({
    pokemon: editing?.pokemon ?? "",
    name: editing?.name ?? "",
    items_text: editing?.items?.join(", ") ?? "",
    battle_item: editing?.battle_item ?? "",
    emblems: editing?.emblems ?? "",
    move1: editing?.moveset?.move1 ?? "",
    move2: editing?.moveset?.move2 ?? "",
    notes: editing?.notes ?? "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.pokemon || !form.name.trim()) return;
    onSave({
      pokemon: form.pokemon,
      name: form.name,
      items: form.items_text.split(",").map((s) => s.trim()).filter(Boolean),
      battle_item: form.battle_item || null,
      emblems: form.emblems || null,
      moveset: { move1: form.move1 || undefined, move2: form.move2 || undefined },
      notes: form.notes || null,
    });
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle className="font-display text-2xl tracking-wider">
          {editing ? "Editar build" : "Nova build"}
        </DialogTitle>
        <DialogDescription>Itens, batidas, emblemas e moveset.</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Pokémon</Label>
            <PokemonPicker value={form.pokemon} onChange={(v) => setForm((f) => ({ ...f, pokemon: v ?? "" }))} />
          </div>
          <div>
            <Label htmlFor="bd-name">Nome da build</Label>
            <Input id="bd-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex: Snowball Speed" required />
          </div>
        </div>
        <div>
          <Label htmlFor="bd-items">Hold Items (3, separados por vírgula)</Label>
          <Input id="bd-items" value={form.items_text} onChange={(e) => setForm((f) => ({ ...f, items_text: e.target.value }))} placeholder="Ex: Muscle Band, Scope Lens, Razor Claw" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="bd-battle">Battle Item</Label>
            <Input id="bd-battle" value={form.battle_item} onChange={(e) => setForm((f) => ({ ...f, battle_item: e.target.value }))} placeholder="Ex: Eject Button" />
          </div>
          <div>
            <Label htmlFor="bd-emb">Emblemas</Label>
            <Input id="bd-emb" value={form.emblems} onChange={(e) => setForm((f) => ({ ...f, emblems: e.target.value }))} placeholder="Ex: 6 marrom + 3 verde" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="bd-mv1">Move 1</Label>
            <Input id="bd-mv1" value={form.move1} onChange={(e) => setForm((f) => ({ ...f, move1: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="bd-mv2">Move 2</Label>
            <Input id="bd-mv2" value={form.move2} onChange={(e) => setForm((f) => ({ ...f, move2: e.target.value }))} />
          </div>
        </div>
        <div>
          <Label htmlFor="bd-notes">Notas</Label>
          <Textarea id="bd-notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={3} />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={!form.pokemon || !form.name.trim() || saving} className="bg-gradient-primary shadow-glow uppercase tracking-wider">
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
