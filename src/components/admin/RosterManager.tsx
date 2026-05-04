import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_TEAM_ID } from "@/lib/default-team";
import { useCurrentTeam } from "@/hooks/useCurrentTeam";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Archive, ArchiveRestore, Pencil, Trash2, UserPlus, Save, X, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { InviteMemberDialog } from "./InviteMemberDialog";

const LANES = ["top", "jungle", "mid", "bot", "support", "flex"] as const;
const MEMBER_ROLES = ["player", "substitute", "coach", "manager"] as const;
type Lane = (typeof LANES)[number];
type MemberRole = (typeof MEMBER_ROLES)[number];

type MemberRow = {
  id: string;
  name: string;
  ign: string | null;
  game_id: string | null;
  lane: Lane | null;
  role: MemberRole;
  main_pokemon: string | null;
  discord: string | null;
  archived: boolean;
};

type ProfileLink = { user_id: string; member_id: string | null };

export function RosterManager() {
  const qc = useQueryClient();
  const { team } = useCurrentTeam();
  const teamId = team?.id ?? DEFAULT_TEAM_ID;
  const [showArchived, setShowArchived] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<MemberRow>>({});

  const membersQ = useQuery({
    queryKey: ["roster-members", teamId],
    queryFn: async () => {
      if (!teamId) return [] as MemberRow[];
      const { data, error } = await supabase
        .from("members")
        .select("id, name, ign, game_id, lane, role, main_pokemon, discord, archived")
        .eq("team_id", teamId)
        .order("archived", { ascending: true })
        .order("name");
      if (error) throw error;
      return (data ?? []) as MemberRow[];
    },
    enabled: !!teamId,
  });

  const linksQ = useQuery({
    queryKey: ["profiles-member-links"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, member_id");
      if (error) throw error;
      return (data ?? []) as ProfileLink[];
    },
  });

  const linkedSet = useMemo(
    () => new Set((linksQ.data ?? []).map((l) => l.member_id).filter(Boolean) as string[]),
    [linksQ.data],
  );

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["roster-members"] });
    qc.invalidateQueries({ queryKey: ["members-all"] });
    qc.invalidateQueries({ queryKey: ["members"] });
  };

  const updateMut = useMutation({
    mutationFn: async (input: { id: string; patch: Partial<MemberRow> }) => {
      const { error } = await supabase.from("members").update(input.patch).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Membro atualizado");
      setEditingId(null);
      setDraft({});
      invalidate();
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao atualizar"),
  });

  const archiveMut = useMutation({
    mutationFn: async (input: { id: string; archived: boolean }) => {
      const { error } = await supabase.from("members").update({ archived: input.archived }).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success(v.archived ? "Membro arquivado" : "Membro reativado");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      // Desvincula perfis primeiro (mantém contas ativas, só remove vínculo)
      const { error: linkErr } = await supabase
        .from("profiles")
        .update({ member_id: null })
        .eq("member_id", id);
      if (linkErr) throw linkErr;
      const { error } = await supabase.from("members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Membro removido do roster");
      invalidate();
    },
    onError: (e: any) =>
      toast.error(
        e.message?.includes("foreign key")
          ? "Existe histórico (partidas) vinculado. Use Arquivar."
          : e.message,
      ),
  });

  const createMut = useMutation({
    mutationFn: async (input: Omit<MemberRow, "id" | "archived">) => {
      const { error } = await supabase.from("members").insert({ ...input, archived: false, team_id: teamId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Membro adicionado");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  function startEdit(m: MemberRow) {
    setEditingId(m.id);
    setDraft({ ...m });
  }
  function cancelEdit() {
    setEditingId(null);
    setDraft({});
  }
  function saveEdit() {
    if (!editingId) return;
    const { id: _ignored, archived: _a, ...patch } = draft as MemberRow;
    updateMut.mutate({ id: editingId, patch });
  }

  const all = membersQ.data ?? [];
  const visible = showArchived ? all : all.filter((m) => !m.archived);

  return (
    <Card className="overflow-hidden border-border">
      <div className="flex items-center justify-between flex-wrap gap-3 p-4 border-b border-border">
        <div>
          <h2 className="font-display tracking-wider text-lg">ROSTER</h2>
          <p className="text-xs text-muted-foreground">
            Edição direta dos membros. Inclui jogadores sem conta vinculada.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <Switch checked={showArchived} onCheckedChange={setShowArchived} />
            Mostrar arquivados
          </label>
          <InviteMemberDialog />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3">Nome</th>
              <th className="text-left px-4 py-3">IGN</th>
              <th className="text-left px-4 py-3">ID no jogo</th>
              <th className="text-left px-4 py-3">Lane</th>
              <th className="text-left px-4 py-3">Função</th>
              <th className="text-left px-4 py-3">Pokémon Main</th>
              <th className="text-left px-4 py-3">Discord</th>
              <th className="text-left px-4 py-3">Vínculo</th>
              <th className="text-right px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {membersQ.isLoading && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">Carregando...</td></tr>
            )}
            {!membersQ.isLoading && visible.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">Nenhum membro.</td></tr>
            )}
            {visible.map((m) => {
              const editing = editingId === m.id;
              const linked = linkedSet.has(m.id);
              return (
                <tr key={m.id} className={`border-t border-border/50 ${m.archived ? "opacity-60" : ""}`}>
                  <td className="px-4 py-2">
                    {editing ? (
                      <Input value={draft.name ?? ""} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} className="h-8" />
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{m.name}</span>
                        {m.archived && <Badge variant="secondary" className="text-[9px] uppercase">arquivado</Badge>}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">
                    {editing ? (
                      <Input value={draft.ign ?? ""} onChange={(e) => setDraft((d) => ({ ...d, ign: e.target.value }))} className="h-8" />
                    ) : (m.ign ?? "—")}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">
                    {editing ? (
                      <Input value={draft.game_id ?? ""} onChange={(e) => setDraft((d) => ({ ...d, game_id: e.target.value }))} className="h-8" />
                    ) : (m.game_id ?? "—")}
                  </td>
                  <td className="px-4 py-2">
                    {editing ? (
                      <Select value={draft.lane ?? "flex"} onValueChange={(v) => setDraft((d) => ({ ...d, lane: v as Lane }))}>
                        <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {LANES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (m.lane ?? "—")}
                  </td>
                  <td className="px-4 py-2">
                    {editing ? (
                      <Select value={draft.role ?? "player"} onValueChange={(v) => setDraft((d) => ({ ...d, role: v as MemberRole }))}>
                        <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {MEMBER_ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : m.role}
                  </td>
                  <td className="px-4 py-2">
                    {editing ? (
                      <Input value={draft.main_pokemon ?? ""} onChange={(e) => setDraft((d) => ({ ...d, main_pokemon: e.target.value }))} className="h-8" />
                    ) : (m.main_pokemon ?? "—")}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">
                    {editing ? (
                      <Input value={draft.discord ?? ""} onChange={(e) => setDraft((d) => ({ ...d, discord: e.target.value }))} className="h-8" />
                    ) : (m.discord ?? "—")}
                  </td>
                  <td className="px-4 py-2">
                    {linked ? (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-primary">
                        <LinkIcon className="h-3 w-3" /> conta
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">sem conta</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-end gap-1">
                      {editing ? (
                        <>
                          <Button size="sm" variant="ghost" onClick={saveEdit} disabled={updateMut.isPending} title="Salvar">
                            <Save className="h-4 w-4 text-primary" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={cancelEdit} title="Cancelar">
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => startEdit(m)} title="Editar">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => archiveMut.mutate({ id: m.id, archived: !m.archived })}
                            title={m.archived ? "Reativar" : "Arquivar"}
                          >
                            {m.archived ? <ArchiveRestore className="h-4 w-4 text-primary" /> : <Archive className="h-4 w-4" />}
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost" title="Remover do roster">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remover {m.name} do roster?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  A entrada do roster será excluída e qualquer conta vinculada será desvinculada (mas <strong>não removida</strong>).
                                  Se houver histórico de partidas, prefira <strong>Arquivar</strong>.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMut.mutate(m.id)}
                                  className="bg-destructive text-destructive-foreground"
                                >Remover</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function CreateMemberDialog({
  onSubmit, loading,
}: { onSubmit: (d: Omit<MemberRow, "id" | "archived">) => void; loading: boolean }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [ign, setIgn] = useState("");
  const [lane, setLane] = useState<Lane>("flex");
  const [role, setRole] = useState<MemberRole>("player");
  const [mainPokemon, setMainPokemon] = useState("");
  const [discord, setDiscord] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error("Nome é obrigatório"); return; }
    onSubmit({
      name: name.trim(),
      ign: ign.trim() || null,
      game_id: null,
      lane,
      role,
      main_pokemon: mainPokemon.trim() || null,
      discord: discord.trim() || null,
    });
    setOpen(false);
    setName(""); setIgn(""); setLane("flex"); setRole("player");
    setMainPokemon(""); setDiscord("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="uppercase tracking-wider text-xs">
          <UserPlus className="h-4 w-4 mr-2" /> Novo membro
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar membro ao roster</DialogTitle>
          <DialogDescription>
            Cria um membro <strong>sem conta de login</strong>. Útil para reservas ou jogadores que ainda não receberam acesso.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="m-name">Nome *</Label>
            <Input id="m-name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="m-ign">IGN</Label>
              <Input id="m-ign" value={ign} onChange={(e) => setIgn(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="m-discord">Discord</Label>
              <Input id="m-discord" value={discord} onChange={(e) => setDiscord(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label>Lane</Label>
              <Select value={lane} onValueChange={(v) => setLane(v as Lane)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LANES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Função</Label>
              <Select value={role} onValueChange={(v) => setRole(v as MemberRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="player">Titular</SelectItem>
                  <SelectItem value="substitute">Reserva</SelectItem>
                  <SelectItem value="coach">Coach</SelectItem>
                  <SelectItem value="manager">Gerente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="m-poke">Pokémon Main</Label>
              <Input id="m-poke" value={mainPokemon} onChange={(e) => setMainPokemon(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading} className="bg-gradient-primary">
              {loading ? "Adicionando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
