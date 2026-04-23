import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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

type LikeRow = { announcement_id: string; user_id: string };
type ProfileRow = { user_id: string; display_name: string | null; avatar_url: string | null };

function MuralPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [openLikesFor, setOpenLikesFor] = useState<string | null>(null);

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
      return data as LikeRow[];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles", "mural"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url");
      if (error) throw error;
      return data as ProfileRow[];
    },
  });

  const profileMap = useMemo(() => {
    const m = new Map<string, ProfileRow>();
    for (const p of profiles) m.set(p.user_id, p);
    return m;
  }, [profiles]);

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
    onMutate: async ({ id, liked }) => {
      if (!user) return;
      await qc.cancelQueries({ queryKey: ["announcement_likes"] });
      const prev = qc.getQueryData<LikeRow[]>(["announcement_likes"]) ?? [];
      const next = liked
        ? prev.filter((l) => !(l.announcement_id === id && l.user_id === user.id))
        : [...prev, { announcement_id: id, user_id: user.id }];
      qc.setQueryData(["announcement_likes"], next);
      return { prev };
    },
    onError: (e: Error, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["announcement_likes"], ctx.prev);
      toast.error(e.message);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["announcement_likes"] }),
  });

  const openPost = posts.find((p) => p.id === openLikesFor) ?? null;
  const openLikers = openLikesFor
    ? likes.filter((l) => l.announcement_id === openLikesFor)
    : [];

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
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant={liked ? "default" : "outline"}
                        disabled={!user}
                        onClick={() => toggleLike.mutate({ id: p.id, liked })}
                        className={`h-7 px-2.5 text-xs gap-1.5 ${liked ? "" : "hover:text-gold hover:border-gold/40"}`}
                        title={user ? (liked ? "Descurtir" : "Curtir") : "Faça login para curtir"}
                      >
                        <Heart className={`h-3.5 w-3.5 ${liked ? "fill-current" : ""}`} />
                      </Button>
                      <button
                        type="button"
                        onClick={() => count > 0 && setOpenLikesFor(p.id)}
                        disabled={count === 0}
                        className="text-xs font-display tracking-wider px-2 h-7 rounded-md hover:text-gold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title={count > 0 ? "Ver quem curtiu" : "Sem curtidas"}
                      >
                        {count}
                      </button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <Dialog open={!!openLikesFor} onOpenChange={(o) => !o && setOpenLikesFor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display tracking-wider flex items-center gap-2">
              <Heart className="h-4 w-4 text-gold fill-current" />
              {openLikers.length} {openLikers.length === 1 ? "curtida" : "curtidas"}
            </DialogTitle>
            {openPost && (
              <DialogDescription className="line-clamp-1">{openPost.title}</DialogDescription>
            )}
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto space-y-2">
            {openLikers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Ninguém curtiu ainda.</p>
            ) : (
              openLikers.map((l) => {
                const prof = profileMap.get(l.user_id);
                const name = prof?.display_name ?? "Usuário";
                const initials = name.slice(0, 2).toUpperCase();
                return (
                  <div
                    key={l.user_id}
                    className="flex items-center gap-3 p-2 rounded-md border border-border bg-background/40"
                  >
                    <Avatar className="h-8 w-8">
                      {prof?.avatar_url && <AvatarImage src={prof.avatar_url} alt={name} />}
                      <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-display tracking-wider">{name}</span>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
