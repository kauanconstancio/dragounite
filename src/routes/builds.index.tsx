import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Search } from "lucide-react";
import { PokemonImage } from "@/components/PokemonImage";
import { motion } from "framer-motion";
import { getUniteDbPokemon } from "@/server/unite-db.functions";
import type { UniteDbPokemon } from "@/lib/unite-db-types";

export const Route = createFileRoute("/builds/")({
  head: () => ({
    meta: [
      { title: "Builds — Battle Arena" },
      { name: "description", content: "Builds oficiais do Pokémon Unite e seus guias customizados." },
    ],
  }),
  component: BuildsPage,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-destructive">Erro ao carregar Builds: {error.message}</p>
        <Button onClick={() => { router.invalidate(); reset(); }}>Tentar novamente</Button>
      </div>
    );
  },
});

const ROLE_FILTERS = ["Todos", "Attacker", "All-Rounder", "Speedster", "Defender", "Supporter"] as const;
type RoleFilter = (typeof ROLE_FILTERS)[number];

const ROLE_BADGE: Record<string, string> = {
  Attacker: "border-red-500/50 text-red-400 bg-red-500/10",
  "All-Rounder": "border-purple-500/50 text-purple-300 bg-purple-500/10",
  Speedster: "border-sky-500/50 text-sky-300 bg-sky-500/10",
  Defender: "border-emerald-500/50 text-emerald-300 bg-emerald-500/10",
  Supporter: "border-yellow-500/50 text-yellow-300 bg-yellow-500/10",
};

function matchesRole(p: UniteDbPokemon, role: RoleFilter): boolean {
  if (role === "Todos") return true;
  return (p.tags?.role ?? "").toLowerCase() === role.toLowerCase();
}

function BuildsPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("Todos");

  const { data: uniteResp, isLoading } = useQuery({
    queryKey: ["unite-db", "pokemon"],
    queryFn: () => getUniteDbPokemon(),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
  const allPokemon = uniteResp?.data ?? [];
  const uniteError = uniteResp?.error ?? null;

  const filteredPokemon = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allPokemon
      .filter((p) => matchesRole(p, roleFilter))
      .filter((p) => !q || p.display_name.toLowerCase().includes(q))
      .sort((a, b) => a.display_name.localeCompare(b.display_name));
  }, [allPokemon, search, roleFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-5xl tracking-wider">
          BUILDS & <span className="text-gold">GUIAS</span>
        </h1>
        <p className="mt-2 text-muted-foreground uppercase tracking-widest text-xs">
          {allPokemon.length} pokémons disponíveis · selecione para ver builds
        </p>
      </div>

      {uniteError && (
        <Card className="p-3 border-destructive/50 bg-destructive/5 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
          <div className="text-xs">
            <div className="font-medium text-destructive">{uniteError}</div>
          </div>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar Pokémon..."
            className="pl-8 h-10 text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ROLE_FILTERS.map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`text-[10px] uppercase tracking-widest px-3 py-1.5 rounded border transition-colors ${
                roleFilter === r
                  ? "border-primary text-primary bg-primary/10"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="border border-dashed border-border rounded-lg py-16 text-center text-muted-foreground text-xs uppercase tracking-[0.3em]">
          Carregando dados oficiais...
        </div>
      ) : filteredPokemon.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg py-16 text-center text-muted-foreground text-sm">
          Nenhum Pokémon encontrado.
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {filteredPokemon.map((p, i) => {
            const role = p.tags?.role ?? "";
            const badgeClass = ROLE_BADGE[role] ?? "border-border text-muted-foreground";
            return (
              <motion.div
                key={p.name}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.01, 0.3) }}
              >
                <Link
                  to="/builds/$pokemon"
                  params={{ pokemon: p.name }}
                  className="group block"
                >
                  <Card className="p-3 border-border hover:border-primary/60 hover:shadow-glow transition-all bg-card/60 h-full flex flex-col items-center text-center">
                    <div className="h-20 w-20 mb-2">
                      <PokemonImage name={p.display_name} withRoleBg />
                    </div>
                    <div className="font-display text-sm tracking-wider truncate w-full group-hover:text-primary transition-colors">
                      {p.display_name}
                    </div>
                    <div className="mt-1.5 flex flex-wrap justify-center gap-1">
                      {role && (
                        <Badge variant="outline" className={`text-[8px] uppercase tracking-widest ${badgeClass}`}>
                          {role}
                        </Badge>
                      )}
                      {p.tier && (
                        <Badge variant="outline" className="text-[8px] uppercase tracking-widest border-gold/40 text-gold">
                          T{p.tier}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1.5 text-[9px] text-muted-foreground uppercase tracking-widest">
                      {p.builds?.length ?? 0} builds
                    </div>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}

      <p className="text-center text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60 pt-4">
        Dados oficiais via unite-db.com
      </p>
    </div>
  );
}
