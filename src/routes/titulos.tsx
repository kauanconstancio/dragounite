import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentTeam } from "@/hooks/useCurrentTeam";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Trophy, Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/titulos")({
  head: () => ({
    meta: [
      { title: "Títulos — Battle Arena" },
      { name: "description", content: "Histórico de conquistas e posições da equipe em campeonatos." },
    ],
  }),
  component: TitlesPage,
});

type Title = {
  id: string;
  team_id: string;
  championship_name: string;
  placement: string;
  year: number | null;
  achieved_at: string | null;
  description: string | null;
  link_url: string | null;
};

function TitlesPage() {
  const { team, isTeamCoach, loading } = useCurrentTeam();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Title | null>(null);

  const titlesQ = useQuery({
    queryKey: ["team-titles", team?.id],
    queryFn: async (): Promise<Title[]> => {
      if (!team?.id) return [];
      const { data, error } = await supabase
        .from("team_titles")
        .select("*")
        .eq("team_id", team.id)
        .order("year", { ascending: false, nullsFirst: false })
        .order("achieved_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as Title[];
    },
    enabled: !!team?.id,
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("team_titles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Título removido");
      qc.invalidateQueries({ queryKey: ["team-titles", team?.id] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao remover"),
  });

  if (loading) return null;
  if (!team) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        Selecione uma equipe para ver os títulos.
      </Card>
    );
  }

  const titles = titlesQ.data ?? [];

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Conquistas</div>
          <h1 className="font-display text-3xl tracking-wider">TÍTULOS</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Histórico de posições da equipe em campeonatos.
          </p>
        </div>
        {isTeamCoach && (
          <Dialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (!v) setEditing(null);
            }}
          >
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Novo título
              </Button>
            </DialogTrigger>
            <TitleDialog
              teamId={team.id}
              editing={editing}
              onClose={() => {
                setOpen(false);
                setEditing(null);
              }}
            />
          </Dialog>
        )}
      </header>

      {titlesQ.isLoading ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Carregando...</Card>
      ) : titles.length === 0 ? (
        <Card className="p-12 text-center">
          <Trophy className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">
            Nenhum título registrado ainda.
            {isTeamCoach && " Clique em \"Novo título\" para adicionar a primeira conquista."}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {titles.map((t) => (
            <Card key={t.id} className="p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 text-primary">
                  <Trophy className="h-5 w-5" />
                  <span className="font-display text-lg tracking-wider">{t.placement}</span>
                </div>
                {(t.year || t.achieved_at) && (
                  <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    {t.year ?? new Date(t.achieved_at!).getFullYear()}
                  </span>
                )}
              </div>
              <div>
                <div className="font-medium text-base leading-tight">{t.championship_name}</div>
                {t.achieved_at && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(t.achieved_at).toLocaleDateString("pt-BR")}
                  </div>
                )}
              </div>
              {t.description && (
                <p className="text-sm text-muted-foreground line-clamp-3">{t.description}</p>
              )}
              <div className="flex items-center justify-between pt-2 mt-auto">
                {t.link_url ? (
                  <a
                    href={t.link_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" /> Link
                  </a>
                ) : <span />}
                {isTeamCoach && (
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditing(t);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (confirm("Remover este título?")) deleteMut.mutate(t.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function TitleDialog({
  teamId,
  editing,
  onClose,
}: {
  teamId: string;
  editing: Title | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [championship, setChampionship] = useState(editing?.championship_name ?? "");
  const [placement, setPlacement] = useState(editing?.placement ?? "");
  const [year, setYear] = useState<string>(editing?.year ? String(editing.year) : "");
  const [achievedAt, setAchievedAt] = useState(editing?.achieved_at ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [linkUrl, setLinkUrl] = useState(editing?.link_url ?? "");

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = {
        team_id: teamId,
        championship_name: championship.trim(),
        placement: placement.trim(),
        year: year ? Number(year) : null,
        achieved_at: achievedAt || null,
        description: description.trim() || null,
        link_url: linkUrl.trim() || null,
      };
      if (editing) {
        const { error } = await supabase.from("team_titles").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("team_titles").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Título atualizado" : "Título adicionado");
      qc.invalidateQueries({ queryKey: ["team-titles", teamId] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar"),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!championship.trim() || !placement.trim()) {
      toast.error("Preencha o nome do campeonato e a posição");
      return;
    }
    saveMut.mutate();
  }

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>{editing ? "Editar título" : "Novo título"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label>Campeonato *</Label>
          <Input
            value={championship}
            onChange={(e) => setChampionship(e.target.value)}
            placeholder="Ex.: Pokémon Unite Championship 2025"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Posição *</Label>
            <Input
              value={placement}
              onChange={(e) => setPlacement(e.target.value)}
              placeholder="Ex.: 1º Lugar"
              required
            />
          </div>
          <div>
            <Label>Ano</Label>
            <Input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="2025"
              min={1990}
              max={2100}
            />
          </div>
        </div>
        <div>
          <Label>Data da conquista</Label>
          <Input type="date" value={achievedAt} onChange={(e) => setAchievedAt(e.target.value)} />
        </div>
        <div>
          <Label>Descrição</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detalhes da campanha, formato, oponentes..."
            rows={3}
          />
        </div>
        <div>
          <Label>Link (opcional)</Label>
          <Input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://..."
            type="url"
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saveMut.isPending}>
            {saveMut.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
