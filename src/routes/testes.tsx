import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentTeam } from "@/hooks/useCurrentTeam";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ConfirmButton } from "@/components/shared/ConfirmButton";
import { Plus, GripVertical, Trash2, Pencil, User } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/testes")({
  head: () => ({
    meta: [
      { title: "Testes de Jogadores — Battle Arena" },
      { name: "description", content: "Kanban para gerenciar testes/tryouts de jogadores." },
    ],
  }),
  component: TryoutsPage,
});

type Stage = "applied" | "contacted" | "tryout" | "evaluation" | "approved" | "rejected";

type Tryout = {
  id: string;
  team_id: string;
  name: string;
  ign: string | null;
  discord: string | null;
  lane: string | null;
  main_pokemon: string | null;
  notes: string | null;
  stage: Stage;
  position: number;
};

const STAGES: { id: Stage; label: string; color: string }[] = [
  { id: "applied", label: "Aplicados", color: "border-sky-500/40" },
  { id: "contacted", label: "Contatados", color: "border-cyan-500/40" },
  { id: "tryout", label: "Em teste", color: "border-amber-500/40" },
  { id: "evaluation", label: "Avaliação", color: "border-violet-500/40" },
  { id: "approved", label: "Aprovados", color: "border-emerald-500/40" },
  { id: "rejected", label: "Rejeitados", color: "border-rose-500/40" },
];

const LANES = ["top", "jungle", "mid", "bot", "support"];

function TryoutsPage() {
  const { team, canEditTeam } = useCurrentTeam();
  const qc = useQueryClient();

  const tryoutsQ = useQuery({
    queryKey: ["player-tryouts", team?.id],
    queryFn: async (): Promise<Tryout[]> => {
      if (!team?.id) return [];
      const { data, error } = await supabase
        .from("player_tryouts")
        .select("*")
        .eq("team_id", team.id)
        .order("stage")
        .order("position");
      if (error) throw error;
      return (data ?? []) as Tryout[];
    },
    enabled: !!team?.id,
  });

  const [items, setItems] = useState<Tryout[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Tryout | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // Sync local state when query data changes
  useMemo(() => {
    if (tryoutsQ.data) setItems(tryoutsQ.data);
  }, [tryoutsQ.data]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const grouped = useMemo(() => {
    const m = new Map<Stage, Tryout[]>();
    STAGES.forEach((s) => m.set(s.id, []));
    items.forEach((it) => m.get(it.stage)?.push(it));
    return m;
  }, [items]);

  function findContainer(id: string): Stage | null {
    if (STAGES.some((s) => s.id === id)) return id as Stage;
    const it = items.find((i) => i.id === id);
    return it?.stage ?? null;
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function handleDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over) return;
    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);
    const activeContainer = findContainer(activeIdStr);
    const overContainer = findContainer(overIdStr);
    if (!activeContainer || !overContainer || activeContainer === overContainer) return;

    setItems((prev) => {
      const next = [...prev];
      const idx = next.findIndex((i) => i.id === activeIdStr);
      if (idx < 0) return prev;
      next[idx] = { ...next[idx], stage: overContainer };
      return next;
    });
  }

  async function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveId(null);
    if (!over || !canEditTeam) return;

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);
    const overContainer = findContainer(overIdStr);
    if (!overContainer) return;

    const draggedItem = items.find((i) => i.id === activeIdStr);
    if (!draggedItem) return;

    // Reorder within destination column
    const destItems = items.filter((i) => i.stage === overContainer);
    const oldIndex = destItems.findIndex((i) => i.id === activeIdStr);
    const overIndex = STAGES.some((s) => s.id === overIdStr)
      ? destItems.length - 1
      : destItems.findIndex((i) => i.id === overIdStr);

    let reordered = destItems;
    if (oldIndex >= 0 && overIndex >= 0 && oldIndex !== overIndex) {
      reordered = arrayMove(destItems, oldIndex, overIndex);
    }

    // Build new full list
    const others = items.filter((i) => i.stage !== overContainer);
    const newItems = [...others, ...reordered.map((i, idx) => ({ ...i, position: idx }))];
    setItems(newItems);

    // Persist
    const updates = reordered.map((i, idx) => ({
      id: i.id,
      stage: overContainer,
      position: idx,
    }));
    try {
      await Promise.all(
        updates.map((u) =>
          supabase
            .from("player_tryouts")
            .update({ stage: u.stage, position: u.position })
            .eq("id", u.id),
        ),
      );
      qc.invalidateQueries({ queryKey: ["player-tryouts", team?.id] });
    } catch (err: any) {
      toast.error("Erro ao salvar mudança");
      tryoutsQ.refetch();
    }
  }

  if (!team) {
    return <div className="text-muted-foreground text-sm">Selecione uma equipe.</div>;
  }

  const activeItem = activeId ? items.find((i) => i.id === activeId) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-5xl tracking-wider uppercase">
            Testes de <span className="text-primary">Jogadores</span>
          </h1>
          <p className="mt-2 text-muted-foreground uppercase tracking-widest text-xs">
            Gerencie tryouts e candidatos no estilo kanban
          </p>
        </div>
        {canEditTeam && (
          <Button
            size="lg"
            onClick={() => setCreateOpen(true)}
            className="uppercase tracking-wider"
          >
            <Plus className="mr-2 h-4 w-4" /> Novo candidato
          </Button>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {STAGES.map((stage) => {
            const colItems = grouped.get(stage.id) ?? [];
            return (
              <Column
                key={stage.id}
                stage={stage}
                items={colItems}
                onEdit={canEditTeam ? setEditing : undefined}
              />
            );
          })}
        </div>
        <DragOverlay>
          {activeItem && <TryoutCard item={activeItem} dragging />}
        </DragOverlay>
      </DndContext>

      <TryoutDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        teamId={team.id}
        onSaved={() => qc.invalidateQueries({ queryKey: ["player-tryouts", team.id] })}
      />
      <TryoutDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        teamId={team.id}
        existing={editing}
        onSaved={() => {
          setEditing(null);
          qc.invalidateQueries({ queryKey: ["player-tryouts", team.id] });
        }}
      />
    </div>
  );
}

function Column({
  stage,
  items,
  onEdit,
}: {
  stage: { id: Stage; label: string; color: string };
  items: Tryout[];
  onEdit?: (t: Tryout) => void;
}) {
  const { setNodeRef, isOver } = useSortable({ id: stage.id, data: { isColumn: true } });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-lg border bg-card/40 p-3 flex flex-col gap-2 min-h-[200px] transition-colors",
        stage.color,
        isOver && "bg-accent/20",
      )}
    >
      <div className="flex items-center justify-between mb-1 px-1">
        <div className="font-display text-sm uppercase tracking-widest">{stage.label}</div>
        <div className="text-[10px] text-muted-foreground tabular-nums">{items.length}</div>
      </div>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 flex-1">
          {items.map((item) => (
            <SortableTryoutCard key={item.id} item={item} onEdit={onEdit} />
          ))}
          {items.length === 0 && (
            <div className="text-[11px] text-muted-foreground/60 italic text-center py-6">
              vazio
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function SortableTryoutCard({ item, onEdit }: { item: Tryout; onEdit?: (t: Tryout) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div ref={setNodeRef} style={style}>
      <TryoutCard item={item} onEdit={onEdit} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

function TryoutCard({
  item,
  onEdit,
  dragging,
  dragHandleProps,
}: {
  item: Tryout;
  onEdit?: (t: Tryout) => void;
  dragging?: boolean;
  dragHandleProps?: any;
}) {
  return (
    <div
      className={cn(
        "rounded-md border border-border/60 bg-background/60 p-2.5 group",
        dragging && "shadow-lg ring-2 ring-primary",
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none mt-0.5"
          {...dragHandleProps}
          aria-label="Arrastar"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <User className="h-3 w-3 text-muted-foreground shrink-0" />
            <div className="font-display text-sm tracking-wider truncate uppercase">{item.name}</div>
          </div>
          {item.ign && (
            <div className="text-[11px] text-muted-foreground truncate">IGN: {item.ign}</div>
          )}
          <div className="flex flex-wrap gap-1 mt-1.5">
            {item.lane && (
              <span className="px-1.5 py-0.5 rounded bg-primary/15 text-primary text-[9px] uppercase tracking-widest font-display">
                {item.lane}
              </span>
            )}
            {item.main_pokemon && (
              <span className="px-1.5 py-0.5 rounded bg-muted text-[9px] uppercase tracking-widest font-display truncate max-w-[120px]">
                {item.main_pokemon}
              </span>
            )}
          </div>
          {item.notes && (
            <div className="text-[10px] text-muted-foreground mt-1.5 line-clamp-2">{item.notes}</div>
          )}
        </div>
        {onEdit && (
          <button
            type="button"
            onClick={() => onEdit(item)}
            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity"
            aria-label="Editar"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function TryoutDialog({
  open,
  onOpenChange,
  teamId,
  existing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  teamId: string;
  existing?: Tryout | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    ign: "",
    discord: "",
    lane: "",
    main_pokemon: "",
    notes: "",
    stage: "applied" as Stage,
  });
  const [saving, setSaving] = useState(false);

  useMemo(() => {
    if (existing) {
      setForm({
        name: existing.name ?? "",
        ign: existing.ign ?? "",
        discord: existing.discord ?? "",
        lane: existing.lane ?? "",
        main_pokemon: existing.main_pokemon ?? "",
        notes: existing.notes ?? "",
        stage: existing.stage,
      });
    } else if (open && !existing) {
      setForm({ name: "", ign: "", discord: "", lane: "", main_pokemon: "", notes: "", stage: "applied" });
    }
  }, [existing, open]);

  async function save() {
    if (!form.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        team_id: teamId,
        name: form.name.trim(),
        ign: form.ign.trim() || null,
        discord: form.discord.trim() || null,
        lane: form.lane || null,
        main_pokemon: form.main_pokemon.trim() || null,
        notes: form.notes.trim() || null,
        stage: form.stage,
      };
      if (existing) {
        const { error } = await supabase
          .from("player_tryouts")
          .update(payload)
          .eq("id", existing.id);
        if (error) throw error;
        toast.success("Atualizado");
      } else {
        const { error } = await supabase.from("player_tryouts").insert(payload);
        if (error) throw error;
        toast.success("Candidato adicionado");
      }
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!existing) return;
    try {
      const { error } = await supabase.from("player_tryouts").delete().eq("id", existing.id);
      if (error) throw error;
      toast.success("Removido");
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Erro");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display tracking-wider uppercase">
            {existing ? "Editar candidato" : "Novo candidato"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Nome *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>IGN</Label>
              <Input value={form.ign} onChange={(e) => setForm({ ...form, ign: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label>Discord</Label>
              <Input
                value={form.discord}
                onChange={(e) => setForm({ ...form, discord: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Lane</Label>
              <Select
                value={form.lane || "none"}
                onValueChange={(v) => setForm({ ...form, lane: v === "none" ? "" : v })}
              >
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {LANES.map((l) => (
                    <SelectItem key={l} value={l}>{l.toUpperCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Pokémon principal</Label>
              <Input
                value={form.main_pokemon}
                onChange={(e) => setForm({ ...form, main_pokemon: e.target.value })}
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Estágio</Label>
            <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v as Stage })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STAGES.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Notas</Label>
            <Textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          {existing && (
            <ConfirmButton
              variant="outline"
              size="sm"
              onConfirm={remove}
              title="Remover candidato?"
              description="Esta ação não pode ser desfeita."
            >
              <Trash2 className="mr-2 h-4 w-4" /> Remover
            </ConfirmButton>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
