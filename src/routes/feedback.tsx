import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/shared/ConfirmButton";
import { FeedbackDialog } from "@/components/feedback/FeedbackDialog";
import {
  Plus,
  Lightbulb,
  Bug,
  Zap,
  Trash2,
  MessageSquare,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { motion } from "framer-motion";

export const Route = createFileRoute("/feedback")({
  head: () => ({
    meta: [
      { title: "Feedback — Battle Arena" },
      { name: "description", content: "Envie sugestões, bugs e melhorias para o sistema." },
    ],
  }),
  component: FeedbackPage,
});

const TYPE_META = {
  suggestion: { label: "Sugestão", icon: Lightbulb, color: "text-gold", border: "border-gold/40" },
  bug: { label: "Bug", icon: Bug, color: "text-destructive", border: "border-destructive/40" },
  improvement: { label: "Melhoria", icon: Zap, color: "text-primary", border: "border-primary/40" },
} as const;

const STATUS_META = {
  open: { label: "Aberto", variant: "outline" as const },
  in_review: { label: "Em análise", variant: "secondary" as const },
  resolved: { label: "Resolvido", variant: "default" as const },
  closed: { label: "Fechado", variant: "outline" as const },
};

function FeedbackPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["feedback", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feedback")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("feedback").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Feedback removido.");
      qc.invalidateQueries({ queryKey: ["feedback"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao remover."),
  });

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-4xl sm:text-5xl tracking-wider">
            FEED<span className="text-gold">BACK</span>
          </h1>
          <p className="mt-2 text-muted-foreground uppercase tracking-widest text-xs">
            Sugestões · Bugs · Melhorias
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Novo feedback
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-12 text-sm uppercase tracking-widest">
          Carregando...
        </div>
      ) : items.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Você ainda não enviou nenhum feedback.</p>
          <Button onClick={() => setDialogOpen(true)} className="mt-4 gap-2">
            <Plus className="h-4 w-4" /> Enviar primeiro feedback
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 auto-rows-fr items-stretch">
          {items.map((item: any, idx: number) => {
            const meta = TYPE_META[item.type as keyof typeof TYPE_META];
            const Icon = meta.icon;
            const status = STATUS_META[item.status as keyof typeof STATUS_META];
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="h-full"
              >
                <Card className={`p-5 border ${meta.border} shadow-card h-full flex flex-col`}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${meta.color}`} />
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        {meta.label}
                      </span>
                    </div>
                    <Badge variant={status.variant} className="text-[10px] uppercase tracking-widest">
                      {status.label}
                    </Badge>
                  </div>

                  <h3 className="font-display text-lg tracking-wide mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap flex-1">
                    {item.description}
                  </p>

                  {item.admin_notes && (
                    <div className="mt-3 p-3 rounded-md border border-gold/30 bg-gold/5">
                      <div className="text-[10px] uppercase tracking-widest text-gold mb-1">
                        Resposta da equipe
                      </div>
                      <p className="text-sm text-foreground/90 whitespace-pre-wrap">
                        {item.admin_notes}
                      </p>
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
                    <span>
                      {format(new Date(item.created_at), "dd MMM yyyy · HH:mm", { locale: ptBR })}
                    </span>
                    {item.status === "open" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm("Remover este feedback?")) deleteMutation.mutate(item.id);
                        }}
                        className="h-7 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <FeedbackDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
