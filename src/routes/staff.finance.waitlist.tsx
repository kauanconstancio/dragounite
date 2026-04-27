import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStaff } from "@/hooks/useStaff";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldAlert, Download, ScrollText } from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/staff/finance/waitlist")({
  component: WaitlistPipelinePage,
});

function WaitlistPipelinePage() {
  const { isOwner, hasStaffRole, loading } = useStaff();
  const allowed = isOwner || hasStaffRole("finance") || hasStaffRole("marketing");

  const { data: items, isLoading } = useQuery({
    queryKey: ["staff-waitlist"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("waitlist")
        .select("*")
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
        <p className="text-sm text-muted-foreground">Acesso restrito.</p>
      </Card>
    );
  }

  const list = items ?? [];

  // Last 30 days, by day
  const series = Array.from({ length: 30 }).map((_, i) => {
    const day = startOfDay(subDays(new Date(), 29 - i));
    const next = startOfDay(subDays(new Date(), 28 - i));
    return {
      day: format(day, "dd/MM", { locale: ptBR }),
      inscritos: list.filter((w) => {
        const d = new Date(w.created_at);
        return d >= day && d < next;
      }).length,
    };
  });

  function exportCsv() {
    const header = "email,team_name,source,created_at\n";
    const rows = list
      .map((w) => `"${w.email}","${w.team_name ?? ""}","${w.source}","${w.created_at}"`)
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `waitlist-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Pipeline</div>
          <h1 className="font-display text-3xl tracking-wider">WAITLIST</h1>
          <p className="text-sm text-muted-foreground mt-1">{list.length} inscritos · use como fonte de leads.</p>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={list.length === 0}>
          <Download className="h-4 w-4 mr-2" /> Exportar CSV
        </Button>
      </header>

      <Card className="p-5 border-border bg-card/70">
        <div className="flex items-center gap-2 mb-3">
          <ScrollText className="h-4 w-4 text-gold" />
          <h2 className="font-display text-lg tracking-wider">Inscrições · 30 dias</h2>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={10} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Bar dataKey="inscritos" fill="hsl(var(--gold))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quando</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Origem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Carregando...</TableCell></TableRow>
            )}
            {!isLoading && list.length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Ninguém na waitlist ainda.</TableCell></TableRow>
            )}
            {list.map((w) => (
              <TableRow key={w.id}>
                <TableCell className="text-xs">{format(new Date(w.created_at), "dd/MM HH:mm", { locale: ptBR })}</TableCell>
                <TableCell className="text-xs">{w.email}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{w.team_name ?? "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{w.source}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
