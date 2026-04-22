import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2, ListOrdered } from "lucide-react";
import { PokemonImage } from "@/components/PokemonImage";
import { PokemonPicker } from "@/components/PokemonPicker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tier-list")({
  head: () => ({
    meta: [
      { title: "Tier List — Battle Arena" },
      { name: "description", content: "Tier list editável dos Pokémon do meta atual." },
    ],
  }),
  component: TierListPage,
});

type TierEntry = {
  id: string;
  pokemon: string;
  tier: "S" | "A" | "B" | "C" | "D";
  lane: string | null;
  notes: string | null;
  patch: string | null;
  position: number;
};

const TIERS: { key: TierEntry["tier"]; color: string }[] = [
  { key: "S", color: "from-gold/40 to-gold/10 border-gold/60 text-gold" },
  { key: "A", color: "from-emerald-500/30 to-emerald-700/10 border-emerald-400/60 text-emerald-300" },
  { key: "B", color: "from-sky-500/30 to-sky-700/10 border-sky-400/60 text-sky-300" },
  { key: "C", color: "from-orange-500/30 to-orange-700/10 border-orange-400/60 text-orange-300" },
  { key: "D", color: "from-destructive/30 to-destructive/10 border-destructive/60 text-destructive" },
];

function TierListPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const { data: entries = [] } = useQuery({
    queryKey: ["tier_list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tier_list").select("*").order("tier").order("position");
      if (error) throw error;
      return data as TierEntry[];
    },
  });

  const grouped = useMemo(() => {
    const out: Record<string, TierEntry[]> = { S: [], A: [], B: [], C: [], D: [] };
    entries.forEach((e) => out[e.tier].push(e));
    return out;
  }, [entries]);

  const add = useMutation({
    mutationFn: async (e: Partial<TierEntry>) => {
      const { error } = await supabase.from("tier_list").insert(e as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tier_list"] }); setOpen(false); toast.success("Adicionado"); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateTier = useMutation({
    mutationFn: async ({ id, tier }: { id: string; tier: TierEntry["tier"] }) => {
      const { error } = await supabase.from("tier_list").update({ tier }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tier_list"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tier_list").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tier_list"] }),
  });

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-5xl tracking-wider">
            TIER <span className="text-gold">LIST</span>
          </h1>
          <p className="mt-2 text-muted-foreground uppercase tracking-widest text-xs">
            Arraste para reorganizar entre tiers
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="bg-gradient-primary shadow-glow uppercase tracking-wider">
              <Plus className="mr-2 h-4 w-4" /> Adicionar
            </Button>
          </DialogTrigger>
          <AddDialog onSave={(e) => add.mutate(e)} saving={add.isPending} />
        </Dialog>
      </div>

      {entries.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg py-16 text-center">
          <ListOrdered className="h-10 w-10 text-gold mx-auto mb-3 opacity-60" />
          <p className="text-muted-foreground">Tier list vazia. Adicione Pokémons.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {TIERS.map(({ key, color }) => (
            <div
              key={key}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (draggedId) {
                  updateTier.mutate({ id: draggedId, tier: key });
                  setDraggedId(null);
                }
              }}
              className={cn(
                "rounded-lg border bg-gradient-to-r p-3 flex items-stretch gap-3 min-h-[100px]",
                color,
              )}
            >
              <div className={cn("font-display text-5xl flex items-center justify-center w-20 shrink-0")}>
                {key}
              </div>
              <div className="flex-1 flex flex-wrap gap-2 items-center">
                {grouped[key].length === 0 ? (
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">Vazio — arraste aqui</span>
                ) : (
                  grouped[key].map((e) => (
                    <div
                      key={e.id}
                      draggable
                      onDragStart={() => setDraggedId(e.id)}
                      className="group relative cursor-grab active:cursor-grabbing rounded-md bg-background/40 border border-border p-1.5 hover:border-gold/60 transition-all"
                      title={e.pokemon}
                    >
                      <div className="h-12 w-12">
                        <PokemonImage name={e.pokemon} withRoleBg />
                      </div>
                      <button
                        type="button"
                        onClick={() => { if (confirm(`Remover ${e.pokemon}?`)) remove.mutate(e.id); }}
                        className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 flex items-center justify-center"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AddDialog({ onSave, saving }: { onSave: (e: Partial<TierEntry>) => void; saving: boolean }) {
  const [pokemon, setPokemon] = useState<string | null>(null);
  const [tier, setTier] = useState<TierEntry["tier"]>("B");
  const [patch, setPatch] = useState("");

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle className="font-display text-2xl tracking-wider">Adicionar à Tier List</DialogTitle>
        <DialogDescription>Escolha o Pokémon e o tier inicial.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <Label>Pokémon</Label>
          <PokemonPicker value={pokemon} onChange={setPokemon} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Tier</Label>
            <Select value={tier} onValueChange={(v) => setTier(v as TierEntry["tier"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIERS.map((t) => <SelectItem key={t.key} value={t.key}>{t.key}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="tl-patch">Patch</Label>
            <Input id="tl-patch" value={patch} onChange={(e) => setPatch(e.target.value)} placeholder="Ex: 1.18" />
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button
          disabled={!pokemon || saving}
          onClick={() => pokemon && onSave({ pokemon, tier, patch: patch || null })}
          className="bg-gradient-primary shadow-glow uppercase tracking-wider"
        >
          {saving ? "Salvando..." : "Adicionar"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
