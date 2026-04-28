import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PokemonPicker } from "@/components/PokemonPicker";

export type Build = {
  id: string;
  pokemon: string;
  name: string;
  items: string[] | null;
  battle_item: string | null;
  emblems: string | null;
  moveset: { move1?: string; move2?: string } | null;
  notes: string | null;
};

export function BuildDialog({
  editing,
  prefill,
  onSave,
  saving,
}: {
  editing: Build | null;
  prefill?: Partial<Build> | null;
  onSave: (b: Partial<Build>) => void;
  saving: boolean;
}) {
  const base = editing ?? prefill ?? null;
  const [form, setForm] = useState({
    pokemon: base?.pokemon ?? "",
    name: base?.name ?? "",
    items_text: base?.items?.join(", ") ?? "",
    battle_item: base?.battle_item ?? "",
    emblems: base?.emblems ?? "",
    move1: base?.moveset?.move1 ?? "",
    move2: base?.moveset?.move2 ?? "",
    notes: base?.notes ?? "",
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
          {editing ? "Editar build" : prefill ? "Importar build" : "Nova build"}
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
