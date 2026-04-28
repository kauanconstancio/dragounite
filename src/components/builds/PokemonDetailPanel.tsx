import { Badge } from "@/components/ui/badge";
import { PokemonImage } from "@/components/PokemonImage";
import { UniteBuildCard } from "@/components/builds/UniteBuildCard";
import { Sparkles, Zap } from "lucide-react";
import type { UniteDbBuild, UniteDbPokemon } from "@/lib/unite-db-types";

const TIER_COLORS: Record<string, string> = {
  S: "border-gold/60 text-gold bg-gold/10",
  A: "border-primary/60 text-primary bg-primary/10",
  B: "border-sky-400/60 text-sky-400 bg-sky-500/10",
  C: "border-emerald-400/60 text-emerald-400 bg-emerald-500/10",
  D: "border-muted-foreground/40 text-muted-foreground bg-muted/30",
};

export function PokemonDetailPanel({
  pokemon,
  onImportBuild,
}: {
  pokemon: UniteDbPokemon;
  onImportBuild?: (b: UniteDbBuild) => void;
}) {
  const tierClass = TIER_COLORS[pokemon.tier ?? ""] ?? "border-border text-muted-foreground";

  return (
    <div className="space-y-6">
      <header className="flex items-start gap-4">
        <div className="h-24 w-24 shrink-0">
          <PokemonImage name={pokemon.display_name} withRoleBg />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-display text-3xl tracking-wider">{pokemon.display_name}</h2>
          <div className="flex flex-wrap gap-2 mt-2">
            {pokemon.tier && (
              <Badge variant="outline" className={`text-[10px] uppercase tracking-widest ${tierClass}`}>
                Tier {pokemon.tier}
              </Badge>
            )}
            {pokemon.soloQtier && pokemon.soloQtier !== pokemon.tier && (
              <Badge variant="outline" className="text-[10px] uppercase tracking-widest border-border text-muted-foreground">
                SoloQ {pokemon.soloQtier}
              </Badge>
            )}
            {pokemon.damage_type && (
              <Badge variant="outline" className="text-[10px] uppercase tracking-widest border-border text-foreground">
                {pokemon.damage_type}
              </Badge>
            )}
            {[pokemon.tags?.role, pokemon.tags?.range, pokemon.tags?.difficulty]
              .filter((t): t is string => Boolean(t))
              .slice(0, 4)
              .map((t) => (
                <Badge key={t} variant="outline" className="text-[10px] uppercase tracking-widest border-border/60 text-muted-foreground">
                  {t}
                </Badge>
              ))}
          </div>
          {pokemon.notes && (
            <p className="mt-3 text-xs text-muted-foreground italic line-clamp-3">{pokemon.notes}</p>
          )}
        </div>
      </header>

      {(pokemon.early_learn?.length || pokemon.standard_moves?.length) && (
        <section>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
            <Zap className="h-3 w-3 text-gold" /> Skill Pool
          </div>
          <div className="flex flex-wrap gap-1.5">
            {pokemon.early_learn?.map((s) => (
              <Badge key={`e-${s}`} variant="outline" className="text-[10px] border-muted-foreground/40 text-muted-foreground">
                {s}
              </Badge>
            ))}
            {pokemon.standard_moves?.map((s) => (
              <Badge key={`u-${s}`} variant="outline" className="text-[10px] border-primary/40 text-primary">
                {s}
              </Badge>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-gold" />
          Builds sugeridas ({pokemon.builds?.length ?? 0})
        </div>
        {!pokemon.builds || pokemon.builds.length === 0 ? (
          <div className="border border-dashed border-border rounded-lg py-8 text-center text-xs text-muted-foreground">
            Sem builds catalogadas para este Pokémon.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {pokemon.builds.map((b) => (
              <UniteBuildCard key={`${pokemon.name}-${b.name}`} build={b} onImport={onImportBuild} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
