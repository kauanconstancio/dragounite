import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { PokemonImage } from "@/components/PokemonImage";
import { UniteBuildCard } from "@/components/builds/UniteBuildCard";
import { Sparkles, Zap } from "lucide-react";
import { skillImage, type UniteDbBuild, type UniteDbPokemon, type UniteDbSkill } from "@/lib/unite-db-types";
import { SkillTooltip } from "@/components/builds/UniteTooltips";

function SkillIcon({ pokemonSlug, skill }: { pokemonSlug: string; skill: UniteDbSkill }) {
  const [err, setErr] = useState(false);
  // "Attack" (Basic) não tem ícone próprio no CDN.
  const hasIcon = skill.name && skill.name.toLowerCase() !== "attack";
  if (!hasIcon || err) {
    return (
      <div className="h-12 w-12 rounded-md bg-muted/40 border border-border flex items-center justify-center shrink-0">
        <Zap className="h-4 w-4 text-muted-foreground/60" />
      </div>
    );
  }
  return (
    <img
      src={skillImage(pokemonSlug, skill.name)}
      alt={skill.name}
      loading="lazy"
      onError={() => setErr(true)}
      className="h-12 w-12 rounded-md bg-muted/40 border border-border object-contain shrink-0"
    />
  );
}

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
          <PokemonImage name={pokemon.display_name} uniteDbSlug={pokemon.name} withRoleBg />
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

      {Array.isArray(pokemon.skills) && pokemon.skills.length > 0 && (
        <section>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
            <Zap className="h-3 w-3 text-gold" /> Skills
          </div>
          <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
            {pokemon.skills.map((s) => (
              <SkillTooltip
                key={`sk-${s.name}`}
                skill={s}
                trigger={
                  <div className="flex items-center gap-2 p-2 rounded-md border border-border bg-card/40 cursor-help hover:border-primary/40 transition-colors w-full">
                    <SkillIcon pokemonSlug={pokemon.name} skill={s} />
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-foreground truncate">{s.name}</div>
                      {s.ability && (
                        <div className="text-[9px] uppercase tracking-widest text-muted-foreground truncate">
                          {s.ability}
                        </div>
                      )}
                    </div>
                  </div>
                }
              />
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
              <UniteBuildCard
                key={`${pokemon.name}-${b.name}`}
                build={b}
                pokemonSlug={pokemon.name}
                onImport={onImportBuild}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
