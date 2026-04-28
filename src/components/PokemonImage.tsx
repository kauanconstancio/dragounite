import { useState } from "react";
import { getPokemonSprite, getPokemonRole, UNITE_ROLE_STYLES } from "@/lib/pokemon";
import { pokemonImage } from "@/lib/unite-db-types";
import { usePokemonSlugIndex } from "@/hooks/usePokemonSlugIndex";
import { cn } from "@/lib/utils";

type Props = {
  name: string | null | undefined;
  /**
   * Slug oficial do unite-db (campo `name` da API). Quando informado,
   * pula a resolução automática e usa este slug direto.
   */
  uniteDbSlug?: string | null;
  className?: string;
  /** When true, wraps the sprite in a colored role-tinted background tile. */
  withRoleBg?: boolean;
};

/**
 * Renders a Pokémon's official Unite artwork.
 *
 * Resolução do src (em ordem de preferência):
 * 1. `uniteDbSlug` explícito → CDN unite-db
 * 2. Lookup automático no index do unite-db (cobre 91 pokémons sem mapeamento manual)
 * 3. Fallback para o sprite oficial mapeado em src/lib/pokemon.ts
 * 4. Texto com o nome se nada carregar
 */
export function PokemonImage({ name, uniteDbSlug, className, withRoleBg = false }: Props) {
  const [errored, setErrored] = useState(false);
  const { resolve, resolveRole } = usePokemonSlugIndex();
  const resolvedSlug = uniteDbSlug ?? resolve(name);
  const src = resolvedSlug ? pokemonImage(resolvedSlug) : getPokemonSprite(name);
  // Prioriza a role oficial do unite-db; fallback para o roster legado.
  const role = resolveRole(name) ?? getPokemonRole(name);
  const roleStyle = role ? UNITE_ROLE_STYLES[role] : null;

  if (!name) {
    return <span className="font-display text-xs text-muted-foreground">—</span>;
  }

  const inner =
    !src || errored ? (
      <span className="font-display text-[10px] leading-tight text-center px-1">
        {name}
      </span>
    ) : (
      <img
        src={src}
        alt={name}
        loading="lazy"
        decoding="async"
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
        onError={() => setErrored(true)}
        className="w-full h-full object-contain select-none pointer-events-none"
      />
    );

  if (withRoleBg && roleStyle) {
    return (
      <div
        className={cn(
          "w-full h-full rounded-md border flex items-center justify-center p-1 overflow-hidden",
          roleStyle.bg,
          roleStyle.ring,
          className,
        )}
      >
        {inner}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center justify-center w-full h-full", className)}>
      {inner}
    </div>
  );
}
