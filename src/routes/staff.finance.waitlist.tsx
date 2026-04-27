import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useStaff } from "@/hooks/useStaff";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldAlert, Download, ScrollText, Check, X, Loader2, CheckCircle2 } from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { setWaitlistApproval } from "@/server/onboarding.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/staff/finance/waitlist")({
  component: WaitlistPipelinePage,
});

function WaitlistPipelinePage() {
  const { isOwner, hasStaffRole, loading } = useStaff();
  const allowed = isOwner || hasStaffRole("finance") || hasStaffRole("marketing");
  const queryClient = useQueryClient();
  const setApprovalFn = useServerFn(setWaitlistApproval);

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

  const approveMutation = useMutation({
    mutationFn: async (vars: { id: string; approved: boolean }) =>
      setApprovalFn({ data: vars }),
    onSuccess: (_res, vars) => {
      toast.success(vars.approved ? "Acesso aprovado!" : "Aprovação removida.");
      queryClient.invalidateQueries({ queryKey: ["staff-waitlist"] });
    },
    onError: (err: Error) => toast.error(err.message),
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
  const approvedCount = list.filter((w) => w.approved).length;
  const claimedCount = list.filter((w) => w.claimed_at).length;
  const pendingCount = list.filter((w) => !w.approved && !w.claimed_at).length;

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
    const header = "email,team_name,source,approved,claimed_at,created_at\n";
    const rows = list
      .map(
        (w) =>
          `"${w.email}","${w.team_name ?? ""}","${w.source}","${w.approved}","${w.claimed_at ?? ""}","${w.created_at}"`,
      )
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
          <p className="text-sm text-muted-foreground mt-1">
            {list.length} inscritos · {approvedCount} aprovados · {claimedCount} ativaram conta
          </p>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={list.length === 0}>
          <Download className="h-4 w-4 mr-2" /> Exportar CSV
        </Button>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Pendentes</div>
          <div className="text-2xl font-display mt-1">{pendingCount}</div>
        </Card>
        <Card className="p-4">
          <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Aprovados (não ativaram)</div>
          <div className="text-2xl font-display mt-1 text-emerald-400">
            {approvedCount - claimedCount}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Contas criadas</div>
          <div className="text-2xl font-display mt-1 text-gold">{claimedCount}</div>
        </Card>
      </div>

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
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Carregando...</TableCell></TableRow>
            )}
            {!isLoading && list.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Ninguém na waitlist ainda.</TableCell></TableRow>
            )}
            {list.map((w) => {
              const pending = approveMutation.isPending && approveMutation.variables?.id === w.id;
              return (
                <TableRow key={w.id}>
                  <TableCell className="text-xs">{format(new Date(w.created_at), "dd/MM HH:mm", { locale: ptBR })}</TableCell>
                  <TableCell className="text-xs">{w.email}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{w.team_name ?? "—"}</TableCell>
                  <TableCell className="text-xs">
                    {w.claimed_at ? (
                      <Badge variant="outline" className="border-gold/40 text-gold gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Ativou
                      </Badge>
                    ) : w.approved ? (
                      <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 gap-1">
                        <Check className="h-3 w-3" /> Aprovado
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-border text-muted-foreground">
                        Pendente
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {w.claimed_at ? (
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        já ativada
                      </span>
                    ) : w.approved ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() =>
                          approveMutation.mutate({ id: w.id, approved: false })
                        }
                      >
                        {pending ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <X className="h-3 w-3 mr-1" /> Revogar
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        disabled={pending}
                        onClick={() =>
                          approveMutation.mutate({ id: w.id, approved: true })
                        }
                      >
                        {pending ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <Check className="h-3 w-3 mr-1" /> Aprovar
                          </>
                        )}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
