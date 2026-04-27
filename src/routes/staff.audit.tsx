import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useStaff } from "@/hooks/useStaff";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldAlert } from "lucide-react";
import { listAudit } from "@/server/staff.functions";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/staff/audit")({
  component: AuditPage,
});

function AuditPage() {
  const { isOwner, loading } = useStaff();
  const { data, isLoading } = useQuery({
    queryKey: ["staff-audit"],
    queryFn: () => listAudit(),
    enabled: isOwner,
  });

  if (loading) return null;

  if (!isOwner) {
    return (
      <Card className="p-10 text-center border-destructive/40">
        <ShieldAlert className="h-8 w-8 mx-auto text-destructive mb-3" />
        <p className="text-sm text-muted-foreground">Apenas o proprietário pode ver o log de auditoria.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Administração</div>
        <h1 className="font-display text-3xl tracking-wider">AUDIT LOG</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Últimas 200 ações de funcionários no Staff Console.
        </p>
      </header>

      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quando</TableHead>
              <TableHead>Quem</TableHead>
              <TableHead>Função</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Alvo</TableHead>
              <TableHead>Detalhes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Carregando...</TableCell></TableRow>
            )}
            {!isLoading && (data ?? []).length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Nenhuma ação registrada ainda.</TableCell></TableRow>
            )}
            {(data ?? []).map((row) => (
              <TableRow key={row.id}>
                <TableCell className="text-xs">{format(new Date(row.created_at), "dd/MM HH:mm", { locale: ptBR })}</TableCell>
                <TableCell className="text-xs">{row.staff_email || row.staff_user_id.slice(0, 8)}</TableCell>
                <TableCell>
                  {row.staff_role && <Badge variant="outline" className="text-[10px] uppercase">{row.staff_role}</Badge>}
                </TableCell>
                <TableCell className="text-xs font-mono">{row.action}</TableCell>
                <TableCell className="text-xs">{row.target_email ?? row.target_team_id ?? "—"}</TableCell>
                <TableCell className="text-[10px] font-mono text-muted-foreground max-w-xs truncate">
                  {row.payload ? JSON.stringify(row.payload) : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
