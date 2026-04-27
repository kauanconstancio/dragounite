import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentTeam } from "@/hooks/useCurrentTeam";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Mail, Copy, Trash2, Send, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";

type TeamRole = "coach" | "player" | "viewer";

type InviteRow = {
  id: string;
  email: string | null;
  token: string;
  team_role: TeamRole;
  member_id: string | null;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

type MemberOption = { id: string; name: string };

function inviteUrl(token: string) {
  return `${window.location.origin}/aceitar-convite?token=${token}`;
}

export function InviteMemberDialog() {
  const qc = useQueryClient();
  const { team } = useCurrentTeam();
  const { user } = useAuth();
  const teamId = team?.id;

  const [open, setOpen] = useState(false);
  const [teamRole, setTeamRole] = useState<TeamRole>("player");
  const [memberId, setMemberId] = useState<string>("none");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  const invitesQ = useQuery({
    queryKey: ["team-invites", teamId],
    queryFn: async () => {
      if (!teamId) return [] as InviteRow[];
      const { data, error } = await supabase
        .from("team_invites")
        .select("id, email, token, team_role, member_id, expires_at, accepted_at, revoked_at, created_at")
        .eq("team_id", teamId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as InviteRow[];
    },
    enabled: !!teamId && open,
  });

  const membersQ = useQuery({
    queryKey: ["roster-members-options", teamId],
    queryFn: async () => {
      if (!teamId) return [] as MemberOption[];
      const { data, error } = await supabase
        .from("members")
        .select("id, name")
        .eq("team_id", teamId)
        .eq("archived", false)
        .order("name");
      if (error) throw error;
      return (data ?? []) as MemberOption[];
    },
    enabled: !!teamId && open,
  });

  const createMut = useMutation({
    mutationFn: async () => {
      if (!teamId || !user) throw new Error("Sem equipe ou usuário");
      const { data, error } = await supabase
        .from("team_invites")
        .insert({
          team_id: teamId,
          email: null,
          team_role: teamRole,
          member_id: memberId === "none" ? null : memberId,
          invited_by: user.id,
        })
        .select("token")
        .single();
      if (error) throw error;
      return data as { token: string };
    },
    onSuccess: async (data) => {
      const url = inviteUrl(data.token);
      setGeneratedLink(url);
      qc.invalidateQueries({ queryKey: ["team-invites"] });
      toast.success("Convite criado — copie o link abaixo");
      setMemberId("none");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao criar convite"),
  });

  const revokeMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("team_invites")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Convite revogado");
      qc.invalidateQueries({ queryKey: ["team-invites"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  function copyLink(token: string) {
    navigator.clipboard.writeText(inviteUrl(token));
    toast.success("Link copiado");
  }

  function statusBadge(inv: InviteRow) {
    if (inv.revoked_at) return <Badge variant="secondary" className="text-[9px] uppercase">revogado</Badge>;
    if (inv.accepted_at) return <Badge className="text-[9px] uppercase bg-primary/20 text-primary">aceito</Badge>;
    if (new Date(inv.expires_at) < new Date()) return <Badge variant="secondary" className="text-[9px] uppercase">expirado</Badge>;
    return <Badge variant="outline" className="text-[9px] uppercase">pendente</Badge>;
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setGeneratedLink(null); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="uppercase tracking-wider text-xs gap-2 bg-gradient-primary">
          <Send className="h-4 w-4" /> Convidar membro
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Convidar novo membro</DialogTitle>
          <DialogDescription>
            Gere um link de convite ou envie por e-mail. O membro cria a própria conta ao aceitar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Papel na equipe</Label>
            <Select value={teamRole} onValueChange={(v) => setTeamRole(v as TeamRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="player">Jogador</SelectItem>
                <SelectItem value="coach">Coach</SelectItem>
                <SelectItem value="viewer">Visualizador</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Vincular a membro do roster (opcional)</Label>
            <Select value={memberId} onValueChange={setMemberId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Não vincular —</SelectItem>
                {(membersQ.data ?? []).map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground mt-1">
              Se vincular, o convidado herdará o perfil de jogador existente.
            </p>
          </div>

          <Button
            onClick={() => createMut.mutate()}
            disabled={createMut.isPending}
            className="w-full bg-gradient-primary"
          >
            {createMut.isPending ? "Gerando..." : (
              <><LinkIcon className="h-4 w-4 mr-2" /> Gerar convite</>
            )}
          </Button>

          {generatedLink && (
            <div className="rounded-md border border-primary/40 bg-primary/5 p-3 space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-primary">Link de convite</p>
              <div className="flex items-center gap-2">
                <Input readOnly value={generatedLink} className="font-mono text-xs" />
                <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(generatedLink); toast.success("Link copiado"); }}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Compartilhe este link com o membro. Ele expira em 7 dias.
              </p>
            </div>
          )}

          <div className="border-t border-border pt-4">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Convites recentes</h3>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {invitesQ.isLoading && <p className="text-xs text-muted-foreground">Carregando...</p>}
              {!invitesQ.isLoading && (invitesQ.data ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhum convite criado.</p>
              )}
              {(invitesQ.data ?? []).map((inv) => {
                const pending = !inv.accepted_at && !inv.revoked_at && new Date(inv.expires_at) >= new Date();
                return (
                  <div key={inv.id} className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs truncate">{inv.email ?? "Link aberto"}</span>
                        {statusBadge(inv)}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {inv.team_role} · expira {new Date(inv.expires_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {pending && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => copyLink(inv.token)} title="Copiar link">
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => revokeMut.mutate(inv.id)} title="Revogar">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
