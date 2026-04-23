import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pin, Megaphone, Heart } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

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
  const { user } = useAuth();
  const qc = useQueryClient();

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

  const { data: likes = [] } = useQuery({
    queryKey: ["announcement_likes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcement_likes")
        .select("announcement_id, user_id");
      if (error) throw error;
      return data as { announcement_id: string; user_id: string }[];
    },
  });

  const likeStats = (id: string) => {
    const list = likes.filter((l) => l.announcement_id === id);
    return {
      count: list.length,
      liked: !!user && list.some((l) => l.user_id === user.id),
    };
  };

  const toggleLike = useMutation({
    mutationFn: async ({ id, liked }: { id: string; liked: boolean }) => {
      if (!user) throw new Error("Faça login para curtir");
      if (liked) {
        const { error } = await supabase
          .from("announcement_likes")
          .delete()
          .eq("announcement_id", id)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("announcement_likes")
          .insert({ announcement_id: id, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["announcement_likes"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-5xl tracking-wider">
          MURAL DE <span className="text-gold">AVISOS</span>
        </h1>
        <p className="mt-2 text-muted-foreground uppercase tracking-widest text-xs">
          {posts.length} comunicados · publicados pela comissão técnica
        </p>
      </div>

      {posts.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg py-16 text-center">
          <Megaphone className="h-10 w-10 text-gold mx-auto mb-3 opacity-60" />
          <p className="text-muted-foreground">Nenhum aviso publicado.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {posts.map((p, i) => {
            const { count, liked } = likeStats(p.id);
            return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Card className={`p-5 border-border shadow-card ${p.pinned ? "border-gold/40 bg-gold/5" : ""}`}>
                <div className="flex items-center gap-2 flex-wrap">
                  {p.pinned && (
                    <Badge variant="outline" className="border-gold/40 text-gold text-[10px] uppercase">
                      <Pin className="h-2.5 w-2.5 mr-1" /> Fixado
                    </Badge>
                  )}
                  <h3 className="font-display text-xl tracking-wider">{p.title}</h3>
                </div>
                <p className="mt-2 text-sm text-foreground whitespace-pre-wrap">{p.body}</p>
                <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {format(new Date(p.created_at), "EEE, dd MMM yyyy · HH:mm", { locale: ptBR })}
                  </div>
                  <Button
                    size="sm"
                    variant={liked ? "default" : "outline"}
                    disabled={!user || toggleLike.isPending}
                    onClick={() => toggleLike.mutate({ id: p.id, liked })}
                    className={`h-7 px-2.5 text-xs gap-1.5 ${liked ? "" : "hover:text-gold hover:border-gold/40"}`}
                    title={user ? (liked ? "Descurtir" : "Curtir") : "Faça login para curtir"}
                  >
                    <Heart className={`h-3.5 w-3.5 ${liked ? "fill-current" : ""}`} />
                    {count}
                  </Button>
                </div>
              </Card>
            </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
