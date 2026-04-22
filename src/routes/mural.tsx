import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2, Pencil, Pin, Megaphone } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { motion } from "framer-motion";

export const Route = createFileRoute("/mural")({
  head: () => ({
    meta: [
      { title: "Mural — Battle Arena" },
      { name: "description", content: "Avisos do coach e comunicados do time." },
    ],
  }),
  component: MuralPage,
});

type Announcement = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  created_at: string;
};

function MuralPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);

  const { data: posts = [] } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Announcement[];
    },
  });

  const save = useMutation({
    mutationFn: async (a: Partial<Announcement>) => {
      const payload = {
        title: a.title?.trim(),
        body: a.body?.trim(),
        pinned: a.pinned ?? false,
      };
      if (editing) {
        const { error } = await supabase.from("announcements").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("announcements").insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["announcements"] });
      setOpen(false);
      setEditing(null);
      toast.success("Salvo");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("announcements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["announcements"] });
      toast.success("Removido");
    },
  });

  const togglePin = useMutation({
    mutationFn: async (a: Announcement) => {
      const { error } = await supabase.from("announcements").update({ pinned: !a.pinned }).eq("id", a.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["announcements"] }),
  });

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-5xl tracking-wider">
            MURAL DE <span className="text-gold">AVISOS</span>
          </h1>
          <p className="mt-2 text-muted-foreground uppercase tracking-widest text-xs">
            {posts.length} comunicados
          </p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button size="lg" className="bg-gradient-primary shadow-glow uppercase tracking-wider">
              <Plus className="mr-2 h-4 w-4" /> Novo aviso
            </Button>
          </DialogTrigger>
          <PostDialog editing={editing} onSave={(p) => save.mutate(p)} saving={save.isPending} />
        </Dialog>
      </div>

      {posts.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg py-16 text-center">
          <Megaphone className="h-10 w-10 text-gold mx-auto mb-3 opacity-60" />
          <p className="text-muted-foreground">Nenhum aviso publicado.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {posts.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Card className={`p-5 border-border shadow-card group ${p.pinned ? "border-gold/40 bg-gold/5" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {p.pinned && (
                        <Badge variant="outline" className="border-gold/40 text-gold text-[10px] uppercase">
                          <Pin className="h-2.5 w-2.5 mr-1" /> Fixado
                        </Badge>
                      )}
                      <h3 className="font-display text-xl tracking-wider">{p.title}</h3>
                    </div>
                    <p className="mt-2 text-sm text-foreground whitespace-pre-wrap">{p.body}</p>
                    <div className="mt-3 text-[10px] uppercase tracking-widest text-muted-foreground">
                      {format(new Date(p.created_at), "EEE, dd MMM yyyy · HH:mm", { locale: ptBR })}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" onClick={() => togglePin.mutate(p)} title={p.pinned ? "Desafixar" : "Fixar"}>
                      <Pin className={`h-4 w-4 ${p.pinned ? "text-gold" : ""}`} />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="hover:text-destructive" onClick={() => { if (confirm("Remover aviso?")) remove.mutate(p.id); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function PostDialog({ editing, onSave, saving }: { editing: Announcement | null; onSave: (p: Partial<Announcement>) => void; saving: boolean }) {
  const [form, setForm] = useState({
    title: editing?.title ?? "",
    body: editing?.body ?? "",
    pinned: editing?.pinned ?? false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) return;
    onSave(form);
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle className="font-display text-2xl tracking-wider">
          {editing ? "Editar aviso" : "Novo aviso"}
        </DialogTitle>
        <DialogDescription>Comunique o time. Avisos fixados aparecem primeiro.</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="an-title">Título</Label>
          <Input id="an-title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
        </div>
        <div>
          <Label htmlFor="an-body">Mensagem</Label>
          <Textarea id="an-body" rows={6} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} required />
        </div>
        <div className="flex items-center justify-between rounded-md border border-border p-3">
          <Label htmlFor="an-pinned" className="cursor-pointer">Fixar no topo</Label>
          <Switch id="an-pinned" checked={form.pinned} onCheckedChange={(v) => setForm((f) => ({ ...f, pinned: v }))} />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={!form.title.trim() || !form.body.trim() || saving} className="bg-gradient-primary shadow-glow uppercase tracking-wider">
            {saving ? "Salvando..." : "Publicar"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
