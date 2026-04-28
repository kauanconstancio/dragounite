import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/shared/ConfirmButton";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, BookOpen, Pencil, Plus, Trash2 } from "lucide-react";
import { PokemonDetailPanel } from "@/components/builds/PokemonDetailPanel";
import { BuildDialog, type Build } from "@/components/builds/BuildDialog";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useCurrentTeam } from "@/hooks/useCurrentTeam";
import { getUniteDbPokemon } from "@/server/unite-db.functions";
import type { UniteDbBuild } from "@/lib/unite-db-types";

export const Route = createFileRoute("/builds/$pokemon")({
  head: ({ params }) => ({
    meta: [
      { title: `${decodeURIComponent(params.pokemon)} — Builds` },
      { name: "description", content: `Builds, skills e itens de ${decodeURIComponent(params.pokemon)} no Pokémon Unite.` },
    ],
  }),
  component: PokemonBuildsPage,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-destructive">Erro: {error.message}</p>
        <Button onClick={() => { router.invalidate(); reset(); }}>Tentar novamente</Button>
      </div>
    );
  },
  notFoundComponent: () => (
    <div className="p-8 text-center space-y-3">
      <p className="text-muted-foreground">Pokémon não encontrado.</p>
      <Link to="/builds" className="text-primary underline text-sm">Voltar para builds</Link>
    </div>
  ),
});

function PokemonBuildsPage() {
  const { pokemon: pokemonSlug } = Route.useParams();
  const qc = useQueryClient();
  const { team } = useCurrentTeam();
  const teamId = team?.id;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Build | null>(null);
  const [prefill, setPrefill] = useState<Partial<Build> | null>(null);

  const { data: uniteResp, isLoading } = useQuery({
    queryKey: ["unite-db", "pokemon"],
    queryFn: () => getUniteDbPokemon(),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
  const allPokemon = uniteResp?.data ?? [];
  const selected = useMemo(
    () => allPokemon.find((p) => p.name === pokemonSlug) ?? null,
    [allPokemon, pokemonSlug],
  );

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

  if (isLoading) {
    return (
      <div className="border border-dashed border-border rounded-lg py-16 text-center text-muted-foreground text-xs uppercase tracking-[0.3em]">
        Carregando...
      </div>
    );
  }

  if (!selected) {
    return (
      <div className="space-y-4">
        <Link to="/builds" className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> Voltar
        </Link>
        <div className="border border-dashed border-border rounded-lg py-16 text-center">
          <BookOpen className="h-10 w-10 text-gold mx-auto mb-3 opacity-60" />
          <p className="text-muted-foreground">Pokémon não encontrado nos dados oficiais.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link to="/builds" className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> Todos os Pokémons
        </Link>
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
            <Button size="sm" className="bg-gradient-primary shadow-glow uppercase tracking-wider">
              <Plus className="mr-2 h-4 w-4" /> Nova build
            </Button>
          </DialogTrigger>
          <BuildDialog editing={editing} prefill={prefill} onSave={(b) => save.mutate(b)} saving={save.isPending} />
        </Dialog>
      </div>

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
    </div>
  );
}
