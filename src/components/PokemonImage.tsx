import { useState } from "react";
import { getPokemonSprite, getPokemonRole, UNITE_ROLE_STYLES } from "@/lib/pokemon";
import { cn } from "@/lib/utils";

type Props = {
  name: string | null | undefined;
  className?: string;
  /** When true, wraps the sprite in a colored role-tinted background tile. */
  withRoleBg?: boolean;
};

/**
 * Renders a Pokémon's official Unite artwork. Falls back to the name text
 * if the sprite fails to load or the Pokémon isn't mapped.
 * If `withRoleBg` is true, applies a colored gradient + glow based on the
 * Pokémon's Unite role (attacker, speedster, etc).
 */
export function PokemonImage({ name, className, withRoleBg = false }: Props) {
  const [errored, setErrored] = useState(false);
  const src = getPokemonSprite(name);
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
        onError={() => setErrored(true)}
        className="w-full h-full object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]"
      />
    );

  if (withRoleBg && roleStyle) {
    return (
      <div
        className={cn(
          "w-full h-full rounded-md border flex items-center justify-center p-1 overflow-hidden transition-shadow",
          roleStyle.bg,
          roleStyle.ring,
          roleStyle.glow,
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
