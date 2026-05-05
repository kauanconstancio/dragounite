import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/shared/ConfirmButton";
import { Library, Trash2, Map } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useCurrentTeam } from "@/hooks/useCurrentTeam";

export const Route = createFileRoute("/jogadas")({
  head: () => ({
    meta: [
      { title: "Jogadas — Battle Arena" },
      { name: "description", content: "Biblioteca de planners salvos para reusar em treinos." },
    ],
  }),
  component: PlaybooksPage,
});

type Playbook = {
  id: string;
  name: string;
  category: "rotation" | "objective" | "lategame" | "earlygame" | "other";
  description: string | null;
  map_data: any;
  created_at: string;
};

const CAT_COLORS: Record<string, string> = {
  rotation: "border-sky-500/40 text-sky-300 bg-sky-500/10",
  objective: "border-gold/40 text-gold bg-gold/10",
  lategame: "border-destructive/40 text-destructive bg-destructive/10",
  earlygame: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10",
  other: "border-border text-muted-foreground",
};

const CAT_LABEL: Record<string, string> = {
  rotation: "Rotação",
  objective: "Objetivo",
  lategame: "Late Game",
  earlygame: "Early Game",
  other: "Outro",
};

function PlaybooksPage() {
  const qc = useQueryClient();
  const { team } = useCurrentTeam();
  const teamId = team?.id;
  const { data: items = [] } = useQuery({
    queryKey: ["playbooks", teamId],
    queryFn: async () => {
      if (!teamId) return [] as Playbook[];
      const { data, error } = await supabase.from("playbooks").select("*").eq("team_id", teamId).order("created_at", { ascending: false });
      if (error) throw error;
      return data as Playbook[];
    },
    enabled: !!teamId,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("playbooks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["playbooks"] }); toast.success("Removido"); },
  });

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-5xl tracking-wider">
            BIBLIOTECA DE <span className="text-gold">JOGADAS</span>
          </h1>
          <p className="mt-2 text-muted-foreground uppercase tracking-widest text-xs">
            {items.length} jogadas salvas
          </p>
        </div>
        <Button asChild size="lg" className="bg-gradient-primary shadow-glow uppercase tracking-wider">
          <Link to="/planner">
            <Map className="mr-2 h-4 w-4" /> Abrir Planner
          </Link>
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg py-16 text-center">
          <Library className="h-10 w-10 text-gold mx-auto mb-3 opacity-60" />
          <p className="text-muted-foreground mb-3">Nenhuma jogada salva ainda.</p>
          <Button variant="outline" asChild>
            <Link to="/planner">Criar no Planner</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((p, i) => {
            const tokens = p.map_data?.tokens?.length ?? 0;
            const strokes = p.map_data?.strokes?.length ?? 0;
            const notes = p.map_data?.notes?.length ?? 0;
            return (
              <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card className="p-5 border-border hover:border-primary/50 shadow-card group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <Badge variant="outline" className={`text-[9px] uppercase ${CAT_COLORS[p.category]}`}>
                        {CAT_LABEL[p.category]}
                      </Badge>
                      <h3 className="font-display text-lg tracking-wider mt-2">{p.name}</h3>
                      {p.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.description}</p>}
                    </div>
                    <ConfirmButton size="icon" variant="ghost" className="hover:text-destructive opacity-0 group-hover:opacity-100" title="Remover jogada?" description="Esta ação não pode ser desfeita." confirmLabel="Remover" onConfirm={() => remove.mutate(p.id)}>
                      <Trash2 className="h-4 w-4" />
                    </ConfirmButton>
                  </div>
                  <div className="mt-3 flex gap-3 text-[10px] uppercase tracking-widest text-muted-foreground">
                    <span>{tokens} tokens</span>
                    <span>{strokes} desenhos</span>
                    <span>{notes} notas</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                    <span className="text-[10px] uppercase text-muted-foreground">
                      {format(new Date(p.created_at), "dd MMM · HH:mm", { locale: ptBR })}
                    </span>
                    <Button size="sm" variant="outline" asChild>
                      <Link to="/planner" search={{ load: p.id } as any}>
                        Carregar
                      </Link>
                    </Button>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
