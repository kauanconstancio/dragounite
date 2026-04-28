import { useState } from "react";
import { getPokemonSprite, getPokemonRole, UNITE_ROLE_STYLES } from "@/lib/pokemon";
import { pokemonImage } from "@/lib/unite-db-types";
import { cn } from "@/lib/utils";

type Props = {
  name: string | null | undefined;
  /**
   * Slug oficial do unite-db (campo `name` da API). Quando informado,
   * a imagem vem direto do CDN do unite-db, garantindo cobertura total
   * sem depender do mapeamento manual de sprites.
   */
  uniteDbSlug?: string | null;
  className?: string;
  /** When true, wraps the sprite in a colored role-tinted background tile. */
  withRoleBg?: boolean;
};

/**
 * Renders a Pokémon's official Unite artwork. Prefere o CDN do unite-db
 * quando `uniteDbSlug` é informado; caso contrário usa o sprite oficial
 * mapeado em src/lib/pokemon.ts. Cai para texto se a imagem falhar.
 */
export function PokemonImage({ name, uniteDbSlug, className, withRoleBg = false }: Props) {
  const [errored, setErrored] = useState(false);
  const src = uniteDbSlug ? pokemonImage(uniteDbSlug) : getPokemonSprite(name);
  const role = getPokemonRole(name);
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
