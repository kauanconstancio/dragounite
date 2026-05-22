import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Copy, Download, Pencil, Trash2, Plus, LogOut, Shield, ArrowLeft, Users, UserCog } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const OWNER_EMAIL = "kauanconstancio13@gmail.com";

export const Route = createFileRoute("/adm")({
  head: () => ({ meta: [{ title: "Área dos ADM — Dragounite" }] }),
  component: AdmPage,
});


type AdmAttachment = { url: string; name: string; type: string; size: number; path?: string };

type AdmPlayer = {
  id: string;
  name: string;
  age: number | null;
  ign: string | null;
  game: string | null;
  photo_url: string | null;
  notes: string | null;
  attachments: AdmAttachment[];
  created_at: string;
};

const GAME_OPTIONS = [
  "Pokémon Unite",
  "TCG",
  "VGC",
  "Rematch",
  "One Piece Card",
  "Pokémon Champions",
];

function AdmPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user?.email ?? null);
      setChecking(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setEmail(s?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const { data: adminCheck, isLoading: adminLoading } = useQuery({
    queryKey: ["adm-admin-check", email],
    queryFn: async () => {
      if (!email) return null;
      const { data, error } = await supabase
        .from("adm_admins")
        .select("email,is_owner")
        .ilike("email", email)
        .maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: !!email,
  });

  if (checking || (email && adminLoading)) {
    return (
      <div className="min-h-screen bg-[#0f0d0e] text-white flex items-center justify-center">
        <p className="text-zinc-400">Carregando...</p>
      </div>
    );
  }

  if (!email || !adminCheck) {
    return <AdmLogin currentEmail={email} isWrongAccount={!!email && !adminCheck} />;
  }

  return <AdmDashboard isOwner={adminCheck.is_owner} currentEmail={email} />;
}


function AdmLogin({ currentEmail, isWrongAccount }: { currentEmail: string | null; isWrongAccount?: boolean }) {
  const [emailInput, setEmailInput] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: emailInput.trim().toLowerCase(),
        password,
      });
      if (error) {
        toast.error("Credenciais inválidas");
        return;
      }
      toast.success("Bem-vindo");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOutOther() {
    await supabase.auth.signOut();
    toast.info("Sessão anterior encerrada.");
  }


  return (
    <div className="min-h-screen bg-[#0f0d0e] text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-6">
          <ArrowLeft className="h-4 w-4" /> Voltar à landing
        </Link>
        <Card className="bg-zinc-950 border-red-600/30 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-full bg-red-600/20 flex items-center justify-center">
              <Shield className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <h1 className="font-black uppercase tracking-tight text-xl">Área dos ADM</h1>
              <p className="text-xs text-zinc-500">Acesso restrito</p>
            </div>
          </div>

          {isWrongAccount && currentEmail && (
            <div className="mb-4 rounded-md border border-amber-600/30 bg-amber-600/10 p-3 text-xs text-amber-200">
              Você está logado como <strong>{currentEmail}</strong>, mas esta conta não tem permissão de ADM.
              <Button size="sm" variant="outline" className="mt-2 w-full" onClick={handleSignOutOther}>
                <LogOut className="h-3 w-3" /> Sair da sessão atual
              </Button>
            </div>
          )}


          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="adm-email">E-mail</Label>
              <Input
                id="adm-email"
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adm-pass">Senha</Label>
              <Input
                id="adm-pass"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}

function AdmDashboard({ isOwner, currentEmail }: { isOwner: boolean; currentEmail: string }) {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdmPlayer | null>(null);

  const { data: players = [], isLoading } = useQuery({
    queryKey: ["adm-players"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("adm_players")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        ...r,
        attachments: Array.isArray(r.attachments) ? (r.attachments as unknown as AdmAttachment[]) : [],
      })) as AdmPlayer[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (p: AdmPlayer) => {
      const marker = "/adm-players/";
      const paths: string[] = [];
      if (p.photo_url) {
        const idx = p.photo_url.indexOf(marker);
        if (idx >= 0) paths.push(p.photo_url.slice(idx + marker.length));
      }
      for (const att of p.attachments ?? []) {
        if (att.path) paths.push(att.path);
        else {
          const idx = att.url.indexOf(marker);
          if (idx >= 0) paths.push(att.url.slice(idx + marker.length));
        }
      }
      if (paths.length) await supabase.storage.from("adm-players").remove(paths);
      const { error } = await supabase.from("adm_players").delete().eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adm-players"] });
      toast.success("Jogador removido");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleLogout() {
    await supabase.auth.signOut();
    toast.success("Sessão encerrada");
  }

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(p: AdmPlayer) {
    setEditing(p);
    setDialogOpen(true);
  }

  async function copyText(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copiado`);
    } catch {
      toast.error("Falha ao copiar");
    }
  }

  async function downloadPhoto(url: string, name: string) {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const ext = (blob.type.split("/")[1] || "jpg").split("+")[0];
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${name.replace(/\s+/g, "_")}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    } catch {
      toast.error("Falha ao baixar foto");
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0d0e] text-white">
      <header className="border-b border-red-600/20 bg-[#0a0809] sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-red-500" />
            <div>
              <h1 className="font-black uppercase tracking-tight">Área dos ADM</h1>
              <p className="text-xs text-zinc-500">Gestão de jogadores</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/">Landing</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 space-y-6">
        <Tabs defaultValue="players" className="space-y-6">
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="players" className="gap-2 data-[state=active]:bg-red-600 data-[state=active]:text-white">
              <Users className="h-4 w-4" /> Jogadores
            </TabsTrigger>
            <TabsTrigger value="admins" className="gap-2 data-[state=active]:bg-red-600 data-[state=active]:text-white">
              <UserCog className="h-4 w-4" /> Administradores
            </TabsTrigger>
          </TabsList>

          <TabsContent value="players" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl tracking-wide">JOGADORES</h2>
                <p className="text-sm text-zinc-400">{players.length} cadastrado(s)</p>
              </div>
              <Button onClick={openNew} className="bg-red-600 hover:bg-red-700 gap-2">
                <Plus className="h-4 w-4" /> Adicionar jogador
              </Button>
            </div>

            {isLoading ? (
              <p className="text-zinc-500 text-sm">Carregando...</p>
            ) : players.length === 0 ? (
              <Card className="bg-zinc-950 border-zinc-800 p-12 text-center">
                <p className="text-zinc-400">Nenhum jogador cadastrado ainda.</p>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {players.map((p) => (
                  <Card key={p.id} className="bg-zinc-950 border-zinc-800 overflow-hidden flex flex-col">
                    {p.photo_url ? (
                      <div className="aspect-square bg-zinc-900 relative group">
                        <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => downloadPhoto(p.photo_url!, p.name)}
                          className="absolute top-2 right-2 bg-black/70 hover:bg-black text-white rounded-md p-2 opacity-0 group-hover:opacity-100 transition"
                          title="Baixar foto"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="aspect-square bg-zinc-900 flex items-center justify-center text-zinc-700 text-sm">
                        Sem foto
                      </div>
                    )}
                    <div className="p-4 space-y-2 flex-1 flex flex-col">
                      <Field label="Nome" value={p.name} onCopy={() => copyText(p.name, "Nome")} />
                      {p.game && <Field label="Jogo" value={p.game} onCopy={() => copyText(p.game!, "Jogo")} />}
                      {p.ign && <Field label="IGN" value={p.ign} onCopy={() => copyText(p.ign!, "IGN")} />}
                      {p.age != null && (
                        <Field label="Idade" value={String(p.age)} onCopy={() => copyText(String(p.age), "Idade")} />
                      )}
                      {p.notes && (
                        <Field label="Observações" value={p.notes} onCopy={() => copyText(p.notes!, "Observações")} multiline />
                      )}
                      {p.attachments && p.attachments.length > 0 && (
                        <div className="text-sm">
                          <span className="text-[10px] uppercase tracking-widest text-zinc-500">Arquivos ({p.attachments.length})</span>
                          <ul className="mt-1 space-y-1">
                            {p.attachments.map((att, i) => (
                              <li key={i} className="flex items-center justify-between gap-2 rounded bg-zinc-900 px-2 py-1">
                                <span className="truncate text-zinc-200 text-xs" title={att.name}>{att.name}</span>
                                <a
                                  href={att.url}
                                  download={att.name}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-zinc-400 hover:text-white shrink-0"
                                  title="Baixar"
                                >
                                  <Download className="h-3 w-3" />
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="pt-3 mt-auto flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => openEdit(p)}>
                          <Pencil className="h-3 w-3" /> Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-400 hover:text-red-300"
                          onClick={() => {
                            if (confirm(`Remover ${p.name}?`)) deleteMutation.mutate(p);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="admins">
            <AdminsManager isOwner={isOwner} currentEmail={currentEmail} />
          </TabsContent>
        </Tabs>
      </main>


      <PlayerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        player={editing}
        onSaved={() => {
          setDialogOpen(false);
          qc.invalidateQueries({ queryKey: ["adm-players"] });
        }}
      />
    </div>
  );
}

function Field({
  label,
  value,
  onCopy,
  multiline,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  multiline?: boolean;
}) {
  return (
    <div className="text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-widest text-zinc-500">{label}</span>
        <button
          type="button"
          onClick={onCopy}
          className="text-zinc-500 hover:text-white transition"
          title={`Copiar ${label}`}
        >
          <Copy className="h-3 w-3" />
        </button>
      </div>
      <div className={multiline ? "text-zinc-200 whitespace-pre-wrap" : "text-zinc-200 truncate"}>{value}</div>
    </div>
  );
}

function PlayerDialog({
  open,
  onOpenChange,
  player,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  player: AdmPlayer | null;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [ign, setIgn] = useState("");
  const [game, setGame] = useState("");
  const [notes, setNotes] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [existingAttachments, setExistingAttachments] = useState<AdmAttachment[]>([]);
  const [removedAttachments, setRemovedAttachments] = useState<AdmAttachment[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(player?.name ?? "");
      setAge(player?.age != null ? String(player.age) : "");
      setIgn(player?.ign ?? "");
      setGame(player?.game ?? "");
      setNotes(player?.notes ?? "");
      setPhotoFile(null);
      setPhotoUrl(player?.photo_url ?? null);
      setExistingAttachments(player?.attachments ?? []);
      setRemovedAttachments([]);
      setNewFiles([]);
    }
  }, [open, player]);

  function removeExisting(att: AdmAttachment) {
    setExistingAttachments((prev) => prev.filter((a) => a.url !== att.url));
    setRemovedAttachments((prev) => [...prev, att]);
  }

  function removeNewFile(idx: number) {
    setNewFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    setSaving(true);
    try {
      let finalPhotoUrl = photoUrl;
      if (photoFile) {
        const ext = photoFile.name.split(".").pop() || "jpg";
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("adm-players")
          .upload(path, photoFile, { upsert: false, contentType: photoFile.type });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("adm-players").getPublicUrl(path);
        finalPhotoUrl = pub.publicUrl;
      }

      // Upload new attachments
      const uploadedAttachments: AdmAttachment[] = [];
      for (const file of newFiles) {
        const ext = file.name.split(".").pop() || "bin";
        const path = `attachments/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("adm-players")
          .upload(path, file, { upsert: false, contentType: file.type || undefined });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("adm-players").getPublicUrl(path);
        uploadedAttachments.push({
          url: pub.publicUrl,
          name: file.name,
          type: file.type || "application/octet-stream",
          size: file.size,
          path,
        });
      }

      // Cleanup removed storage files
      const marker = "/adm-players/";
      const removePaths: string[] = [];
      for (const att of removedAttachments) {
        if (att.path) removePaths.push(att.path);
        else {
          const idx = att.url.indexOf(marker);
          if (idx >= 0) removePaths.push(att.url.slice(idx + marker.length));
        }
      }
      if (removePaths.length) await supabase.storage.from("adm-players").remove(removePaths);

      const finalAttachments = [...existingAttachments, ...uploadedAttachments];

      const payload = {
        name: name.trim(),
        age: age.trim() ? Number(age) : null,
        ign: ign.trim() || null,
        game: game.trim() || null,
        notes: notes.trim() || null,
        photo_url: finalPhotoUrl,
        attachments: finalAttachments as unknown as never,
      };

      if (player) {
        const { error } = await supabase.from("adm_players").update(payload).eq("id", player.id);
        if (error) throw error;
        toast.success("Jogador atualizado");
      } else {
        const { error } = await supabase.from("adm_players").insert(payload);
        if (error) throw error;
        toast.success("Jogador adicionado");
      }
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{player ? "Editar jogador" : "Novo jogador"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Foto</Label>
            {photoUrl && !photoFile && (
              <div className="mb-2">
                <img src={photoUrl} alt="" className="h-24 w-24 object-cover rounded-md border border-zinc-800" />
              </div>
            )}
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Nome *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="adm-game">Jogo</Label>
            <select
              id="adm-game"
              value={game}
              onChange={(e) => setGame(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Selecione um jogo...</option>
              {GAME_OPTIONS.map((g) => (
                <option key={g} value={g} className="bg-zinc-950 text-white">
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Idade</Label>
              <Input type="number" min="0" value={age} onChange={(e) => setAge(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>IGN</Label>
              <Input value={ign} onChange={(e) => setIgn(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Arquivos adicionais</Label>
            {existingAttachments.length > 0 && (
              <ul className="space-y-1">
                {existingAttachments.map((att, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 rounded bg-zinc-900 px-2 py-1 text-xs">
                    <span className="truncate text-zinc-200" title={att.name}>{att.name}</span>
                    <button
                      type="button"
                      onClick={() => removeExisting(att)}
                      className="text-red-400 hover:text-red-300 shrink-0"
                      title="Remover"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {newFiles.length > 0 && (
              <ul className="space-y-1">
                {newFiles.map((f, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 rounded bg-zinc-900/60 px-2 py-1 text-xs">
                    <span className="truncate text-zinc-300" title={f.name}>+ {f.name}</span>
                    <button
                      type="button"
                      onClick={() => removeNewFile(i)}
                      className="text-red-400 hover:text-red-300 shrink-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <Input
              type="file"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length) setNewFiles((prev) => [...prev, ...files]);
                e.target.value = "";
              }}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="bg-red-600 hover:bg-red-700">
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type AdmAdmin = { id: string; email: string; is_owner: boolean; created_at: string };

function AdminsManager({ isOwner, currentEmail }: { isOwner: boolean; currentEmail: string }) {
  const qc = useQueryClient();
  const [newEmail, setNewEmail] = useState("");
  const [adding, setAdding] = useState(false);

  const { data: admins = [], isLoading } = useQuery({
    queryKey: ["adm-admins"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("adm_admins")
        .select("*")
        .order("is_owner", { ascending: false })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as AdmAdmin[];
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("adm_admins").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adm-admins"] });
      toast.success("Administrador removido");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    const email = newEmail.trim().toLowerCase();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      toast.error("E-mail inválido");
      return;
    }
    setAdding(true);
    try {
      const { error } = await supabase.from("adm_admins").insert({ email, is_owner: false });
      if (error) throw error;
      toast.success("Administrador adicionado");
      setNewEmail("");
      qc.invalidateQueries({ queryKey: ["adm-admins"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao adicionar");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl tracking-wide">ADMINISTRADORES</h2>
        <p className="text-sm text-zinc-400">
          Quem pode acessar a Área dos ADM. {isOwner ? "Você é o dono e pode adicionar/remover." : "Apenas o dono pode gerenciar."}
        </p>
      </div>

      {isOwner && (
        <Card className="bg-zinc-950 border-zinc-800 p-4">
          <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2 sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="new-admin-email">E-mail do novo administrador</Label>
              <Input
                id="new-admin-email"
                type="email"
                placeholder="exemplo@dominio.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={adding} className="bg-red-600 hover:bg-red-700 gap-2">
              <Plus className="h-4 w-4" /> {adding ? "Adicionando..." : "Adicionar"}
            </Button>
          </form>
          <p className="text-xs text-zinc-500 mt-3">
            O usuário precisa ter (ou criar) uma conta com esse e-mail para acessar.
          </p>
        </Card>
      )}

      <Card className="bg-zinc-950 border-zinc-800 overflow-hidden">
        {isLoading ? (
          <p className="p-6 text-zinc-500 text-sm">Carregando...</p>
        ) : (
          <ul className="divide-y divide-zinc-900">
            {admins.map((a) => {
              const isYou = a.email.toLowerCase() === currentEmail.toLowerCase();
              return (
                <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-zinc-100 text-sm truncate">{a.email}</span>
                      {a.is_owner && (
                        <span className="text-[10px] uppercase tracking-widest bg-red-600/20 text-red-400 px-1.5 py-0.5 rounded">Dono</span>
                      )}
                      {isYou && (
                        <span className="text-[10px] uppercase tracking-widest bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded">Você</span>
                      )}
                    </div>
                    <span className="text-xs text-zinc-500">
                      Adicionado em {new Date(a.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  {isOwner && !a.is_owner && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-400 hover:text-red-300 gap-1"
                      onClick={() => {
                        if (confirm(`Remover acesso de ${a.email}?`)) removeMutation.mutate(a.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" /> Remover
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

// Re-export to satisfy unused import warning if owner email constant becomes unused later
export const __ownerEmail = OWNER_EMAIL;

