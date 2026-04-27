import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useStaff, type StaffRole } from "@/hooks/useStaff";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { UserPlus, Trash2, ShieldAlert } from "lucide-react";
import { addStaff, listStaff, removeStaff, updateStaff } from "@/server/staff.functions";

export const Route = createFileRoute("/staff/staff")({
  component: StaffMembersPage,
});

const ROLES: { value: StaffRole; label: string; desc: string }[] = [
  { value: "owner", label: "Proprietário", desc: "Acesso total" },
  { value: "developer", label: "Engenharia", desc: "Sistema, logs, infra" },
  { value: "finance", label: "Financeiro", desc: "Receita, planos, faturas" },
  { value: "support", label: "Suporte", desc: "Usuários e equipes" },
  { value: "marketing", label: "Marketing", desc: "Funil e campanhas" },
];

const ROLE_LABEL: Record<StaffRole, string> = Object.fromEntries(
  ROLES.map((r) => [r.value, r.label]),
) as Record<StaffRole, string>;

function StaffMembersPage() {
  const { isOwner, loading } = useStaff();
  const qc = useQueryClient();

  const { data: staff, isLoading } = useQuery({
    queryKey: ["staff-list"],
    queryFn: () => listStaff(),
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    email: "",
    role: "support" as StaffRole,
    full_name: "",
    department: "",
  });

  const addMut = useMutation({
    mutationFn: () =>
      addStaff({
        data: {
          email: form.email.trim(),
          role: form.role,
          full_name: form.full_name.trim(),
          department: form.department.trim() || undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Funcionário adicionado");
      setOpen(false);
      setForm({ email: "", role: "support", full_name: "", department: "" });
      qc.invalidateQueries({ queryKey: ["staff-list"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: (vars: { id: string; role?: StaffRole; active?: boolean }) =>
      updateStaff({ data: vars }),
    onSuccess: () => {
      toast.success("Atualizado");
      qc.invalidateQueries({ queryKey: ["staff-list"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => removeStaff({ data: { id } }),
    onSuccess: () => {
      toast.success("Funcionário removido");
      qc.invalidateQueries({ queryKey: ["staff-list"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading) return null;

  if (!isOwner) {
    return (
      <Card className="p-10 text-center border-destructive/40">
        <ShieldAlert className="h-8 w-8 mx-auto text-destructive mb-3" />
        <p className="text-sm text-muted-foreground">Apenas o proprietário pode gerenciar funcionários.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Administração</div>
          <h1 className="font-display text-3xl tracking-wider">FUNCIONÁRIOS</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie quem da empresa tem acesso ao Staff Console e em quais áreas.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" /> Adicionar funcionário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar funcionário</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Email da conta existente *</label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="funcionario@gymly.com"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  A pessoa precisa ter uma conta no GymLy primeiro. Peça para criar em /auth.
                </p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Nome completo *</label>
                <Input
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Departamento</label>
                <Input
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  placeholder="Ex: Engenharia, Customer Success..."
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Função *</label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as StaffRole })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label} — <span className="text-muted-foreground">{r.desc}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button
                onClick={() => addMut.mutate()}
                disabled={!form.email || !form.full_name || addMut.isPending}
              >
                {addMut.isPending ? "Adicionando..." : "Adicionar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Função</TableHead>
              <TableHead>Departamento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Carregando...</TableCell></TableRow>
            )}
            {!isLoading && (staff ?? []).length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Nenhum funcionário ainda.</TableCell></TableRow>
            )}
            {(staff ?? []).map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.full_name ?? "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{s.email}</TableCell>
                <TableCell>
                  <Select
                    value={s.role}
                    onValueChange={(v) => updateMut.mutate({ id: s.id, role: v as StaffRole })}
                  >
                    <SelectTrigger className="h-8 w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-xs">{s.department ?? "—"}</TableCell>
                <TableCell>
                  {s.active ? (
                    <Badge variant="outline" className="text-emerald-500 border-emerald-500/40">Ativo</Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">Inativo</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateMut.mutate({ id: s.id, active: !s.active })}
                  >
                    {s.active ? "Desativar" : "Reativar"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm(`Remover ${s.full_name ?? s.email} da equipe?`)) {
                        removeMut.mutate(s.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Card className="p-4 border-border bg-card/40">
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">Roles disponíveis:</strong>{" "}
          {ROLES.map((r) => `${r.label} (${r.desc})`).join(" · ")}
        </p>
      </Card>
    </div>
  );
}
