import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
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
import { Plus, Trash2, Pencil, BookOpen, Search, AlertTriangle } from "lucide-react";
import { PokemonImage } from "@/components/PokemonImage";
import { PokemonPicker } from "@/components/PokemonPicker";
import { PokemonDetailPanel } from "@/components/builds/PokemonDetailPanel";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useCurrentTeam } from "@/hooks/useCurrentTeam";
import { getUniteDbPokemon } from "@/server/unite-db.functions";
import type { UniteDbBuild, UniteDbPokemon } from "@/lib/unite-db-types";

export const Route = createFileRoute("/builds")({
  head: () => ({
    meta: [
      { title: "Builds — Battle Arena" },
      { name: "description", content: "Builds oficiais do Pokémon Unite e seus guias customizados." },
    ],
  }),
  component: BuildsPage,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-destructive">Erro ao carregar Builds: {error.message}</p>
        <Button onClick={() => { router.invalidate(); reset(); }}>Tentar novamente</Button>
      </div>
    );
  },
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

const ROLE_FILTERS = ["Todos", "Attacker", "All-Rounder", "Speedster", "Defender", "Supporter"] as const;
type RoleFilter = (typeof ROLE_FILTERS)[number];

function matchesRole(p: UniteDbPokemon, role: RoleFilter): boolean {
  if (role === "Todos") return true;
  return (p.tags?.role ?? "").toLowerCase() === role.toLowerCase();
}

function BuildsPage() {
  const qc = useQueryClient();
  const { team } = useCurrentTeam();
  const teamId = team?.id;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Build | null>(null);
  const [prefill, setPrefill] = useState<Partial<Build> | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("Todos");
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  // ----- API unite-db -----
  const { data: uniteResp, isLoading: uniteLoading } = useQuery({
    queryKey: ["unite-db", "pokemon"],
    queryFn: () => getUniteDbPokemon(),
    staleTime: 30 * 60 * 1000, // 30 min
    gcTime: 60 * 60 * 1000,
  });
  const allPokemon = uniteResp?.data ?? [];
  const uniteError = uniteResp?.error ?? null;

  const filteredPokemon = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allPokemon
      .filter((p) => matchesRole(p, roleFilter))
      .filter((p) => !q || p.display_name.toLowerCase().includes(q))
      .sort((a, b) => a.display_name.localeCompare(b.display_name));
  }, [allPokemon, search, roleFilter]);

  const selected = useMemo<UniteDbPokemon | null>(() => {
    if (selectedSlug) {
      const found = allPokemon.find((p) => p.name === selectedSlug);
      if (found) return found;
    }
    return filteredPokemon[0] ?? null;
  }, [selectedSlug, allPokemon, filteredPokemon]);

  // ----- Builds salvas (Supabase) -----
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

  const teamBuildsForSelected = useMemo(
    () => (selected ? builds.filter((b) => b.pokemon === selected.display_name) : []),
    [builds, selected],
  );

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
      setPrefill(null);
      toast.success("Salvo");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("builds").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["builds"] });
      toast.success("Removido");
    },
  });

  function handleImportBuild(b: UniteDbBuild) {
    if (!selected) return;
    setEditing(null);
    setPrefill({
      pokemon: selected.display_name,
      name: b.name,
      items: b.held_items ?? [],
      battle_item: b.battle_item ?? null,
      emblems: b.emblem_name?.[0] ?? null,
      moveset: { move1: b.upgrade?.[0], move2: b.upgrade?.[1] },
      notes: b.lane ? `Lane: ${b.lane}` : null,
    });
    setOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-5xl tracking-wider">
            BUILDS & <span className="text-gold">GUIAS</span>
          </h1>
          <p className="mt-2 text-muted-foreground uppercase tracking-widest text-xs">
            {allPokemon.length} pokémons · {builds.length} builds salvas
          </p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) {
              setEditing(null);
              setPrefill(null);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button size="lg" className="bg-gradient-primary shadow-glow uppercase tracking-wider">
              <Plus className="mr-2 h-4 w-4" /> Nova build
            </Button>
          </DialogTrigger>
          <BuildDialog editing={editing} prefill={prefill} onSave={(b) => save.mutate(b)} saving={save.isPending} />
        </Dialog>
      </div>

      {uniteError && (
        <Card className="p-3 border-destructive/50 bg-destructive/5 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
          <div className="text-xs">
            <div className="font-medium text-destructive">{uniteError}</div>
            <div className="text-muted-foreground">Suas builds salvas continuam disponíveis abaixo.</div>
          </div>
        </Card>
      )}

      {uniteLoading ? (
        <div className="border border-dashed border-border rounded-lg py-16 text-center text-muted-foreground text-xs uppercase tracking-[0.3em]">
          Carregando dados oficiais...
        </div>
      ) : allPokemon.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-[280px,1fr]">
          {/* Sidebar */}
          <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-hidden flex flex-col">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar Pokémon..."
                className="pl-8 h-9 text-xs"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {ROLE_FILTERS.map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`text-[9px] uppercase tracking-widest px-2 py-1 rounded border transition-colors ${
                    roleFilter === r
                      ? "border-primary text-primary bg-primary/10"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto pr-1 space-y-1">
              {filteredPokemon.map((p) => {
                const active = selected?.name === p.name;
                return (
                  <button
                    key={p.name}
                    onClick={() => setSelectedSlug(p.name)}
                    className={`w-full flex items-center gap-2.5 p-1.5 rounded-md border transition-all text-left ${
                      active
                        ? "border-primary bg-primary/10 shadow-glow"
                        : "border-border/40 hover:border-border hover:bg-accent/40"
                    }`}
                  >
                    <div className="h-9 w-9 shrink-0">
                      <PokemonImage name={p.display_name} withRoleBg />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{p.display_name}</div>
                      <div className="text-[9px] text-muted-foreground uppercase tracking-widest">
                        {p.tier ? `T${p.tier}` : "—"} · {p.builds?.length ?? 0} builds
                      </div>
                    </div>
                  </button>
                );
              })}
              {filteredPokemon.length === 0 && (
                <div className="text-xs text-muted-foreground text-center py-4">Nenhum resultado.</div>
              )}
            </div>
          </aside>

          {/* Painel detalhe */}
          <div className="space-y-8 min-w-0">
            {selected ? (
              <>
                <PokemonDetailPanel pokemon={selected} onImportBuild={handleImportBuild} />

                {teamBuildsForSelected.length > 0 && (
                  <section>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
                      Builds da sua equipe ({teamBuildsForSelected.length})
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {teamBuildsForSelected.map((b, i) => (
                        <motion.div
                          key={b.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                        >
                          <Card className="p-4 border-gold/30 bg-gold/5 group">
                            <div className="flex items-start justify-between gap-2">
                              <div className="font-display text-base tracking-wider">{b.name}</div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setEditing(b); setOpen(true); }}>
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <ConfirmButton
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6 hover:text-destructive"
                                  title="Remover build?"
                                  description="Esta ação não pode ser desfeita."
                                  confirmLabel="Remover"
                                  onConfirm={() => remove.mutate(b.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </ConfirmButton>
                              </div>
                            </div>
                            {b.items && b.items.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {b.items.map((it) => (
                                  <Badge key={it} variant="outline" className="text-[10px] border-border">
                                    {it}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            {b.notes && (
                              <p className="mt-2 text-xs text-muted-foreground italic line-clamp-2">{b.notes}</p>
                            )}
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  </section>
                )}
              </>
            ) : (
              <div className="border border-dashed border-border rounded-lg py-16 text-center">
                <BookOpen className="h-10 w-10 text-gold mx-auto mb-3 opacity-60" />
                <p className="text-muted-foreground">Selecione um Pokémon na lista.</p>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Listagem geral das builds salvas (quando não há dados da API) */}
      {allPokemon.length === 0 && builds.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {builds.map((b) => (
            <Card key={b.id} className="p-5 border-border">
              <div className="font-display text-lg tracking-wider">{b.pokemon}</div>
              <div className="text-xs text-gold uppercase tracking-widest">{b.name}</div>
            </Card>
          ))}
        </div>
      )}

      <p className="text-center text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60 pt-4">
        Dados oficiais via unite-db.com
      </p>
    </div>
  );
}

function BuildDialog({
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
