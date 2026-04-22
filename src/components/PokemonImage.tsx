import { useState } from "react";
import { getPokemonSprite } from "@/lib/pokemon";
import { cn } from "@/lib/utils";

type Props = {
  name: string | null | undefined;
  className?: string;
  showLabel?: boolean;
};

/**
 * Renders a Pokémon's official artwork. Falls back to the name text if sprite
 * fails to load or the Pokémon isn't mapped.
 */
export function PokemonImage({ name, className, showLabel = false }: Props) {
  const [errored, setErrored] = useState(false);
  const src = getPokemonSprite(name);

  if (!name) {
    return <span className="font-display text-xs text-muted-foreground">—</span>;
  }

  if (!src || errored) {
    return (
      <span className="font-display text-[10px] leading-tight text-center px-1">
        {name}
      </span>
    );
  }

  return (
    <div className={cn("flex flex-col items-center justify-center w-full h-full", className)}>
      <img
        src={src}
        alt={name}
        loading="lazy"
        onError={() => setErrored(true)}
        className="w-full h-full object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]"
      />
      {showLabel && (
        <span className="font-display text-[9px] leading-tight text-center mt-0.5 truncate w-full">
          {name}
        </span>
      )}
    </div>
  );
}
