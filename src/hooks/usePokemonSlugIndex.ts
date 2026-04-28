import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { getUniteDbPokemon } from "@/server/unite-db.functions";

/**
 * Fetches the unite-db pokemon list (cached) and exposes a fast lookup
 * function that maps any pokemon name (display_name OR slug) to the
 * official unite-db slug used for CDN images.
 *
 * Reuses the same query key as /builds so it costs nothing extra after
 * the first load anywhere in the app.
 */
export function usePokemonSlugIndex() {
  const { data } = useQuery({
    queryKey: ["unite-db", "pokemon"],
    queryFn: () => getUniteDbPokemon(),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const index = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of data?.data ?? []) {
      // Index by both display_name and name (slug), case-insensitive.
      map.set(p.display_name.toLowerCase(), p.name);
      map.set(p.name.toLowerCase(), p.name);
    }
    return map;
  }, [data]);

  function resolve(name: string | null | undefined): string | null {
    if (!name) return null;
    return index.get(name.toLowerCase()) ?? null;
  }

  return { resolve, ready: index.size > 0 };
}
