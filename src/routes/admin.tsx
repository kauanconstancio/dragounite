import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth, type AppRole } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  listUsers,
  setUserRole,
  linkUserToMember,
  deleteUser,
  resetUserPassword,
} from "@/server/admin.functions";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
import { ShieldCheck, Trash2, KeyRound, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { AnnouncementsManager } from "@/components/admin/AnnouncementsManager";
import { TeamSettingsManager } from "@/components/admin/TeamSettingsManager";
import { RosterManager } from "@/components/admin/RosterManager";
import { useCurrentTeam } from "@/hooks/useCurrentTeam";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Battle Arena" }] }),
  component: AdminPage,
});

const ROLES: AppRole[] = ["coach", "player", "viewer"];

function AdminPage() {
  const { user, isCoach, loading } = useAuth();
  const { team } = useCurrentTeam();
  const teamId = team?.id;
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const listFn = useServerFn(listUsers);
  const setRoleFn = useServerFn(setUserRole);
  const linkFn = useServerFn(linkUserToMember);
  const delFn = useServerFn(deleteUser);
  const pwFn = useServerFn(resetUserPassword);

  const usersQ = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => listFn({ data: undefined }),
    enabled: !!user && isCoach,
  });

  const membersQ = useQuery({
    queryKey: ["members-all", teamId],
    queryFn: async () => {
      if (!teamId) return [];
      const { data, error } = await supabase.from("members").select("id, name, lane, role").eq("team_id", teamId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user && isCoach && !!teamId,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-users"] });

  const roleMut = useMutation({
    mutationFn: (input: any) => setRoleFn({ data: input }),
    onSuccess: () => { toast.success("Permissão atualizada"); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });
  const linkMut = useMutation({
    mutationFn: (input: any) => linkFn({ data: input }),
    onSuccess: () => { toast.success("Vínculo atualizado"); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: (input: any) => delFn({ data: input }),
    onSuccess: () => { toast.success("Conta removida"); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });
  const pwMut = useMutation({
    mutationFn: (input: any) => pwFn({ data: input }),
    onSuccess: () => toast.success("Senha redefinida"),
    onError: (e: any) => toast.error(e.message),
  });

  if (loading) return null;
  if (!user) return null;
  if (!isCoach) {
    return (
      <div className="max-w-xl mx-auto mt-20">
        <Card className="p-8 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="font-display text-2xl mt-4">Acesso restrito</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Apenas coaches/gerentes podem acessar o painel administrativo.
          </p>
          <Button asChild className="mt-6"><Link to="/">Voltar ao Dashboard</Link></Button>
        </Card>
      </div>
    );
  }

  const users = usersQ.data ?? [];
  const members = membersQ.data ?? [];

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Painel</div>
          <h1 className="font-display text-3xl tracking-wider">ADMINISTRAÇÃO</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie contas, permissões e vínculos com o roster.
          </p>
        </div>
      </header>

      <Card className="overflow-hidden border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Nome</th>
                <th className="text-left px-4 py-3">Permissão</th>
                <th className="text-left px-4 py-3">Vínculo (Roster)</th>
                <th className="text-left px-4 py-3">Último acesso</th>
                <th className="text-right px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {usersQ.isLoading && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Carregando...</td></tr>
              )}
              {!usersQ.isLoading && users.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Nenhum usuário.</td></tr>
              )}
              {users.map((u) => (
                <UserRow
                  key={u.id}
                  u={u}
                  members={members}
                  isSelf={u.id === user.id}
                  onRoleChange={(role) => roleMut.mutate({ user_id: u.id, role })}
                  onLinkChange={(member_id) => linkMut.mutate({ user_id: u.id, member_id })}
                  onDelete={() => delMut.mutate({ user_id: u.id })}
                  onResetPw={(password) => pwMut.mutate({ user_id: u.id, password })}
                />
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-4 border-border bg-card/40">
        <div className="text-xs text-muted-foreground space-y-1">
          <p><span className="text-gold">coach</span> — controle total (gerente).</p>
          <p><span className="text-primary">player</span> — edita estratégia, builds, presença.</p>
          <p>viewer — somente leitura.</p>
        </div>
      </Card>

      <RosterManager />

      <TeamSettingsManager />

      <AnnouncementsManager />
    </div>
  );
}

function UserRow({
  u, members, isSelf, onRoleChange, onLinkChange, onDelete, onResetPw,
}: {
  u: any;
  members: any[];
  isSelf: boolean;
  onRoleChange: (r: AppRole) => void;
  onLinkChange: (memberId: string | null) => void;
  onDelete: () => void;
  onResetPw: (pw: string) => void;
}) {
  const role: AppRole = u.roles[0] ?? "viewer";
  const memberId: string | null = u.profile?.member_id ?? null;
  const [pwOpen, setPwOpen] = useState(false);
  const [newPw, setNewPw] = useState("");

  const memberName = useMemo(
    () => members.find((m) => m.id === memberId)?.name ?? "—",
    [members, memberId],
  );

  return (
    <tr className="border-t border-border/50 hover:bg-muted/20">
      <td className="px-4 py-3 font-mono text-xs">{u.email}{isSelf && <span className="ml-2 text-[9px] uppercase text-gold">(você)</span>}</td>
      <td className="px-4 py-3">{u.profile?.display_name ?? "—"}</td>
      <td className="px-4 py-3">
        <Select value={role} onValueChange={(v) => onRoleChange(v as AppRole)} disabled={isSelf}>
          <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
      </td>
      <td className="px-4 py-3">
        <Select
          value={memberId ?? "none"}
          onValueChange={(v) => onLinkChange(v === "none" ? null : v)}
        >
          <SelectTrigger className="h-8 w-44">
            <SelectValue placeholder="—">
              <span className="flex items-center gap-1.5"><LinkIcon className="h-3 w-3" />{memberName}</span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">— sem vínculo —</SelectItem>
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id}>{m.name} {m.lane ? `· ${m.lane}` : ""}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">
        {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString("pt-BR") : "nunca"}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          <Dialog open={pwOpen} onOpenChange={setPwOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="ghost" title="Redefinir senha"><KeyRound className="h-4 w-4" /></Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Redefinir senha — {u.email}</DialogTitle>
                <DialogDescription>Defina uma nova senha temporária para este usuário.</DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="newpw">Nova senha (mín. 6)</Label>
                <Input id="newpw" type="text" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setPwOpen(false)}>Cancelar</Button>
                <Button
                  onClick={() => { if (newPw.length >= 6) { onResetPw(newPw); setPwOpen(false); setNewPw(""); } else toast.error("Mínimo 6 caracteres"); }}
                >Redefinir</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="ghost" disabled={isSelf} title="Remover conta">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remover {u.email}?</AlertDialogTitle>
                <AlertDialogDescription>
                  A conta será excluída permanentemente. Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground">
                  Remover
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </td>
    </tr>
  );
}

