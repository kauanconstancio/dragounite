import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStaff } from "@/hooks/useStaff";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldAlert } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/staff/teams")({
  component: TeamsListPage,
});

function TeamsListPage() {
  const { isOwner, hasStaffRole, loading } = useStaff();
  const allowed = isOwner || hasStaffRole("support");

  const { data: teams, isLoading } = useQuery({
    queryKey: ["staff-teams-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name, slug, archived, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: allowed,
  });

  if (loading) return null;
  if (!allowed) {
    return (
      <Card className="p-10 text-center border-destructive/40">
        <ShieldAlert className="h-8 w-8 mx-auto text-destructive mb-3" />
        <p className="text-sm text-muted-foreground">Acesso restrito ao time de suporte.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Suporte</div>
        <h1 className="font-display text-3xl tracking-wider">ORGANIZAÇÕES</h1>
        <p className="text-sm text-muted-foreground mt-1">{teams?.length ?? 0} equipes cadastradas.</p>
      </header>

      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criada em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Carregando...</TableCell></TableRow>
            )}
            {(teams ?? []).map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground">{t.slug}</TableCell>
                <TableCell>
                  {t.archived ? (
                    <Badge variant="outline" className="text-muted-foreground">Arquivada</Badge>
                  ) : (
                    <Badge variant="outline" className="text-emerald-500 border-emerald-500/40">Ativa</Badge>
                  )}
                </TableCell>
                <TableCell className="text-xs">{format(new Date(t.created_at), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
