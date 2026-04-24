import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentTeam } from "@/hooks/useCurrentTeam";
import {
  createUser,
  listUsers,
  setUserRole,
  linkUserToMember,
  deleteUser,
  resetUserPassword,
  setMemberRoleAndLane,
} from "@/server/admin.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Archive, ArchiveRestore, ShieldCheck, Trash2, Crown, UserPlus, KeyRound, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin-org")({
  head: () => ({ meta: [{ title: "Administração da organização — Battle Arena" }] }),
  component: AdminOrgPage,
});

type TeamRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  primary_color: string;
  accent_color: string;
  archived: boolean;
};

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

function AdminOrgPage() {
  const { user, loading: authLoading, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { refresh } = useCurrentTeam();

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [authLoading, user, navigate]);

  const teamsQ = useQuery({
    queryKey: ["org-teams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("id, slug, name, description, logo_url, primary_color, accent_color, archived")
        .order("name");
      if (error) throw error;
      return (data ?? []) as TeamRow[];
    },
    enabled: !!user && isSuperAdmin,
  });

  const listUsersFn = useServerFn(listUsers);
  const usersQ = useQuery({
    queryKey: ["org-users-full"],
    queryFn: () => listUsersFn({ data: undefined }),
    enabled: !!user && isSuperAdmin,
  });

  const allMembersQ = useQuery({
    queryKey: ["org-all-members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("id, name, lane, role, team_id");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user && isSuperAdmin,
  });

  const createMut = useMutation({
    mutationFn: async (input: { name: string; slug: string; description: string | null; primary_color: string; accent_color: string; logo_url: string | null }) => {
      const { data, error } = await supabase
        .from("teams")
        .insert(input)
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      toast.success("Equipe criada");
      qc.invalidateQueries({ queryKey: ["org-teams"] });
      await refresh();
    },
    onError: (e: any) => toast.error(e.message ?? "Falha ao criar"),
  });

  const archiveMut = useMutation({
    mutationFn: async ({ id, archived }: { id: string; archived: boolean }) => {
      const { error } = await supabase.from("teams").update({ archived }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-teams"] });
      qc.invalidateQueries({ queryKey: ["my-teams"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const promoteMut = useMutation({
    mutationFn: async ({ user_id, makeSuper }: { user_id: string; makeSuper: boolean }) => {
      if (makeSuper) {
        const { error } = await supabase.from("user_roles").insert({ user_id, role: "super_admin" });
        if (error && !error.message.includes("duplicate")) throw error;
      } else {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", user_id)
          .eq("role", "super_admin");
        if (error) throw error;
      }
    },
    onSuccess: (_d, v) => {
      toast.success(v.makeSuper ? "Promovido a super-admin" : "Removido como super-admin");
      qc.invalidateQueries({ queryKey: ["org-users-full"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const createUserFn = useServerFn(createUser);
  const setRoleFn = useServerFn(setUserRole);
  const linkFn = useServerFn(linkUserToMember);
  const delFn = useServerFn(deleteUser);
  const pwFn = useServerFn(resetUserPassword);

  const invalidateUsers = () => qc.invalidateQueries({ queryKey: ["org-users-full"] });

  const createUserMut = useMutation({
    mutationFn: (input: any) => createUserFn({ data: input }),
    onSuccess: () => {
      toast.success("Usuário criado e vinculado à equipe");
      invalidateUsers();
    },
    onError: (e: any) => toast.error(e.message ?? "Falha ao criar usuário"),
  });
  const roleMut = useMutation({
    mutationFn: (input: any) => setRoleFn({ data: input }),
    onSuccess: () => { toast.success("Permissão atualizada"); invalidateUsers(); },
    onError: (e: any) => toast.error(e.message),
  });
  const linkMut = useMutation({
    mutationFn: (input: any) => linkFn({ data: input }),
    onSuccess: () => { toast.success("Vínculo de roster atualizado"); invalidateUsers(); },
    onError: (e: any) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: (input: any) => delFn({ data: input }),
    onSuccess: () => { toast.success("Conta removida"); invalidateUsers(); },
    onError: (e: any) => toast.error(e.message),
  });
  const pwMut = useMutation({
    mutationFn: (input: any) => pwFn({ data: input }),
    onSuccess: () => toast.success("Senha redefinida"),
    onError: (e: any) => toast.error(e.message),
  });

  if (authLoading) return null;
  if (!user) return null;
  if (!isSuperAdmin) {
    return (
      <div className="max-w-xl mx-auto mt-20">
        <Card className="p-8 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="font-display text-2xl mt-4">Acesso restrito</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Apenas super-administradores da organização podem acessar esta área.
          </p>
          <Button asChild className="mt-6">
            <Link to="/equipes">Voltar</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const teams = teamsQ.data ?? [];
  const users = usersQ.data ?? [];
  const allMembers = allMembersQ.data ?? [];

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Organização
          </div>
          <h1 className="font-display text-3xl tracking-wider">ADMIN ORG</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Crie e arquive equipes, promova super-administradores.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CreateUserDialog
            teams={teams.filter((t) => !t.archived)}
            onSubmit={(d) => createUserMut.mutate(d)}
            loading={createUserMut.isPending}
          />
          <CreateTeamDialog onSubmit={(d) => createMut.mutate(d)} loading={createMut.isPending} />
        </div>
      </header>

      <Card className="overflow-hidden border-border">
        <div className="p-4 border-b border-border">
          <h2 className="font-display tracking-wider text-lg">EQUIPES</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Nome</th>
                <th className="text-left px-4 py-3">Slug</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {teamsQ.isLoading && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Carregando...</td></tr>
              )}
              {!teamsQ.isLoading && teams.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Nenhuma equipe.</td></tr>
              )}
              {teams.map((t) => (
                <tr key={t.id} className={`border-t border-border/50 ${t.archived ? "opacity-60" : ""}`}>
                  <td className="px-4 py-3 flex items-center gap-2">
                    <span
                      className="h-6 w-6 rounded-md border border-border"
                      style={{ background: t.primary_color }}
                    />
                    <span className="font-medium">{t.name}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{t.slug}</td>
                  <td className="px-4 py-3 text-xs">
                    {t.archived ? <span className="text-destructive">arquivada</span> : <span className="text-primary">ativa</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => archiveMut.mutate({ id: t.id, archived: !t.archived })}
                        title={t.archived ? "Reativar" : "Arquivar"}
                      >
                        {t.archived ? <ArchiveRestore className="h-4 w-4 text-primary" /> : <Archive className="h-4 w-4" />}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="overflow-hidden border-border">
        <div className="p-4 border-b border-border">
          <h2 className="font-display tracking-wider text-lg">USUÁRIOS</h2>
          <p className="text-xs text-muted-foreground">
            Todas as contas, suas permissões globais, equipes vinculadas e ações administrativas.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Nome</th>
                <th className="text-left px-4 py-3">Permissão</th>
                <th className="text-left px-4 py-3">Equipes</th>
                <th className="text-left px-4 py-3">Vínculo (Roster)</th>
                <th className="text-left px-4 py-3">Último acesso</th>
                <th className="text-right px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {usersQ.isLoading && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Carregando...</td></tr>
              )}
              {!usersQ.isLoading && users.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Nenhum usuário.</td></tr>
              )}
              {users.map((u) => (
                <UserRow
                  key={u.id}
                  u={u}
                  allMembers={allMembers}
                  isSelf={u.id === user.id}
                  isSuper={u.roles.includes("super_admin")}
                  onRoleChange={(role) => roleMut.mutate({ user_id: u.id, role })}
                  onLinkChange={(member_id) => linkMut.mutate({ user_id: u.id, member_id })}
                  onDelete={() => delMut.mutate({ user_id: u.id })}
                  onResetPw={(password) => pwMut.mutate({ user_id: u.id, password })}
                  onPromote={(makeSuper) => promoteMut.mutate({ user_id: u.id, makeSuper })}
                />
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-4 border-border bg-card/40">
        <div className="text-xs text-muted-foreground space-y-1">
          <p><span className="text-gold">super_admin</span> — controle total da organização.</p>
          <p><span className="text-primary">coach</span> — gerente da equipe à qual pertence.</p>
          <p>player — edita estratégia, builds e presença. viewer — somente leitura.</p>
        </div>
      </Card>
    </div>
  );
}

function CreateTeamDialog({
  onSubmit, loading,
}: { onSubmit: (d: { name: string; slug: string; description: string | null; primary_color: string; accent_color: string; logo_url: string | null }) => void; loading: boolean }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [primary, setPrimary] = useState("#DC2626");
  const [accent, setAccent] = useState("#FBBF24");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  function reset() {
    setName(""); setSlug(""); setDescription("");
    setPrimary("#DC2626"); setAccent("#FBBF24");
    setLogoUrl(null);
  }

  async function handleLogoFile(file: File) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo deve ter no máximo 2MB");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `team-logos/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("team-assets").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("team-assets").getPublicUrl(path);
      setLogoUrl(data.publicUrl);
      toast.success("Logo enviado");
    } catch (e: any) {
      toast.error(e.message ?? "Falha no upload");
    } finally {
      setUploading(false);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    const finalSlug = (slug || slugify(name)).trim();
    if (!finalSlug) {
      toast.error("Slug inválido");
      return;
    }
    onSubmit({
      name: name.trim(),
      slug: finalSlug,
      description: description.trim() || null,
      primary_color: primary,
      accent_color: accent,
      logo_url: logoUrl,
    });
    setOpen(false);
    reset();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-primary shadow-glow uppercase tracking-wider text-xs">
          <Plus className="h-4 w-4 mr-2" /> Nova equipe
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar nova equipe</DialogTitle>
          <DialogDescription>
            A equipe começará vazia. Adicione coaches e jogadores depois pelo Admin de cada equipe.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="t-name">Nome *</Label>
            <Input
              id="t-name"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slug) setSlug(slugify(e.target.value));
              }}
            />
          </div>
          <div>
            <Label htmlFor="t-slug">Slug (URL)</Label>
            <Input id="t-slug" value={slug} onChange={(e) => setSlug(slugify(e.target.value))} placeholder="ex.: dragounite-z" />
          </div>
          <div>
            <Label htmlFor="t-desc">Descrição</Label>
            <Textarea id="t-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="t-logo">Logo da equipe</Label>
            <div className="flex items-center gap-3 mt-1">
              <div className="h-14 w-14 rounded-md border border-border bg-background/40 flex items-center justify-center overflow-hidden shrink-0">
                {logoUrl ? (
                  <img src={logoUrl} alt="logo" className="h-full w-full object-contain" />
                ) : (
                  <span className="text-[9px] uppercase tracking-widest text-muted-foreground">sem logo</span>
                )}
              </div>
              <div className="flex-1 space-y-1.5">
                <Input
                  id="t-logo"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleLogoFile(f);
                  }}
                />
                {uploading && <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Enviando...</p>}
                {logoUrl && !uploading && (
                  <button
                    type="button"
                    onClick={() => setLogoUrl(null)}
                    className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-destructive"
                  >
                    Remover logo
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Cor primária</Label>
              <input
                type="color"
                value={primary}
                onChange={(e) => setPrimary(e.target.value)}
                className="h-10 w-full rounded-md border border-border bg-transparent cursor-pointer"
              />
            </div>
            <div>
              <Label>Cor de destaque</Label>
              <input
                type="color"
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
                className="h-10 w-full rounded-md border border-border bg-transparent cursor-pointer"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading || uploading} className="bg-gradient-primary">
              {loading ? "Criando..." : "Criar equipe"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const APP_ROLE_OPTS = ["coach", "player", "viewer"] as const;
const TEAM_ROLE_OPTS = ["coach", "player", "viewer"] as const;
const MEMBER_ROLE_OPTS = ["player", "substitute", "coach", "manager"] as const;
const LANE_OPTS = ["top", "jungle", "mid", "bot", "support", "flex"] as const;

type CreateUserInput = {
  email: string;
  password: string;
  display_name: string;
  role: (typeof APP_ROLE_OPTS)[number];
  team_id: string;
  team_role: (typeof TEAM_ROLE_OPTS)[number];
  member_role: (typeof MEMBER_ROLE_OPTS)[number];
  lane: (typeof LANE_OPTS)[number];
};

function CreateUserDialog({
  teams, onSubmit, loading,
}: {
  teams: TeamRow[];
  onSubmit: (d: CreateUserInput) => void;
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<(typeof APP_ROLE_OPTS)[number]>("player");
  const [teamId, setTeamId] = useState<string>("");
  const [teamRole, setTeamRole] = useState<(typeof TEAM_ROLE_OPTS)[number]>("player");
  const [memberRole, setMemberRole] = useState<(typeof MEMBER_ROLE_OPTS)[number]>("player");
  const [lane, setLane] = useState<(typeof LANE_OPTS)[number]>("flex");

  function reset() {
    setEmail(""); setPassword(""); setDisplayName("");
    setRole("player"); setTeamId("");
    setTeamRole("player"); setMemberRole("player"); setLane("flex");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!teamId) {
      toast.error("Selecione uma equipe");
      return;
    }
    onSubmit({
      email: email.trim(),
      password,
      display_name: (displayName.trim() || email.split("@")[0]).slice(0, 80),
      role,
      team_id: teamId,
      team_role: teamRole,
      member_role: memberRole,
      lane,
    });
    setOpen(false);
    reset();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="uppercase tracking-wider text-xs">
          <UserPlus className="h-4 w-4 mr-2" /> Novo usuário
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar usuário e vincular a uma equipe</DialogTitle>
          <DialogDescription>
            Cria a conta, adiciona ao roster e à lista de membros da equipe escolhida.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="nu-email">Email *</Label>
              <Input id="nu-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="nu-pass">Senha (mín. 6) *</Label>
              <Input id="nu-pass" type="text" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="nu-name">Nome de exibição</Label>
            <Input id="nu-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="(opcional — usa o email)" />
          </div>
          <div>
            <Label>Equipe *</Label>
            <Select value={teamId} onValueChange={setTeamId}>
              <SelectTrigger><SelectValue placeholder="Selecione uma equipe" /></SelectTrigger>
              <SelectContent>
                {teams.length === 0 && (
                  <div className="px-2 py-3 text-xs text-muted-foreground">Nenhuma equipe ativa</div>
                )}
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Permissão global</Label>
              <Select value={role} onValueChange={(v) => setRole(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {APP_ROLE_OPTS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Papel na equipe</Label>
              <Select value={teamRole} onValueChange={(v) => setTeamRole(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEAM_ROLE_OPTS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Função no roster</Label>
              <Select value={memberRole} onValueChange={(v) => setMemberRole(v as any)}>
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
              <Label>Rota</Label>
              <Select value={lane} onValueChange={(v) => setLane(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LANE_OPTS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading} className="bg-gradient-primary">
              {loading ? "Criando..." : "Criar usuário"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const APP_ROLES_EDITABLE = ["coach", "player", "viewer"] as const;
type UserAppRole = (typeof APP_ROLES_EDITABLE)[number];

type MemberLite = { id: string; name: string; lane: string | null; role: string; team_id: string };
type UserRowData = {
  id: string;
  email: string;
  last_sign_in_at: string | null;
  roles: string[];
  profile: { display_name: string | null; member_id: string | null; user_id: string } | null;
  teams: { team_id: string; team_role: string; name: string; slug: string; archived: boolean }[];
};

function UserRow({
  u, allMembers, isSelf, isSuper, onRoleChange, onLinkChange, onDelete, onResetPw, onPromote,
}: {
  u: UserRowData;
  allMembers: MemberLite[];
  isSelf: boolean;
  isSuper: boolean;
  onRoleChange: (r: UserAppRole) => void;
  onLinkChange: (memberId: string | null) => void;
  onDelete: () => void;
  onResetPw: (pw: string) => void;
  onPromote: (makeSuper: boolean) => void;
}) {
  const editableRole = (u.roles.find((r) => r !== "super_admin") ?? "viewer") as UserAppRole;
  const memberId: string | null = u.profile?.member_id ?? null;
  const [pwOpen, setPwOpen] = useState(false);
  const [newPw, setNewPw] = useState("");

  const linkedMember = useMemo(
    () => allMembers.find((m) => m.id === memberId) ?? null,
    [allMembers, memberId],
  );
  // Members from the user's teams (preferred), fallback to all members if no team
  const linkableMembers = useMemo(() => {
    const teamIds = new Set(u.teams.map((t) => t.team_id));
    if (teamIds.size === 0) return allMembers;
    return allMembers.filter((m) => teamIds.has(m.team_id));
  }, [allMembers, u.teams]);

  return (
    <tr className="border-t border-border/50 hover:bg-muted/20 align-top">
      <td className="px-4 py-3 font-mono text-xs">
        {u.email}
        {isSelf && <span className="ml-2 text-[9px] uppercase text-gold">(você)</span>}
      </td>
      <td className="px-4 py-3">{u.profile?.display_name ?? "—"}</td>
      <td className="px-4 py-3">
        <div className="flex flex-col gap-1.5">
          <Select value={editableRole} onValueChange={(v) => onRoleChange(v as UserAppRole)} disabled={isSelf}>
            <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              {APP_ROLES_EDITABLE.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
          {isSuper && (
            <span className="px-2 py-0.5 rounded border border-gold/40 text-gold text-[10px] uppercase tracking-wider w-fit inline-flex items-center">
              <Crown className="h-3 w-3 mr-1" /> super_admin
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        {u.teams.length === 0 ? (
          <span className="text-xs text-muted-foreground">— nenhuma —</span>
        ) : (
          <div className="flex flex-wrap gap-1 max-w-[260px]">
            {u.teams.map((t) => (
              <span
                key={t.team_id}
                className={`px-2 py-0.5 rounded border text-[10px] uppercase tracking-wider ${
                  t.archived
                    ? "border-border text-muted-foreground line-through"
                    : t.team_role === "coach"
                      ? "border-primary/40 text-primary"
                      : "border-border text-foreground/80"
                }`}
                title={`${t.name} · ${t.team_role}`}
              >
                {t.name}
                <span className="ml-1 opacity-60">· {t.team_role}</span>
              </span>
            ))}
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        <Select
          value={memberId ?? "none"}
          onValueChange={(v) => onLinkChange(v === "none" ? null : v)}
        >
          <SelectTrigger className="h-8 w-44">
            <SelectValue placeholder="—">
              <span className="flex items-center gap-1.5">
                <LinkIcon className="h-3 w-3" />
                {linkedMember?.name ?? "—"}
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">— sem vínculo —</SelectItem>
            {linkableMembers.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}{m.lane ? ` · ${m.lane}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
        {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString("pt-BR") : "nunca"}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          {isSuper ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" disabled={isSelf} title="Remover super-admin">
                  <Crown className="h-4 w-4 text-gold" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remover super-admin?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {u.email} perderá acesso global à organização.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onPromote(false)}
                    className="bg-destructive text-destructive-foreground"
                  >Remover</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onPromote(true)}
              title="Promover a super-admin"
            >
              <Crown className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}

          <Dialog open={pwOpen} onOpenChange={setPwOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="ghost" title="Redefinir senha">
                <KeyRound className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Redefinir senha — {u.email}</DialogTitle>
                <DialogDescription>Defina uma nova senha temporária para este usuário.</DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor={`newpw-${u.id}`}>Nova senha (mín. 6)</Label>
                <Input
                  id={`newpw-${u.id}`}
                  type="text"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setPwOpen(false)}>Cancelar</Button>
                <Button
                  onClick={() => {
                    if (newPw.length >= 6) {
                      onResetPw(newPw);
                      setPwOpen(false);
                      setNewPw("");
                    } else {
                      toast.error("Mínimo 6 caracteres");
                    }
                  }}
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
                <AlertDialogAction
                  onClick={onDelete}
                  className="bg-destructive text-destructive-foreground"
                >Remover</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </td>
    </tr>
  );
}
