import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Plus, Pencil, Trash2, ExternalLink, FileText, Palette, Upload } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/design")({
  head: () => ({ meta: [{ title: "Design — Dragounite" }] }),
  component: DesignPage,
});

type DesignAsset = {
  id: string;
  title: string;
  category: string;
  description: string | null;
  content: string | null;
  file_url: string | null;
  link_url: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
};

const CATEGORIES = ["geral", "logos", "tipografia", "paleta", "templates", "social", "uniformes", "referências"];

function DesignPage() {
  const { user, loading, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DesignAsset | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["design-assets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("design_assets")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as DesignAsset[];
    },
    enabled: isSuperAdmin,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("design_assets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["design-assets"] });
      toast.success("Item removido");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading) return null;
  if (!user) return null;
  if (!isSuperAdmin) {
    return (
      <div className="max-w-xl mx-auto mt-20">
        <Card className="p-8 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="font-display text-2xl mt-4">Acesso restrito</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Apenas administradores podem acessar a área da equipe de design.
          </p>
          <Button asChild className="mt-6"><Link to="/dashboard">Voltar ao Dashboard</Link></Button>
        </Card>
      </div>
    );
  }

  const byCategory = assets.reduce<Record<string, DesignAsset[]>>((acc, a) => {
    (acc[a.category] ??= []).push(a);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2">
            <Palette className="h-3 w-3" /> Área restrita
          </div>
          <h1 className="font-display text-3xl tracking-wider">DESIGN TEAM</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Banco de informações, referências e arquivos da equipe de design da Dragounite.
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Novo item
        </Button>
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : assets.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">Nenhum item ainda. Crie o primeiro registro.</p>
        </Card>
      ) : (
        <div className="space-y-10">
          {Object.entries(byCategory).map(([cat, items]) => (
            <section key={cat}>
              <h2 className="font-display text-sm uppercase tracking-[0.25em] text-muted-foreground mb-3">{cat}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((a) => (
                  <Card key={a.id} className="flex flex-col">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base">{a.title}</CardTitle>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => { setEditing(a); setDialogOpen(true); }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => confirm("Remover este item?") && deleteMutation.mutate(a.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      {a.description && <CardDescription>{a.description}</CardDescription>}
                    </CardHeader>
                    <CardContent className="flex-1 space-y-3">
                      {a.content && <p className="text-sm whitespace-pre-wrap text-foreground/80">{a.content}</p>}
                      {a.tags && a.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {a.tags.map((t) => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
                        </div>
                      )}
                      <div className="flex flex-col gap-2">
                        {a.file_url && (
                          <a href={a.file_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                            <Upload className="h-3 w-3" /> Arquivo anexado
                          </a>
                        )}
                        {a.link_url && (
                          <a href={a.link_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                            <ExternalLink className="h-3 w-3" /> Link externo
                          </a>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <AssetDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        userId={user.id}
        onSaved={() => qc.invalidateQueries({ queryKey: ["design-assets"] })}
      />
    </div>
  );
}

function AssetDialog({
  open, onOpenChange, editing, userId, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: DesignAsset | null;
  userId: string;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    title: "", category: "geral", description: "", content: "",
    file_url: "", link_url: "", tags: "",
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) {
      setForm({
        title: editing.title,
        category: editing.category,
        description: editing.description ?? "",
        content: editing.content ?? "",
        file_url: editing.file_url ?? "",
        link_url: editing.link_url ?? "",
        tags: (editing.tags ?? []).join(", "),
      });
    } else {
      setForm({ title: "", category: "geral", description: "", content: "", file_url: "", link_url: "", tags: "" });
    }
  }, [editing, open]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `design/${userId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("team-assets").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); setUploading(false); return; }
    const { data } = supabase.storage.from("team-assets").getPublicUrl(path);
    setForm((f) => ({ ...f, file_url: data.publicUrl }));
    setUploading(false);
    toast.success("Arquivo enviado");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Título obrigatório");
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      category: form.category.trim() || "geral",
      description: form.description.trim() || null,
      content: form.content.trim() || null,
      file_url: form.file_url.trim() || null,
      link_url: form.link_url.trim() || null,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      created_by: userId,
    };
    const { error } = editing
      ? await supabase.from("design_assets").update(payload).eq("id", editing.id)
      : await supabase.from("design_assets").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Atualizado" : "Criado");
    onSaved();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar item" : "Novo item de design"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5 md:col-span-2">
              <Label>Título *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Input
                list="design-categories"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
              <datalist id="design-categories">
                {CATEGORIES.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <Label>Tags (separadas por vírgula)</Label>
              <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="branding, ícones" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Descrição curta</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Conteúdo / Notas</Label>
            <Textarea rows={5} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Link externo</Label>
              <Input type="url" value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} placeholder="https://figma.com/..." />
            </div>
            <div className="space-y-1.5">
              <Label>Arquivo (upload)</Label>
              <Input type="file" onChange={handleFile} disabled={uploading} />
              {form.file_url && (
                <a href={form.file_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline truncate inline-block max-w-full">
                  {form.file_url}
                </a>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving || uploading}>{saving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
