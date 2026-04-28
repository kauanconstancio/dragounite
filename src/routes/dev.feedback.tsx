import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/shared/ConfirmButton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Lightbulb,
  Bug,
  Zap,
  Search,
  MessageSquare,
  Save,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export const Route = createFileRoute("/dev/feedback")({
  component: DevFeedbackPage,
});

const TYPE_META: Record<string, { label: string; icon: any; color: string; border: string }> = {
  suggestion: { label: "Sugestão", icon: Lightbulb, color: "text-gold", border: "border-gold/40" },
  bug: { label: "Bug", icon: Bug, color: "text-destructive", border: "border-destructive/40" },
  improvement: { label: "Melhoria", icon: Zap, color: "text-primary", border: "border-primary/40" },
};

const STATUS_OPTIONS = [
  { value: "open", label: "Aberto" },
  { value: "in_review", label: "Em análise" },
  { value: "resolved", label: "Resolvido" },
  { value: "closed", label: "Fechado" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Baixa" },
  { value: "medium", label: "Média" },
  { value: "high", label: "Alta" },
];

function DevFeedbackPage() {
  const qc = useQueryClient();
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<any | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["dev-feedback-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feedback")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const userIds = useMemo(
    () => Array.from(new Set(items.map((i: any) => i.user_id).filter(Boolean))),
    [items],
  );

  const { data: profiles = [] } = useQuery({
    queryKey: ["dev-feedback-profiles", userIds.join(",")],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);
      if (error) throw error;
      return data ?? [];
    },
    enabled: userIds.length > 0,
  });

  const profileMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of profiles as any[]) m.set(p.user_id, p.display_name ?? "—");
    return m;
  }, [profiles]);

  const filtered = useMemo(() => {
    return items.filter((it: any) => {
      if (filterType !== "all" && it.type !== filterType) return false;
      if (filterStatus !== "all" && it.status !== filterStatus) return false;
      if (search) {
        const s = search.toLowerCase();
        if (
          !it.title.toLowerCase().includes(s) &&
          !it.description.toLowerCase().includes(s)
        )
          return false;
      }
      return true;
    });
  }, [items, filterType, filterStatus, search]);

  const updateMutation = useMutation({
    mutationFn: async (payload: { id: string; status: string; priority: string; admin_notes: string }) => {
      const { id, status, priority, admin_notes } = payload;
      const { error } = await supabase
        .from("feedback")
        .update({ status: status as any, priority: priority as any, admin_notes })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Feedback atualizado.");
      qc.invalidateQueries({ queryKey: ["dev-feedback-all"] });
      qc.invalidateQueries({ queryKey: ["feedback"] });
      setEditing(null);
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao atualizar."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("feedback").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Feedback removido.");
      qc.invalidateQueries({ queryKey: ["dev-feedback-all"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao remover."),
  });

  return (
    <div className="space-y-6">
      <Card className="p-4 border-border bg-card/70">
        <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título ou descrição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="suggestion">💡 Sugestões</SelectItem>
              <SelectItem value="bug">🐛 Bugs</SelectItem>
              <SelectItem value="improvement">⚡ Melhorias</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="mt-3 text-[10px] uppercase tracking-widest text-muted-foreground">
          {filtered.length} de {items.length} feedback{items.length !== 1 ? "s" : ""}
        </div>
      </Card>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-12 text-sm uppercase tracking-widest">
          Carregando...
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhum feedback encontrado.</p>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 auto-rows-fr items-stretch">
          {filtered.map((item: any) => {
            const meta = TYPE_META[item.type];
            const Icon = meta.icon;
            const author = profileMap.get(item.user_id) ?? "Usuário";
            return (
              <Card key={item.id} className={`p-5 border ${meta.border} shadow-card flex flex-col h-full`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${meta.color}`} />
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      {meta.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] uppercase tracking-widest">
                      {STATUS_OPTIONS.find((s) => s.value === item.status)?.label}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] uppercase tracking-widest">
                      {PRIORITY_OPTIONS.find((p) => p.value === item.priority)?.label}
                    </Badge>
                  </div>
                </div>

                <h3 className="font-display text-lg tracking-wide mb-1">{item.title}</h3>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                  Por {author} · {format(new Date(item.created_at), "dd MMM yyyy · HH:mm", { locale: ptBR })}
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap flex-1">
                  {item.description}
                </p>

                {item.admin_notes && (
                  <div className="mt-3 p-3 rounded-md border border-gold/30 bg-gold/5">
                    <div className="text-[10px] uppercase tracking-widest text-gold mb-1">
                      Resposta da equipe
                    </div>
                    <p className="text-sm text-foreground/90 whitespace-pre-wrap">{item.admin_notes}</p>
                  </div>
                )}

                <div className="mt-4 flex justify-between gap-2">
                  <ConfirmButton
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    title="Remover feedback?"
                    description="Esta ação não pode ser desfeita."
                    confirmLabel="Remover"
                    onConfirm={() => deleteMutation.mutate(item.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Remover
                  </ConfirmButton>
                  <Button size="sm" onClick={() => setEditing(item)}>
                    Gerenciar
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <EditDialog
        item={editing}
        onClose={() => setEditing(null)}
        onSave={(payload) => updateMutation.mutate(payload)}
        saving={updateMutation.isPending}
      />
    </div>
  );
}

function EditDialog({
  item,
  onClose,
  onSave,
  saving,
}: {
  item: any | null;
  onClose: () => void;
  onSave: (p: { id: string; status: string; priority: string; admin_notes: string }) => void;
  saving: boolean;
}) {
  const [status, setStatus] = useState(item?.status ?? "open");
  const [priority, setPriority] = useState(item?.priority ?? "medium");
  const [notes, setNotes] = useState(item?.admin_notes ?? "");

  // sync when item changes
  useMemo(() => {
    if (item) {
      setStatus(item.status);
      setPriority(item.priority);
      setNotes(item.admin_notes ?? "");
    }
  }, [item]);

  if (!item) return null;

  return (
    <Dialog open={!!item} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl tracking-wider uppercase">
            Gerenciar feedback
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Título</div>
            <div className="font-medium">{item.title}</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-wider">Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-wider">Prioridade</label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider">Resposta para o usuário</label>
            <Textarea
              rows={5}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Mensagem visível para o autor do feedback..."
              maxLength={2000}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() =>
              onSave({ id: item.id, status, priority, admin_notes: notes })
            }
            disabled={saving}
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Salvando..." : "Salvar alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
