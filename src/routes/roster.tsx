import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Pencil, Crown, Headphones, ClipboardList, Swords } from "lucide-react";
import { ROLE_LABEL, ROLE_COLORS, LANE_LABEL } from "@/lib/pokemon";
import { PokemonImage } from "@/components/PokemonImage";
import { PokemonPicker } from "@/components/PokemonPicker";
import { toast } from "sonner";
import { motion } from "framer-motion";

export const Route = createFileRoute("/roster")({
  head: () => ({
    meta: [
      { title: "Roster — Battle Arena" },
      { name: "description", content: "Jogadores, reservas, coach e gerentes do time." },
    ],
  }),
  component: RosterPage,
});

type Member = {
  id: string;
  name: string;
  ign: string | null;
  role: "player" | "substitute" | "coach" | "manager";
  lane: "top" | "jungle" | "mid" | "bot" | "support" | "flex" | null;
  main_pokemon: string | null;
  discord: string | null;
  notes: string | null;
};

const ROLE_ICONS = {
  player: Swords,
  substitute: ClipboardList,
  coach: Headphones,
  manager: Crown,
};

const SECTIONS: { key: Member["role"]; title: string; subtitle: string }[] = [
  { key: "player", title: "Titulares", subtitle: "Five for the Aeos Cup" },
  { key: "substitute", title: "Reservas", subtitle: "Backup squad" },
  { key: "coach", title: "Coaching Staff", subtitle: "Strategy & analysis" },
  { key: "manager", title: "Gestão", subtitle: "Operações do time" },
];

function RosterPage() {
  const qc = useQueryClient();
  const { data: members = [], isLoading } = useQuery({
    queryKey: ["members"],
    queryFn: async () => {
      const { data, error } = await supabase.from("members").select("*").order("created_at");
      if (error) throw error;
      return data as Member[];
    },
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);

  const saveMutation = useMutation({
    mutationFn: async (m: Partial<Member>) => {
      // Strip non-editable / server-managed fields to avoid Postgres errors
      const { id: _id, ...rest } = m as any;
      const payload = {
        name: rest.name?.trim(),
        ign: rest.ign?.trim() || null,
        role: rest.role ?? "player",
        lane: rest.lane ?? null,
        main_pokemon: rest.main_pokemon ?? null,
        discord: rest.discord?.trim() || null,
        notes: rest.notes?.trim() || null,
      };
      if (editing) {
        const { error } = await supabase
          .from("members")
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("members").insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["members"] });
      setOpen(false);
      setEditing(null);
      toast.success(editing ? "Membro atualizado" : "Membro adicionado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["members"] });
      toast.success("Membro removido");
    },
  });

  return (
    <div className="space-y-10">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-5xl tracking-wider">
            ROSTER <span className="text-gold">DO TIME</span>
          </h1>
          <p className="mt-2 text-muted-foreground uppercase tracking-widest text-xs">
            {members.length} {members.length === 1 ? "membro" : "membros"} ativos
          </p>
        </div>

        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button size="lg" className="bg-gradient-primary shadow-glow uppercase tracking-wider">
              <Plus className="mr-2 h-4 w-4" /> Novo membro
            </Button>
          </DialogTrigger>
          {open && (
            <MemberDialog
              key={editing?.id ?? "new"}
              editing={editing}
              onSave={(m) => saveMutation.mutate(m)}
              saving={saveMutation.isPending}
            />
          )}
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-20">Carregando roster...</div>
      ) : (
        SECTIONS.map((section) => {
          const sectionMembers = members.filter((m) => m.role === section.key);
          const Icon = ROLE_ICONS[section.key];
          return (
            <section key={section.key}>
              <div className="flex items-center gap-3 mb-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-card border border-border">
                  <Icon className="h-5 w-5 text-gold" />
                </div>
                <div>
                  <h2 className="font-display text-2xl tracking-wider">{section.title}</h2>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest">{section.subtitle}</p>
                </div>
                <div className="flex-1 h-px bg-border ml-3" />
                <Badge variant="outline" className="border-border">{sectionMembers.length}</Badge>
              </div>

              {sectionMembers.length === 0 ? (
                <div className="border border-dashed border-border rounded-lg py-8 text-center text-sm text-muted-foreground">
                  Nenhum {ROLE_LABEL[section.key].toLowerCase()} cadastrado.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {sectionMembers.map((m, i) => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <Card className="p-5 bg-card border-border hover:border-primary/50 transition-all shadow-card group">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-gradient-primary text-primary-foreground font-display text-xl shadow-glow">
                              {m.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-display text-lg leading-tight">{m.name}</div>
                              {m.ign && <div className="text-xs text-gold uppercase tracking-wider">@{m.ign}</div>}
                            </div>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {m.role === "player" || m.role === "substitute" ? (
                              <Link
                                to="/jogadores/$memberId"
                                params={{ memberId: m.id }}
                                className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-accent text-muted-foreground hover:text-gold"
                                title="Ver perfil & KDA"
                              >
                                <Swords className="h-3.5 w-3.5" />
                              </Link>
                            ) : null}
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(m); setOpen(true); }}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 hover:text-destructive" onClick={() => { if (confirm(`Remover ${m.name}?`)) deleteMutation.mutate(m.id); }}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <Badge className={`uppercase tracking-wider text-[10px] ${ROLE_COLORS[m.role]}`} variant="outline">
                            {ROLE_LABEL[m.role]}
                          </Badge>
                          {m.lane && (
                            <Badge variant="outline" className="border-border text-[10px] uppercase tracking-wider">
                              {LANE_LABEL[m.lane]}
                            </Badge>
                          )}
                        </div>

                        {m.main_pokemon && (
                          <div className="mt-3 flex items-center gap-3">
                            <div className="h-14 w-14 shrink-0">
                              <PokemonImage name={m.main_pokemon} withRoleBg />
                            </div>
                            <div>
                              <div className="text-muted-foreground text-[10px] uppercase tracking-widest">Main</div>
                              <div className="text-foreground font-medium text-sm">{m.main_pokemon}</div>
                            </div>
                          </div>
                        )}
                        {m.discord && (
                          <div className="mt-1 text-xs text-muted-foreground">Discord: {m.discord}</div>
                        )}
                        {m.notes && (
                          <p className="mt-3 text-xs text-muted-foreground italic line-clamp-2">{m.notes}</p>
                        )}
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}

function MemberDialog({ editing, onSave, saving }: { editing: Member | null; onSave: (m: Partial<Member>) => void; saving: boolean }) {
  const [form, setForm] = useState<Partial<Member>>(
    editing ?? { role: "player", lane: "flex" }
  );

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle className="font-display text-2xl tracking-wider">
          {editing ? "Editar membro" : "Novo membro"}
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Nome</Label>
            <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>IGN</Label>
            <Input value={form.ign ?? ""} onChange={(e) => setForm({ ...form, ign: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Função</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as any })}>
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
            <Select value={form.lane ?? "flex"} onValueChange={(v) => setForm({ ...form, lane: v as Member["lane"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(LANE_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Pokémon Main</Label>
            <PokemonPicker
              value={form.main_pokemon}
              onChange={(v) => setForm({ ...form, main_pokemon: v })}
            />
          </div>
          <div>
            <Label>Discord</Label>
            <Input value={form.discord ?? ""} onChange={(e) => setForm({ ...form, discord: e.target.value })} />
          </div>
        </div>
        <div>
          <Label>Notas</Label>
          <Textarea value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
        </div>
      </div>
      <DialogFooter>
        <Button
          className="bg-gradient-primary shadow-glow uppercase tracking-wider"
          disabled={!form.name || saving}
          onClick={() => onSave(form)}
        >
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
