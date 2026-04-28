import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollText, Search, AlertTriangle, Calendar } from "lucide-react";
import { getUniteDbPatches } from "@/server/unite-db.functions";
import { motion } from "framer-motion";

export const Route = createFileRoute("/patches")({
  head: () => ({
    meta: [
      { title: "Patch Notes — Battle Arena" },
      { name: "description", content: "Acompanhe os últimos patches do Pokémon Unite, com resumo de balanceamento, bugfixes e novidades." },
    ],
  }),
  component: PatchesPage,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-destructive">Erro: {error.message}</p>
        <Button onClick={() => { router.invalidate(); reset(); }}>Tentar novamente</Button>
      </div>
    );
  },
});

function inferType(title: string): { label: string; cls: string } {
  const t = title.toLowerCase();
  if (t.includes("bugfix") || t.includes("hotfix")) {
    return { label: "Bugfix", cls: "border-destructive/50 text-destructive bg-destructive/10" };
  }
  if (t.includes("balance") || t.includes("balanc")) {
    return { label: "Balance", cls: "border-primary/50 text-primary bg-primary/10" };
  }
  if (t.includes("season") || t.includes("event")) {
    return { label: "Evento", cls: "border-gold/50 text-gold bg-gold/10" };
  }
  return { label: "Patch", cls: "border-sky-500/50 text-sky-400 bg-sky-500/10" };
}

function formatDate(iso: string): string {
  if (!iso) return "";
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function PatchesPage() {
  const { data: resp, isLoading } = useQuery({
    queryKey: ["unite-db", "patches"],
    queryFn: () => getUniteDbPatches(),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const patches = resp?.data ?? [];
  const error = resp?.error ?? null;

  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return patches;
    return patches.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.patchNoteDetails.toLowerCase().includes(q),
    );
  }, [patches, search]);

  const featured = filtered[0];
  const rest = filtered.slice(1);

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-5xl tracking-wider">
            PATCH <span className="text-gold">NOTES</span>
          </h1>
          <p className="mt-2 text-muted-foreground uppercase tracking-widest text-xs">
            {patches.length} patches catalogados
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar (ex: Pikachu, bugfix)..."
            className="pl-9"
          />
        </div>
      </header>

      {error && (
        <Card className="p-3 border-destructive/50 bg-destructive/5 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
          <div className="text-xs">
            <div className="font-medium text-destructive">{error}</div>
            <div className="text-muted-foreground">Tente novamente em instantes.</div>
          </div>
        </Card>
      )}

      {isLoading ? (
        <div className="border border-dashed border-border rounded-lg py-16 text-center text-muted-foreground text-xs uppercase tracking-[0.3em]">
          Carregando patch notes...
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg py-16 text-center">
          <ScrollText className="h-10 w-10 text-gold mx-auto mb-3 opacity-60" />
          <p className="text-muted-foreground">Nenhum patch encontrado.</p>
        </div>
      ) : (
        <>
          {featured && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="p-6 border-gold/40 bg-gradient-to-br from-gold/10 via-transparent to-primary/5 shadow-glow">
                <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                  <div>
                    <Badge variant="outline" className={`text-[10px] uppercase tracking-widest mb-2 ${inferType(featured.title).cls}`}>
                      Mais recente · {inferType(featured.title).label}
                    </Badge>
                    <h2 className="font-display text-3xl tracking-wider">{featured.title}</h2>
                    <div className="text-xs text-muted-foreground uppercase tracking-widest mt-1 flex items-center gap-1.5">
                      <Calendar className="h-3 w-3" />
                      {formatDate(featured.patchDate)}
                    </div>
                  </div>
                </div>
                <PatchMarkdown content={featured.patchNoteDetails} />
              </Card>
            </motion.div>
          )}

          {rest.length > 0 && (
            <section className="space-y-3">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Patches anteriores
              </div>
              {rest.map((p, i) => {
                const type = inferType(p.title);
                const isOpen = openId === p.id;
                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i, 8) * 0.02 }}
                  >
                    <Card className="border-border overflow-hidden">
                      <button
                        onClick={() => setOpenId(isOpen ? null : p.id)}
                        className="w-full p-4 flex items-center gap-4 text-left hover:bg-accent/30 transition-colors"
                      >
                        <Badge variant="outline" className={`text-[9px] uppercase tracking-widest ${type.cls} shrink-0`}>
                          {type.label}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <div className="font-display text-base tracking-wider truncate">{p.title}</div>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-widest">
                            {formatDate(p.patchDate)}
                          </div>
                        </div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-widest shrink-0">
                          {isOpen ? "Recolher" : "Ler"}
                        </div>
                      </button>
                      {isOpen && (
                        <div className="border-t border-border px-4 py-4">
                          <PatchMarkdown content={p.patchNoteDetails} />
                        </div>
                      )}
                    </Card>
                  </motion.div>
                );
              })}
            </section>
          )}
        </>
      )}

      <p className="text-center text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60 pt-4">
        Patch notes via unite-db.com
      </p>
    </div>
  );
}

function PatchMarkdown({ content }: { content: string }) {
  return (
    <div className="prose prose-sm prose-invert max-w-none
      prose-headings:font-display prose-headings:tracking-wider prose-headings:uppercase
      prose-h2:text-xl prose-h2:text-gold prose-h2:border-b prose-h2:border-border prose-h2:pb-1
      prose-h3:text-base prose-h3:text-primary
      prose-h4:text-sm prose-h4:text-foreground
      prose-h6:text-xs prose-h6:text-muted-foreground prose-h6:tracking-widest
      prose-p:text-foreground/80 prose-p:text-sm
      prose-strong:text-foreground prose-em:text-gold
      prose-ul:text-foreground/80 prose-li:my-0.5
      prose-a:text-primary prose-a:no-underline hover:prose-a:underline">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
